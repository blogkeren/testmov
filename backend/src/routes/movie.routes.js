import express from 'express';
import * as kitanontonScraper from '../scrapers/kitanonton.scraper.js';
import * as rebahinScraper from '../scrapers/rebahin.scraper.js';
import { config } from '../config/config.js';
import { getCachedData, saveCachedData } from '../utils/cacheManager.js';

const router = express.Router();

// ========== REBAHIN ROUTES ==========

router.get('/rebahin/home', async (req, res) => {
    try {
        // Home page biasanya berubah cepat, boleh tidak di-cache atau cache pendek (di sisi cloudflare)
        const movies = await rebahinScraper.scrapeByUrl(config.rebahinBaseUrl);
        res.json({ success: true, source: 'rebahin', page: 'home', count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/rebahin/movie', async (req, res) => {
    try {
        const movies = await rebahinScraper.scrapeByUrl(`${config.rebahinBaseUrl}/movies/`);
        res.json({ success: true, source: 'rebahin', category: 'movie', page: 1, count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/rebahin/movie/page/:pageNum', async (req, res) => {
    try {
        const { pageNum } = req.params;
        const movies = await rebahinScraper.scrapeByUrl(`${config.rebahinBaseUrl}/movies/page/${pageNum}/`);
        res.json({ success: true, source: 'rebahin', category: 'movie', page: parseInt(pageNum), count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// [UPDATED] Detail dengan Cache
router.get('/rebahin/detail/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const cacheKey = `rebahin-detail-${slug}`;

        // 1. Cek Cache
        const cached = await getCachedData(slug, 'rebahin-detail');
        if (cached) {
            return res.json({ success: true, source: 'rebahin', data: cached, cached: true });
        }

        // 2. Scrape jika tidak ada di cache
        const movieDetail = await rebahinScraper.scrapeMovieDetail(`${config.rebahinBaseUrl}/nonton-${slug}/`);
        
        // 3. Simpan ke Cache
        await saveCachedData(slug, 'rebahin-detail', movieDetail);

        res.json({ success: true, source: 'rebahin', data: movieDetail, cached: false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// [UPDATED] Play dengan Cache & Sequential Check
router.get('/rebahin/play/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `rebahin-play-ep${ep}` : 'rebahin-play-movie';
        
        // 1. Cek Cache
        const cached = await getCachedData(slug, cacheType);
        if (cached) return res.json(cached);

        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');

        // [OPTIMASI] Cek server satu per satu (Sequential)
        // Render Free Tier tidak kuat cek 5 server sekaligus
        const servers = [1, 2, 3, 4, 5]; 
        const availableServers = [];

        console.log(`[Play] Starting sequential check for ${slug}...`);

        for (const sv of servers) {
            // Construct URL
            let playUrl = `${config.rebahinBaseUrl}/nonton-${slug}/play/`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            params.push(`sv=${sv}`);
            playUrl += '?' + params.join('&');

            try {
                // Cek Server
                const embedUrl = await extractEmbedUrlWithPuppeteer(playUrl);
                
                // Jika berhasil, masukkan ke list dan STOP (Break loop)
                // Kita prioritaskan kecepatan user daripada kelengkapan list server
                if (embedUrl) {
                    availableServers.push({ server: sv, url: embedUrl, success: true });
                    console.log(`[Play] Server ${sv} Working! Stopping search.`);
                    break; 
                }
            } catch (err) {
                console.log(`[Play] Server ${sv} Failed: ${err.message}`);
                // Lanjut ke server berikutnya
            }
        }

        const responseData = {
            success: true,
            source: 'rebahin',
            slug,
            episode: ep || 1,
            // Ambil server pertama yang berhasil
            default_server: availableServers.length > 0 ? availableServers[0].server : null,
            default_url: availableServers.length > 0 ? availableServers[0].url : null,
            servers: availableServers,
            cached: false
        };

        // 3. Simpan jika ada hasil
        if (availableServers.length > 0) {
            const dataToSave = { ...responseData, cached: true };
            await saveCachedData(slug, cacheType, dataToSave);
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// [UPDATED] Lakukan hal yang sama persis untuk route /kitanonton/play/:slug
router.get('/kitanonton/play/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `kitanonton-play-ep${ep}` : 'kitanonton-play-movie';

        const cached = await getCachedData(slug, cacheType);
        if (cached) return res.json(cached);

        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');

        const servers = [1, 2, 3, 4, 5];
        const availableServers = [];

        console.log(`[Play KN] Starting sequential check for ${slug}...`);

        for (const sv of servers) {
            let playUrl = `${config.kitanontonBaseUrl}/nonton-${slug}/play/`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            params.push(`sv=${sv}`);
            playUrl += '?' + params.join('&');

            try {
                const embedUrl = await extractEmbedUrlWithPuppeteer(playUrl);
                if (embedUrl) {
                    availableServers.push({ server: sv, url: embedUrl, success: true });
                    console.log(`[Play KN] Server ${sv} Working! Stopping search.`);
                    break;
                }
            } catch (err) {
                console.log(`[Play KN] Server ${sv} Failed: ${err.message}`);
            }
        }

        const responseData = {
            success: true,
            source: 'kitanonton',
            slug,
            episode: ep || 1,
            default_server: availableServers.length > 0 ? availableServers[0].server : null,
            default_url: availableServers.length > 0 ? availableServers[0].url : null,
            servers: availableServers,
            cached: false
        };

        if (availableServers.length > 0) {
            const dataToSave = { ...responseData, cached: true };
            await saveCachedData(slug, cacheType, dataToSave);
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
