import axios from 'axios';
import { config } from '../config/config.js';

/**
 * Create axios instance with common configurations
 */
const httpClient = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
});

/**
 * Fetch HTML content from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
export async function fetchHTML(url) {
    try {
        const response = await httpClient.get(url);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
}

export default httpClient;
