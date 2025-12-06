import express from 'express';
import * as kitanontonScraper from '../scrapers/kitanonton.scraper.js';
import * as rebahinScraper from '../scrapers/rebahin.scraper.js';
import { config } from '../config/config.js';
import { getCachedData, saveCachedData } from '../utils/cacheManager.js';

const router = express.Router();

// Helper Play yang dioptimalkan
async function handlePlayRequest(req, res, source, scraper, baseUrl) {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `${source}-play-ep${ep}` : `${source}-play-movie`;

        const cached = await getCachedData(slug, cacheType);
        if (cached) return res.json(cached);

        const detailUrl = `${baseUrl}/nonton-${slug}/`;
        console.log(`[Play] Getting info from: ${detailUrl}`);
        
        // Ambil data detail (termasuk list server yang sudah didecode base64)
        const detail = await scraper.scrapeMovieDetail(detailUrl);
        const validServers = detail.embedUrls || [];

        if (validServers.length === 0) {
            // Fallback manual jika base64 kosong (jarang terjadi dgn kode baru)
            let fallback = `${detailUrl}play/?sv=1`;
            if (ep) fallback += `&ep=${ep}`;
            validServers.push({ server: 1, url: fallback, label: 'Server 1' });
        }

        // Import Puppeteer Helper (Versi Ringan)
        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');
        const resolvedServers = [];

        // Cek Server (Sequential)
        for (const s of validServers) {
            console.log(`[Play] Checking ${s.label}: ${s.url}`);
            
            let finalVideoUrl = null;

            // 1. Jika URL sudah langsung video (.mp4/.m3u8), pakai langsung!
            if (s.url.includes('.mp4') || s.url.includes('.m3u8')) {
                finalVideoUrl = s.url;
            }
            // 2. Jika bukan video langsung (misal short.icu), ekstrak dengan Puppeteer
            else {
                try {
                    const extracted = await extractEmbedUrlWithPuppeteer(s.url);
                    if (extracted) {
                        finalVideoUrl = extracted;
                        console.log(`[Play] Success resolving: ${s.url}`);
                    }
                } catch (e) {
                    console.log(`[Play] Failed resolving: ${s.url}`);
                }
            }

            // JIKA URL DITEMUKAN, TERAPKAN SOLUSI CLOUDFLARE WORKER DISINI
            if (finalVideoUrl) {
                // [FIX 403] Bungkus URL dengan Cloudflare Worker Proxy jika tersedia di config
                if (config.cloudflareWorkerUrl) {
                    const target = encodeURIComponent(finalVideoUrl);
                    const ref = encodeURIComponent(baseUrl); // Referrer asli (rebahin/kitanonton)
                    const ua = encodeURIComponent(config.userAgent);
                    
                    // Format: https://worker-anda.dev/stream?url=...&referer=...
                    // Menggunakan endpoint /stream (pastikan worker Anda menangani ini)
                    finalVideoUrl = `${config.cloudflareWorkerUrl}/stream?url=${target}&referer=${ref}&ua=${ua}`;
                    
                    console.log(`[Play] Proxied via Cloudflare: ${finalVideoUrl}`);
                }

                resolvedServers.push({ 
                    server: resolvedServers.length + 1, 
                    url: finalVideoUrl, 
                    success: true,
                    label: s.label
                });

                // Stop setelah dapat 1 server yang valid agar respon cepat
                break; 
            }
        }

        const responseData = {
            success: true,
            source,
            slug,
            episode: ep || 1,
            default_server: resolvedServers[0]?.server,
            default_url: resolvedServers[0]?.url,
            servers: resolvedServers,
            cached: false
        };

        if (resolvedServers.length > 0) {
            await saveCachedData(slug, cacheType, { ...responseData, cached: true });
        }

        res.json(responseData);

    } catch (error) {
        console.error(`[Play Error] ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ROUTING
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
    const c = await getCachedData(req.params.slug, 'rebahin-detail');
    if (c) return res.json({ success: true, data: c, cached: true });
    const d = await rebahinScraper.scrapeMovieDetail(`${config.rebahinBaseUrl}/nonton-${req.params.slug}/`);
    await saveCachedData(req.params.slug, 'rebahin-detail', d);
    res.json({ success: true, data: d, cached: false });
});
router.get('/rebahin/play/:slug', (req, res) => handlePlayRequest(req, res, 'rebahin', rebahinScraper, config.rebahinBaseUrl));

// KITANONTON
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
router.get('/kitanonton/play/:slug', (req, res) => handlePlayRequest(req, res, 'kitanonton', kitanontonScraper, config.kitanontonBaseUrl));

export default router;
