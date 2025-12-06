import puppeteer from 'puppeteer';

let browser = null;

/**
 * Get or create browser instance
 */
async function getBrowser() {
    if (!browser) {
        console.log('[Puppeteer] Launching new browser instance...');
        browser = await puppeteer.launch({
            headless: true, // Wajib true untuk server
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Penting untuk container memori kecil (Render)
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Hemat memori
                '--disable-gpu'
            ],
            // Gunakan path chrome dari buildpack jika ada, atau default
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null
        });
    }
    return browser;
}

/**
 * Extract embed URL from play page using Puppeteer
 * @param {string} playUrl - URL of the play page
 * @returns {Promise<string>} Embed URL
 */
export async function extractEmbedUrlWithPuppeteer(playUrl) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // 1. OPTIMASI: Block Gambar, CSS, Font agar ringan & cepat
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media', 'other'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[Puppeteer] Navigating to: ${playUrl}`);

        // 2. Timeout lebih agresif agar tidak hang
        await page.goto(playUrl, {
            waitUntil: 'domcontentloaded', // Lebih cepat dari networkidle2
            timeout: 25000 
        });

        // 3. Tunggu sebentar untuk JS load (dikurangi jadi 4 detik)
        console.log('[Puppeteer] Waiting for player to render...');
        await new Promise(resolve => setTimeout(resolve, 4000));

        // 4. Extract embed URL
        const embedUrl = await page.evaluate(() => {
            // Cek iframe embed ID (Rebahin)
            const iframeEmbed = document.querySelector('#iframe-embed');
            if (iframeEmbed && iframeEmbed.src) return iframeEmbed.src;

            // Cek selector umum player
            const selectors = [
                '#player iframe',
                '.player iframe',
                '#pembed iframe',
                '.video-container iframe',
                '.embed-responsive iframe',
                'iframe[src*="youtube"]', // Hindari trailer youtube
                'iframe' // Fallback terakhir
            ];

            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.src) {
                    // Filter URL sampah (iklan/sosmed)
                    if (!el.src.includes('facebook') && 
                        !el.src.includes('twitter') && 
                        !el.src.includes('googletag') &&
                        !el.src.startsWith('about:blank')) {
                        return el.src;
                    }
                }
            }
            return null;
        });

        if (embedUrl) {
            console.log(`[Puppeteer] ✓ Found: ${embedUrl.substring(0, 50)}...`);
            
            // Dekode jika base64 (Pattern Rebahin/Kitanonton)
            if (embedUrl.includes('source=')) {
                try {
                    const urlObj = new URL(embedUrl);
                    const sourceParam = urlObj.searchParams.get('source');
                    if (sourceParam) {
                        const decoded = atob(sourceParam); // Decode Base64
                        if (decoded.startsWith('http')) return decoded;
                    }
                } catch (e) {
                    // Ignore decode error
                }
            }
            
            return embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
        }

        throw new Error('No valid iframe found');

    } catch (error) {
        console.error(`[Puppeteer Error] ${error.message}`);
        // Jika browser crash/tutup, reset instance agar request berikutnya buat baru
        if (error.message.includes('Session closed') || error.message.includes('not opened')) {
            if (browser) await browser.close();
            browser = null;
        }
        throw error;
    } finally {
        if (page) await page.close();
    }
}

export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
