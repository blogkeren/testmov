import express from 'express';
import * as kitanontonScraper from '../scrapers/kitanonton.scraper.js';
import * as rebahinScraper from '../scrapers/rebahin.scraper.js';
import { config } from '../config/config.js';
import { getCachedData, saveCachedData } from '../utils/cacheManager.js';

const router = express.Router();

// === LOGIC UTAMA: PROXY PLAY REQUEST ===
async function handlePlayRequest(req, res, source, scraper, baseUrl) {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        // Cache key berbeda untuk setiap episode
        const cacheType = ep ? `${source}-play-ep${ep}` : `${source}-play-movie`;

        // 1. Cek Cache Dulu
        const cached = await getCachedData(slug, cacheType);
        if (cached) {
            console.log(`[Play] Serving cached data for ${slug}`);
            return res.json(cached);
        }

        const detailUrl = `${baseUrl}/nonton-${slug}/`;
        console.log(`[Play] Scraping info from: ${detailUrl}`);
        
        // 2. Ambil data detail & list server dari Scraper
        const detail = await scraper.scrapeMovieDetail(detailUrl);
        const validServers = detail.embedUrls || [];

        // Fallback jika tidak ada server (biasanya untuk Rebahin/KN lama)
        if (validServers.length === 0) {
            let fallback = `${detailUrl}play/?sv=1`;
            if (ep) fallback += `&ep=${ep}`;
            validServers.push({ server: 1, url: fallback, label: 'Server 1' });
        }

        // Import Puppeteer Helper secara dinamis
        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');
        const resolvedServers = [];

        // 3. Proses setiap server untuk mendapatkan Link Asli / Embed
        for (const s of validServers) {
            console.log(`[Play] Processing Server ${s.label}: ${s.url}`);
            
            let finalVideoUrl = null;

            // A. Cek apakah URL sudah berupa file video langsung (.mp4/.m3u8)
            if (s.url.includes('.mp4') || s.url.includes('.m3u8')) {
                finalVideoUrl = s.url;
            } 
            // B. Jika belum, coba ekstrak pakai Puppeteer
            else {
                try {
                    const extracted = await extractEmbedUrlWithPuppeteer(s.url);
                    if (extracted) {
                        finalVideoUrl = extracted;
                        console.log(`[Play] Puppeteer resolved: ${extracted}`);
                    }
                } catch (e) {
                    console.error(`[Play] Puppeteer failed for ${s.url}`);
                }
            }

            // Jika gagal extract, gunakan URL embed awal sebagai fallback terakhir
            if (!finalVideoUrl) {
                finalVideoUrl = s.url; 
            }

            // === [CRITICAL FIX] ===
            // 4. BUNGKUS URL DENGAN CLOUDFLARE WORKER (PROXY)
            // Ini yang memperbaiki error 403 Forbidden Juicy Codes
            if (finalVideoUrl && config.cloudflareWorkerUrl) {
                try {
                    const target = encodeURIComponent(finalVideoUrl);
                    const ref = encodeURIComponent(baseUrl); // Kirim 'https://rebahinxxi3.fit' sebagai Referer
                    const ua = encodeURIComponent(config.userAgent);
                    
                    // Bentuk URL Proxy: https://worker-anda.dev/stream?url=...&referer=...
                    finalVideoUrl = `${config.cloudflareWorkerUrl}/stream?url=${target}&referer=${ref}&ua=${ua}`;
                    
                    console.log(`[Play] Proxied URL: ${finalVideoUrl}`);
                } catch (err) {
                    console.error("[Play] Error constructing proxy URL", err);
                }
            }

            // Masukkan ke list server yang siap play
            resolvedServers.push({ 
                server: resolvedServers.length + 1, 
                url: finalVideoUrl, 
                success: true,
                label: s.label
            });

            // Optimasi: Stop jika sudah dapat 1 server valid agar loading cepat
            // (Hapus break jika ingin menampilkan semua opsi server)
            if (finalVideoUrl) break; 
        }

        const responseData = {
            success: true,
            source,
            slug,
            episode: ep || 1,
            default_server: resolvedServers[0]?.server,
            default_url: resolvedServers[0]?.url, // Ini sekarang URL Worker, bukan URL 403 lagi
            servers: resolvedServers,
            cached: false
        };

        // 5. Simpan ke Cache jika sukses
        if (resolvedServers.length > 0) {
            await saveCachedData(slug, cacheType, { ...responseData, cached: true });
        }

        res.json(responseData);

    } catch (error) {
        console.error(`[Play Error] ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
}

// === ROUTE DEFINITIONS ===

// REBAHIN ROUTES
router.get('/rebahin/home', async (req, res) => {
    const data = await rebahinScraper.scrapeByUrl(config.rebahinBaseUrl);
    res.json({ success: true, count: data.length, data });
});
router.get('/rebahin/movie', async (req, res) => {
    const data = await rebahinScraper.scrapeByUrl(`${config.rebahinBaseUrl}/movies/`);
    res.json({ success: true, count: data.length, data });
});
router.get('/rebahin/movie/page/:p', async (req, res) => {
    const data = await rebahinScraper.scrapeByUrl(`${config.rebahinBaseUrl}/movies/page/${req.params.p}/`);
    res.json({ success: true, count: data.length, data });
});
router.get('/rebahin/detail/:slug', async (req, res) => {
    // Detail Page juga dicache
    const c = await getCachedData(req.params.slug, 'rebahin-detail');
    if (c) return res.json({ success: true, data: c, cached: true });

    const d = await rebahinScraper.scrapeMovieDetail(`${config.rebahinBaseUrl}/nonton-${req.params.slug}/`);
    await saveCachedData(req.params.slug, 'rebahin-detail', d);
    
    res.json({ success: true, data: d, cached: false });
});
// Route Play Rebahin
router.get('/rebahin/play/:slug', (req, res) => 
    handlePlayRequest(req, res, 'rebahin', rebahinScraper, config.rebahinBaseUrl)
);


// KITANONTON ROUTES
router.get('/kitanonton/home', async (req, res) => {
    const data = await kitanontonScraper.scrapeByUrl(config.kitanontonBaseUrl);
    res.json({ success: true, count: data.length, data });
});
router.get('/kitanonton/movie', async (req, res) => {
    const data = await kitanontonScraper.scrapeByUrl(`${config.kitanontonBaseUrl}/movies/`);
    res.json({ success: true, count: data.length, data });
});
router.get('/kitanonton/movie/page/:p', async (req, res) => {
    const data = await kitanontonScraper.scrapeByUrl(`${config.kitanontonBaseUrl}/movies/page/${req.params.p}/`);
    res.json({ success: true, count: data.length, data });
});
router.get('/kitanonton/detail/:slug', async (req, res) => {
    const c = await getCachedData(req.params.slug, 'kitanonton-detail');
    if (c) return res.json({ success: true, data: c, cached: true });

    const d = await kitanontonScraper.scrapeMovieDetail(`${config.kitanontonBaseUrl}/nonton-${req.params.slug}/`);
    await saveCachedData(req.params.slug, 'kitanonton-detail', d);

    res.json({ success: true, data: d, cached: false });
});
// Route Play Kitanonton
router.get('/kitanonton/play/:slug', (req, res) => 
    handlePlayRequest(req, res, 'kitanonton', kitanontonScraper, config.kitanontonBaseUrl)
);

export default router;
