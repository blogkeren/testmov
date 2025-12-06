import * as cheerio from 'cheerio';
import { fetchHTML } from '../utils/httpClient.js';
import { fetchProtectedHTML } from '../utils/puppeteerHelper.js'; // Wajib
import { config } from '../config/config.js';

function extractSlug(url) {
    try {
        return url.replace(/\/$/, '').split('/').pop().replace(/^(nonton-|watch-|film-|movie-)/, '');
    } catch (e) { return ''; }
}

function detectContentType(title, url) {
    const t = (title + url).toLowerCase();
    const isSeries = ['drakor', 'drama', 'series', 'episode', 'season'].some(x => t.includes(x));
    if (!isSeries) return { type: 'movie', status: null };
    return { type: 'series', status: t.includes('completed') ? 'complete' : 'ongoing' };
}

// Scrape List
export async function scrapeByUrl(url) {
    try {
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const movies = [];

        $('.ml-item, article.item, .movie-item').each((i, el) => {
            try {
                const $el = $(el);
                const link = $el.find('a').first().attr('href');
                if (!link) return;

                const title = $el.find('h2').text().trim() || $el.find('a').attr('title');
                let img = $el.find('img').attr('src');
                // Fix lazy load
                if (!img || img.includes('data:image')) img = $el.find('img').attr('data-src') || $el.find('img').attr('data-original');
                
                if (img && !img.startsWith('http')) img = img.startsWith('//') ? 'https:' + img : config.rebahinBaseUrl + img;
                const fullUrl = link.startsWith('http') ? link : config.rebahinBaseUrl + link;
                const slug = extractSlug(fullUrl);
                const { type, status } = detectContentType(title, fullUrl);
                const rating = $el.find('.rating').text().trim() || 'N/A';

                if (slug) {
                    const data = { title, slug, poster: img, quality: 'HD', rating, year: '' };
                    if (type === 'movie') movies.push({ ...data, movie_url: fullUrl });
                    else movies.push({ ...data, series_url: fullUrl, status });
                }
            } catch (e) {}
        });
        return movies;
    } catch (e) { return []; }
}

// Scrape Detail (Full Browser)
export async function scrapeMovieDetail(contentUrl) {
    try {
        // [PENTING] Gunakan Puppeteer untuk mengambil HTML lengkap (bypass proteksi/JS rendering)
        const html = await fetchProtectedHTML(contentUrl);
        const $ = cheerio.load(html);

        const title = $('h1').text().trim();
        let description = $('.desc-des-pendek').text().trim() || $('[itemprop="description"]').text().trim();
        description = description.replace(/Jangan lupa.*/si, '').trim();

        let poster = $('.mvic-thumb').css('background-image');
        if (poster) poster = poster.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        else poster = $('.mvic-thumb img').attr('src');

        const embedUrls = [];
        
        // Cari Server Base64
        $('.server').each((i, el) => {
            const b64 = $(el).attr('data-iframe');
            const label = $(el).find('.server-title').text().trim() || `Server ${i+1}`;
            
            if (b64) {
                // Decode Manual
                try {
                    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
                    if (decoded.startsWith('http')) {
                        embedUrls.push({ type: 'embed', url: decoded, label });
                    }
                } catch (e) {}
            }
        });

        // Fallback Iframe
        if (embedUrls.length === 0) {
            $('iframe').each((i, el) => {
                const src = $(el).attr('src');
                if (src && src.startsWith('http') && !src.includes('facebook')) {
                    embedUrls.push({ type: 'iframe', url: src, label: `Server ${i+1}` });
                }
            });
        }

        return {
            title, description: description || '-', poster, embedUrls,
            slug: extractSlug(contentUrl), source: 'rebahin'
        };
    } catch (error) { throw error; }
}
