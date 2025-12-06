import axios from 'axios';
import { config } from '../config/config.js';

const httpClient = axios.create({
    timeout: 25000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    }
});

export async function fetchHTML(url) {
    try {
        console.log(`[HTTP] Fetching: ${url}`);
        const response = await httpClient.get(url);
        return response.data;
    } catch (error) {
        console.error(`[HTTP Error] ${url}: ${error.message}`);
        // Return string kosong jika 404 agar tidak crash fatal
        if (error.response && error.response.status === 404) return '';
        throw error;
    }
}

export default httpClient;
