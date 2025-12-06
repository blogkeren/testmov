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

// [UPDATED] Play dengan Cache (Sangat Penting karena Puppeteer berat)
router.get('/rebahin/play/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        
        // Buat key unik untuk episode tertentu
        const cacheType = ep ? `rebahin-play-ep${ep}` : 'rebahin-play-movie';
        
        // 1. Cek Cache
        const cached = await getCachedData(slug, cacheType);
        if (cached) {
            return res.json(cached); // Cached data sudah mencakup struktur response lengkap
        }

        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');

        // Define servers to check (1-5)
        const servers = [1, 2, 3, 4, 5];
        const serverPromises = servers.map(async (sv) => {
            let playUrl = `${config.rebahinBaseUrl}/nonton-${slug}/play/`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            params.push(`sv=${sv}`);
            playUrl += '?' + params.join('&');

            try {
                const embedUrl = await extractEmbedUrlWithPuppeteer(playUrl);
                return { server: sv, url: embedUrl, success: true };
            } catch (err) {
                return { server: sv, error: err.message, success: false };
            }
        });

        // Fetch all servers concurrently
        const results = await Promise.all(serverPromises);
        const availableServers = results.filter(r => r.success);

        let defaultServer = availableServers.find(s => s.url.includes('short.icu'));
        if (!defaultServer && availableServers.length > 0) {
            defaultServer = availableServers[0];
        }

        const responseData = {
            success: true,
            source: 'rebahin',
            slug,
            episode: ep || 1,
            default_server: defaultServer ? defaultServer.server : null,
            default_url: defaultServer ? defaultServer.url : null,
            servers: availableServers,
            cached: false
        };

        // 3. Simpan ke Cache (Hanya jika ada server yang berhasil didapat)
        if (availableServers.length > 0) {
            // Ubah cached: true sebelum disimpan agar saat di-load nanti statusnya benar
            const dataToSave = { ...responseData, cached: true };
            await saveCachedData(slug, cacheType, dataToSave);
        }

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== KITANONTON ROUTES ==========
// Pola yang sama diterapkan untuk Kitanonton

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

// [UPDATED] Detail dengan Cache
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

// [UPDATED] Play dengan Cache
router.get('/kitanonton/play/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { ep } = req.query;
        const cacheType = ep ? `kitanonton-play-ep${ep}` : 'kitanonton-play-movie';

        // 1. Cek Cache
        const cached = await getCachedData(slug, cacheType);
        if (cached) {
            return res.json(cached);
        }

        const { extractEmbedUrlWithPuppeteer } = await import('../utils/puppeteerHelper.js');

        const servers = [1, 2, 3, 4, 5];
        const serverPromises = servers.map(async (sv) => {
            let playUrl = `${config.kitanontonBaseUrl}/nonton-${slug}/play/`;
            const params = [];
            if (ep) params.push(`ep=${ep}`);
            params.push(`sv=${sv}`);
            playUrl += '?' + params.join('&');

            try {
                const embedUrl = await extractEmbedUrlWithPuppeteer(playUrl);
                return { server: sv, url: embedUrl, success: true };
            } catch (err) {
                return { server: sv, error: err.message, success: false };
            }
        });

        const results = await Promise.all(serverPromises);
        const availableServers = results.filter(r => r.success);

        let defaultServer = availableServers.find(s => s.url.includes('short.icu'));
        if (!defaultServer && availableServers.length > 0) {
            defaultServer = availableServers[0];
        }

        const responseData = {
            success: true,
            source: 'kitanonton',
            slug,
            episode: ep || 1,
            default_server: defaultServer ? defaultServer.server : null,
            default_url: defaultServer ? defaultServer.url : null,
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
