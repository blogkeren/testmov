import express from 'express';
import * as kitanontonScraper from '../scrapers/kitanonton.scraper.js';
import * as rebahinScraper from '../scrapers/rebahin.scraper.js';
import { config } from '../config/config.js';
import { getCachedData, saveCachedData } from '../utils/cacheManager.js';

const router = express.Router();

// ==========================================
//              REBAHIN ROUTES
// ==========================================

router.get('/rebahin/home', async (req, res) => {
    try {
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

router.get('/rebahin/detail/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // 1. Cek Cache
        const cached = await getCachedData(slug, 'rebahin-detail');
        if (cached) {
            return res.json({ success: true, source: 'rebahin', data: cached, cached: true });
        }

        // 2. Scrape
        const movieDetail = await rebahinScraper.scrapeMovieDetail(`${config.rebahinBaseUrl}/nonton-${slug}/`);
        
        // 3. Simpan
        await saveCachedData(slug, 'rebahin-detail', movieDetail);

        res.json({ success: true, source: 'rebahin', data: movieDetail, cached: false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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
        const servers = [1, 2, 3, 4, 5]; 
        const availableServers = [];

        console.log(`[Rebahin Play] Starting check for ${slug}...`);

        for (const sv of servers) {
            let playUrl = `${config.rebahinBaseUrl}/nonton-${slug}/play/`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            params.push(`sv=${sv}`);
            playUrl += '?' + params.join('&');

            try {
                const embedUrl = await extractEmbedUrlWithPuppeteer(playUrl);
                if (embedUrl) {
                    availableServers.push({ server: sv, url: embedUrl, success: true });
                    console.log(`[Rebahin Play] Server ${sv} OK. Stopping.`);
                    break; // Stop jika sudah ketemu satu
                }
            } catch (err) {
                console.log(`[Rebahin Play] Server ${sv} Failed: ${err.message}`);
            }
        }

        const responseData = {
            success: true,
            source: 'rebahin',
            slug,
            episode: ep || 1,
            default_server: availableServers.length > 0 ? availableServers[0].server : null,
            default_url: availableServers.length > 0 ? availableServers[0].url : null,
            servers: availableServers,
            cached: false
        };

        // 3. Simpan
        if (availableServers.length > 0) {
            const dataToSave = { ...responseData, cached: true };
            await saveCachedData(slug, cacheType, dataToSave);
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
//             KITANONTON ROUTES
// ==========================================

router.get('/kitanonton/home', async (req, res) => {
    try {
        const movies = await kitanontonScraper.scrapeByUrl(config.kitanontonBaseUrl);
        res.json({ success: true, source: 'kitanonton', page: 'home', count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kitanonton/movie', async (req, res) => {
    try {
        const movies = await kitanontonScraper.scrapeByUrl(`${config.kitanontonBaseUrl}/movies/`);
        res.json({ success: true, source: 'kitanonton', category: 'movie', page: 1, count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kitanonton/movie/page/:pageNum', async (req, res) => {
    try {
        const { pageNum } = req.params;
        const movies = await kitanontonScraper.scrapeByUrl(`${config.kitanontonBaseUrl}/movies/page/${pageNum}/`);
        res.json({ success: true, source: 'kitanonton', category: 'movie', page: parseInt(pageNum), count: movies.length, data: movies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kitanonton/detail/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // 1. Cek Cache
        const cached = await getCachedData(slug, 'kitanonton-detail');
        if (cached) {
            return res.json({ success: true, source: 'kitanonton', data: cached, cached: true });
        }

        // 2. Scrape
        const movieDetail = await kitanontonScraper.scrapeMovieDetail(`${config.kitanontonBaseUrl}/nonton-${slug}/`);
        
        // 3. Simpan
        await saveCachedData(slug, 'kitanonton-detail', movieDetail);
        
        res.json({ success: true, source: 'kitanonton', data: movieDetail, cached: false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kitanonton/play/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `kitanonton-play-ep${ep}` : 'kitanonton-play-movie';

        // 1. Cek Cache
        const cached = await getCachedData(slug, cacheType);
        if (cached) return res.json(cached);

        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');

        // [OPTIMASI] Cek server satu per satu (Sequential)
        const servers = [1, 2, 3, 4, 5];
        const availableServers = [];

        console.log(`[Kitanonton Play] Starting check for ${slug}...`);

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
                    console.log(`[Kitanonton Play] Server ${sv} OK. Stopping.`);
                    break;
                }
            } catch (err) {
                console.log(`[Kitanonton Play] Server ${sv} Failed: ${err.message}`);
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

        // 3. Simpan
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
