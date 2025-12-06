import * as cheerio from 'cheerio';
import { fetchHTML } from '../utils/httpClient.js';
import { config } from '../config/config.js';

function extractSlug(url) {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const segments = cleanUrl.split('/');
        const lastSegment = segments[segments.length - 1];
        return lastSegment.replace(/^(nonton-|watch-|film-|movie-)/, '');
    } catch (error) { return ''; }
}

function detectContentType($el, title, url) {
    const text = (url + title).toLowerCase();
    const isSeries = ['drakor', 'drama', 'series', 'episode', 'season'].some(x => text.includes(x));
    if (!isSeries) return { type: 'movie', status: null };
    const status = text.includes('completed') || text.includes('tamat') ? 'complete' : 'ongoing';
    return { type: 'series', status };
}

export async function scrapeByUrl(url) {
    try {
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const movies = [];

        $('article, .item, .post, .movie-item').each((i, element) => {
            try {
                const $el = $(element);
                const $link = $el.find('a[href*="nonton"], a[href*="movie"]').first() || $el.find('a').first();
                const movieUrl = $link.attr('href');
                if (!movieUrl) return;

                let title = $el.find('h2, h3, .title').text().trim() || $link.attr('title');
                let image = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                if (image && !image.startsWith('http')) {
                    image = image.startsWith('//') ? 'https:' + image : config.rebahinBaseUrl + image;
                }

                const fullUrl = movieUrl.startsWith('http') ? movieUrl : config.rebahinBaseUrl + movieUrl;
                const slug = extractSlug(fullUrl);
                const { type, status } = detectContentType($el, title, fullUrl);
                const rating = $el.find('.rating, .score').text().trim() || '-';
                const quality = $el.find('.quality').text().trim() || 'HD';
                let year = $el.find('.year').text().trim();

                if (title && slug) {
                    const baseData = { title, slug, poster: image, quality, rating, year };
                    if (type === 'movie') movies.push({ ...baseData, movie_url: fullUrl });
                    else movies.push({ ...baseData, series_url: fullUrl, status });
                }
            } catch (e) {}
        });
        return movies;
    } catch (error) {
        console.error('Scrape Rebahin Error:', error.message);
        return [];
    }
}

export async function scrapeMovieDetail(contentUrl) {
    try {
        const html = await fetchHTML(contentUrl);
        const $ = cheerio.load(html);

        const title = $('h1').text().trim();
        const description = $('.description, .synopsis, .entry-content p').text().trim();
        let poster = $('.poster img, .thumbnail img').attr('src');

        // PENTING: Logika Ekstraksi Server (Base64) - Sama dengan Kitanonton
        const embedUrls = [];
        
        $('.server').each((i, el) => {
            const b64 = $(el).attr('data-iframe');
            const labelRaw = $(el).find('.server-title').text().trim();
            const label = labelRaw || `Server ${i+1}`;

            if (b64) {
                try {
                    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
                    if (decoded.startsWith('http')) {
                        embedUrls.push({ type: 'embed', url: decoded, label: label });
                    }
                } catch (e) {}
            }
        });

        // Fallback Iframe
        if (embedUrls.length === 0) {
            $('iframe').each((i, el) => {
                const src = $(el).attr('src') || $(el).attr('data-src');
                if (src && src.startsWith('http')) {
                    embedUrls.push({ type: 'iframe', url: src, label: `Server ${i+1}` });
                }
            });
        }

        return {
            title,
            description,
            poster,
            embedUrls,
            slug: extractSlug(contentUrl),
            source: 'rebahin'
        };
    } catch (error) {
        throw error;
    }
}
