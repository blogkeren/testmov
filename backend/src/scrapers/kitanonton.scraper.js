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

function detectContentType(title, url) {
    const text = (url + title).toLowerCase();
    const isSeries = ['drakor', 'drama', 'series', 'episode', 'season', 'tv'].some(x => text.includes(x));
    if (!isSeries) return { type: 'movie', status: null };
    const status = text.includes('completed') || text.includes('tamat') ? 'complete' : 'ongoing';
    return { type: 'series', status };
}

// Helper untuk mengambil URL Gambar (bisa di src atau style background)
function extractImage($el) {
    // Cek 1: Tag Img biasa
    let img = $el.find('img').attr('src') || $el.find('img').attr('data-src');
    
    // Cek 2: Style Background (Sesuai HTML Kitanonton/Rebahin)
    if (!img || img.includes('placeholder')) {
        const style = $el.attr('style') || $el.find('.thumb').attr('style');
        if (style) {
            const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (match) img = match[1];
        }
    }
    
    // Fix Protocol
    if (img && !img.startsWith('http')) {
        img = img.startsWith('//') ? 'https:' + img : config.kitanontonBaseUrl + img;
    }
    return img;
}

export async function scrapeByUrl(url) {
    try {
        const html = await fetchHTML(url);
        if (!html) return [];
        
        const $ = cheerio.load(html);
        const movies = [];

        // Selector: .ml-item (Sesuai HTML Anda untuk list film)
        const items = $('.ml-item, .movie-item, article.item, .post');

        console.log(`[Scraper KN] Found ${items.length} items on ${url}`);

        items.each((i, element) => {
            try {
                const $el = $(element);
                
                // Link & Judul
                const $link = $el.find('a').first();
                const movieUrl = $link.attr('href');
                let title = $link.attr('title') || $el.find('h2').text().trim();
                
                if (!movieUrl || !title) return;

                // Gambar
                const image = extractImage($el);

                // Metadata
                const fullUrl = movieUrl.startsWith('http') ? movieUrl : config.kitanontonBaseUrl + movieUrl;
                const slug = extractSlug(fullUrl);
                const rating = $el.find('.mli-rating, .rating').text().trim().replace('-', '').trim() || 'N/A';
                const quality = $el.find('.mli-quality, .quality').text().trim() || 'HD';
                const year = title.match(/\((\d{4})\)/) ? title.match(/\((\d{4})\)/)[1] : '';

                const { type, status } = detectContentType(title, fullUrl);

                if (slug) {
                    const data = { title, slug, poster: image, quality, rating, year };
                    if (type === 'movie') movies.push({ ...data, movie_url: fullUrl });
                    else movies.push({ ...data, series_url: fullUrl, status });
                }
            } catch (e) {
                console.error('Error parsing item:', e.message);
            }
        });

        return movies;
    } catch (error) {
        console.error('Scrape KN Error:', error.message);
        return [];
    }
}

export async function scrapeMovieDetail(contentUrl) {
    try {
        const html = await fetchHTML(contentUrl);
        const $ = cheerio.load(html);

        const title = $('h1').text().trim();
        
        // [FIXED] Selector Deskripsi Sesuai HTML Anda
        // <div class="desc-des-pendek" itemprop="description">...</div>
        let description = $('.desc-des-pendek').text().trim();
        if (!description) description = $('[itemprop="description"]').text().trim();
        
        // Bersihkan teks promosi
        description = description.replace(/Jangan lupa untuk selalu cek.*/si, '').trim();
        description = description.replace(/Nonton Film.*–/si, '').trim();

        const poster = extractImage($('.mvic-thumb'));

        // [FIXED] Link Video dari Base64 data-iframe
        const embedUrls = [];
        
        // Cari server list di #server-list .server
        $('.server').each((i, el) => {
            const $s = $(el);
            const b64 = $s.attr('data-iframe');
            const label = $s.find('.server-title').text().trim() || `Server ${i+1}`;

            if (b64) {
                try {
                    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
                    if (decoded.startsWith('http')) {
                        embedUrls.push({ 
                            type: 'embed', 
                            url: decoded, 
                            label: label 
                        });
                    }
                } catch (e) {}
            }
        });

        return {
            title,
            description: description || 'Sinopsis belum tersedia.',
            poster,
            embedUrls,
            slug: extractSlug(contentUrl),
            source: 'kitanonton'
        };
    } catch (error) {
        console.error('Detail Error:', error.message);
        throw error;
    }
}
