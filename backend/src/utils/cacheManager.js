import axios from 'axios';
import { config } from '../config/config.js';

/**
 * Mengambil data dari cache Cloudflare D1
 * @param {string} slug - ID unik film
 * @param {string} type - Jenis data (misal: 'rebahin-detail', 'kitanonton-play')
 * @returns {Promise<object|null>} Data JSON atau null jika tidak ada
 */
export async function getCachedData(slug, type) {
    // Jika URL worker belum diset di .env, skip cache (langsung scrape)
    if (!config.cloudflareWorkerUrl) return null;

    try {
        console.log(`[CACHE CHECK] Checking D1 for ${slug} (${type})...`);
        const response = await axios.get(`${config.cloudflareWorkerUrl}/get`, {
            params: { slug, type },
            headers: { 'x-api-key': config.cloudflareApiSecret }
        });
        
        if (response.data) {
            console.log(`[CACHE HIT] Data found for ${slug}`);
            return response.data;
        }
    } catch (error) {
        // 404 berarti data belum ada, error lain berarti masalah koneksi
        if (error.response && error.response.status === 404) {
            console.log(`[CACHE MISS] No data for ${slug}`);
        } else {
            console.error(`[CACHE ERROR] Failed to fetch: ${error.message}`);
        }
    }
    return null;
}

/**
 * Menyimpan data hasil scraping ke Cloudflare D1
 * @param {string} slug 
 * @param {string} type 
 * @param {object} data 
 */
export async function saveCachedData(slug, type, data) {
    if (!config.cloudflareWorkerUrl) return;

    try {
        console.log(`[CACHE SAVE] Saving ${slug} (${type}) to D1...`);
        await axios.post(`${config.cloudflareWorkerUrl}/save`, {
            slug,
            type,
            data
        }, {
            headers: { 'x-api-key': config.cloudflareApiSecret }
        });
        console.log(`[CACHE SAVE] Success!`);
    } catch (error) {
        console.error(`[CACHE SAVE ERROR] Failed to save: ${error.message}`);
    }
}
