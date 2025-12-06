import express from 'express';
import * as kitanontonScraper from '../scrapers/kitanonton.scraper.js';
import * as rebahinScraper from '../scrapers/rebahin.scraper.js';
import { config } from '../config/config.js';
import { getCachedData, saveCachedData } from '../utils/cacheManager.js';

const router = express.Router();

async function handlePlayRequest(req, res, source, scraper, baseUrl) {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `${source}-play-ep${ep}` : `${source}-play-movie`;

        // 1. Cache
        const cached = await getCachedData(slug, cacheType);
        if (cached) return res.json(cached);

        // 2. Scrape Detail untuk dapat URL Server (Hasil Decode Base64)
        const detailUrl = `${baseUrl}/nonton-${slug}/`;
        console.log(`[Play] Getting servers from: ${detailUrl}`);
        
        const detail = await scraper.scrapeMovieDetail(detailUrl);
        let validServers = detail.embedUrls || [];

        // 3. Jika tidak ada server, coba fallback manual (jarang terjadi dgn kode baru)
        if (validServers.length === 0) {
            let defaultUrl = `${detailUrl}play/?sv=1`;
            if (ep) defaultUrl += `&ep=${ep}`;
            validServers.push({ server: 1, url: defaultUrl, label: 'Default Server' });
        }

        // 4. Resolve Video URL (Sequential)
        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');
        const resolvedServers = [];

        for (const s of validServers) {
            // Jika URL dari scraper sudah file video langsung (misal .mp4), pakai langsung!
            if (s.url.includes('.mp4') || s.url.includes('.m3u8')) {
                resolvedServers.push({ server: resolvedServers.length + 1, url: s.url, success: true, label: s.label });
                break;
            }

            // Jika masih link embed (misal short.icu), ekstrak isinya
            try {
                const videoUrl = await extractEmbedUrlWithPuppeteer(s.url);
                if (videoUrl) {
                    resolvedServers.push({ server: resolvedServers.length + 1, url: videoUrl, success: true, label: s.label });
                    console.log(`[Play] Success: ${s.label}`);
                    break; // Ambil 1 server terbaik agar cepat
                }
            } catch (e) { console.log(`[Play] Failed: ${s.label}`); }
        }

        const responseData = {
            success: true, source, slug, episode: ep || 1,
            default_server: resolvedServers[0]?.server,
            default_url: resolvedServers[0]?.url,
            servers: resolvedServers,
            cached: false
        };

        if (resolvedServers.length > 0) await saveCachedData(slug, cacheType, { ...responseData, cached: true });
        
        res.json(responseData);

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// ROUTES SETUP
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

// KITANONTON (Sama persis logicnya)
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
