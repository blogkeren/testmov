import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Helper Decode Base64 Aman
function tryDecode(str) {
    try {
        if (!str || str.length < 10) return null;
        // Cek apakah string valid base64
        if (/^[A-Za-z0-9+/=]+$/.test(str)) {
            const decoded = Buffer.from(str, 'base64').toString('utf-8');
            if (decoded.startsWith('http')) return decoded;
        }
    } catch (e) {}
    return null;
}

// 1. METODE STATIC (Cheerio + Regex + Base64)
async function extractStatic(url) {
    console.log(`[Static] Checking: ${url}`);
    try {
        // Jika URL sudah video, return langsung
        if (url.match(/\.(mp4|m3u8|mkv)$/i)) return url;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://google.com'
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);
        let found = null;

        // A. Cek Base64 di elemen .server atau iframe (Pattern Rebahin/KN)
        $('[data-iframe], [data-src], iframe').each((i, el) => {
            const val = $(el).attr('data-iframe') || $(el).attr('data-src') || $(el).attr('src');
            if (val) {
                const decoded = tryDecode(val);
                if (decoded) { found = decoded; return false; }
                if (val.startsWith('http') && !val.includes('facebook')) { found = val; return false; }
            }
        });
        if (found) return found;

        // B. Regex Script Agresif
        const html = response.data;
        // Cari pola: "file":"url", source='url', src="url"
        const patterns = [
            /file\s*:\s*["']([^"']+)["']/i,
            /source\s*:\s*["']([^"']+)["']/i,
            /src\s*:\s*["']([^"']+)["']/i,
            /videoUrl\s*=\s*["']([^"']+)["']/i,
            /iframe\s*src\s*=\s*["']([^"']+)["']/i
        ];

        for (const p of patterns) {
            const m = html.match(p);
            if (m && m[1]) {
                const res = m[1];
                const decoded = tryDecode(res) || (res.startsWith('http') ? res : null);
                if (decoded) return decoded;
            }
        }

        return null;
    } catch (e) {
        return null; // Silent fail, lanjut puppeteer
    }
}

// 2. METODE PUPPETEER (Network Sniffing + Clicker)
let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        console.log('[Puppeteer] Launching browser...');
        browser = await puppeteer.launch({
            headless: true, // "new" untuk versi baru, atau true
            args: [
                '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas', '--no-first-run', '--single-process',
                '--disable-gpu', '--mute-audio'
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

        // Anti-Detection Basic
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        // Optimasi: Block Heavy Assets
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            if (['font', 'image', 'stylesheet'].includes(rType)) req.abort();
            else req.continue();
        });

        // NETWORK SNIFFING (M3U8 / MP4)
        page.on('response', r => {
            const u = r.url();
            if ((u.includes('.m3u8') || u.includes('.mp4')) && !videoUrl) {
                // Filter iklan umum
                if (!u.includes('doubleclick') && !u.includes('google') && !u.includes('facebook')) {
                    console.log(`[Puppeteer] Caught: ${u}`);
                    videoUrl = u;
                }
            }
        });

        console.log(`[Puppeteer] Navigating: ${playUrl}`);
        await page.goto(playUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // Tunggu sebentar untuk network log
        await new Promise(r => setTimeout(r, 2000));

        // JIKA BELUM KETEMU: Coba Klik Player (Untuk memicu video)
        if (!videoUrl) {
            try {
                console.log('[Puppeteer] Clicking player to trigger video...');
                // Klik elemen video, iframe, atau tombol play
                await page.evaluate(() => {
                    const playBtn = document.querySelector('.jw-display-icon-container, .vjs-big-play-button, video, iframe');
                    if (playBtn) playBtn.click();
                });
                await new Promise(r => setTimeout(r, 2000)); // Tunggu efek klik
            } catch (e) {}
        }

        // DOM FALLBACK: Cari Base64 atau Iframe di DOM
        if (!videoUrl) {
            videoUrl = await page.evaluate(() => {
                // 1. Cek Base64 attribute
                const elBase64 = document.querySelector('[data-iframe]');
                if (elBase64) return elBase64.getAttribute('data-iframe'); // Nanti didecode di luar

                // 2. Cek Iframe src
                const iframe = document.querySelector('iframe[src^="http"]');
                if (iframe && !iframe.src.includes('facebook')) return iframe.src;

                // 3. Cek Video src
                const vid = document.querySelector('video');
                if (vid) return vid.src;

                return null;
            });

            // Decode jika hasil dari DOM adalah Base64
            if (videoUrl) {
                const decoded = tryDecode(videoUrl);
                if (decoded) videoUrl = decoded;
            }
        }

        return videoUrl;

    } catch (e) {
        console.error(`[Puppeteer Error] ${e.message}`);
        if (browser) { await browser.close(); browser = null; }
        return null;
    } finally {
        if (page) await page.close();
    }
}

// MAIN EXPORT
export async function extractEmbedUrlWithPuppeteer(playUrl) {
    // 1. Static Check (Super Cepat)
    let res = await extractStatic(playUrl);
    if (res) return res.startsWith('//') ? 'https:' + res : res;

    // 2. Puppeteer Check (Deep Scan)
    res = await extractPuppeteer(playUrl);
    return res ? (res.startsWith('//') ? 'https:' + res : res) : null;
}

export async function closeBrowser() {
    if (browser) { await browser.close(); browser = null; }
}
