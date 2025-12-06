import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 1. FUNGSI STATIC (Cepat)
async function extractStatic(url) {
    try {
        // Jika URL sudah langsung file video/embed murni, kembalikan saja
        if (url.includes('.mp4') || url.includes('.m3u8') || url.includes('googleusercontent')) return url;

        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(response.data);
        
        // Cari iframe di dalam halaman tujuan
        let found = null;
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && !src.includes('facebook') && !src.includes('twitter')) found = src;
        });
        
        // Cari variabel script
        if (!found) {
            const scripts = $('script').text();
            const match = scripts.match(/file\s*:\s*["']([^"']+)["']/i);
            if (match) found = match[1];
        }

        return found;
    } catch (e) { return null; }
}

// 2. FUNGSI DYNAMIC (Puppeteer - Cadangan Terakhir)
let browser = null;
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--single-process', '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });
    }
    return browser;
}

async function extractPuppeteer(playUrl) {
    let page = null;
    let videoUrl = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setRequestInterception(true);
        page.on('request', r => ['image','stylesheet','font'].includes(r.resourceType()) ? r.abort() : r.continue());
        
        page.on('response', r => {
            const u = r.url();
            if ((u.includes('.m3u8') || u.includes('.mp4')) && !videoUrl && !u.includes('doubleclick')) videoUrl = u;
        });

        await page.goto(playUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 3000));
        
        return videoUrl;
    } catch (e) {
        if (browser) { await browser.close(); browser = null; }
        return null;
    } finally {
        if (page) await page.close();
    }
}

export async function extractEmbedUrlWithPuppeteer(playUrl) {
    // 1. Coba statis dulu (sangat cepat)
    let res = await extractStatic(playUrl);
    if (res) return res.startsWith('//') ? 'https:' + res : res;

    // 2. Jika gagal, gunakan puppeteer
    console.log(`[Puppeteer] Extracting: ${playUrl}`);
    res = await extractPuppeteer(playUrl);
    return res ? (res.startsWith('//') ? 'https:' + res : res) : null;
}
