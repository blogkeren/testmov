import puppeteer from 'puppeteer';

let browser = null;

/**
 * Get or create browser instance
 */
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
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
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[Puppeteer] Navigating to: ${playUrl}`);

        // Navigate and wait for network to be idle
        await page.goto(playUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for iframe to load - increased to 8 seconds
        console.log('[Puppeteer] Waiting 8 seconds for iframe to load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Extract embed URL with priority selectors
        const embedUrl = await page.evaluate(() => {
            // Priority 1: iframe with id iframe-embed (found in Rebahin)
            const iframeEmbed = document.querySelector('#iframe-embed');
            if (iframeEmbed && iframeEmbed.src) {
                return iframeEmbed.src;
            }

            // Priority 2: any iframe that's not social media
            const allIframes = document.querySelectorAll('iframe');
            for (const iframe of allIframes) {
                const src = iframe.src || '';
                if (src && !src.includes('facebook') && !src.includes('twitter') && !src.includes('share')) {
                    return src;
                }
            }

            // Priority 3: check inside player containers
            const selectors = [
                '#player iframe',
                '.player iframe',
                '#pembed iframe',
                '.video-container iframe',
                '.embed-responsive iframe'
            ];

            for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.src) {
                    return el.src;
                }
            }

            return null;
        });

        if (embedUrl) {
            console.log(`[Puppeteer] ✓ Found embed URL: ${embedUrl.substring(0, 100)}...`);

            // Check if URL has base64 encoded source parameter (Rebahin/Kitanonton pattern)
            try {
                const url = new URL(embedUrl);
                const sourceParam = url.searchParams.get('source');

                if (sourceParam) {
                    // Decode base64 source parameter
                    const decodedUrl = Buffer.from(sourceParam, 'base64').toString('utf-8');
                    console.log(`[Puppeteer] ✓ Decoded source param: ${decodedUrl}`);

                    // Return decoded URL if it's a valid HTTP URL
                    if (decodedUrl.startsWith('http')) {
                        return decodedUrl;
                    }
                }
            } catch (err) {
                console.log(`[Puppeteer] Note: Could not decode source parameter, using original URL`);
            }

            return embedUrl.startsWith('//') ? 'https:' + embedUrl : embedUrl;
        }

        console.error('[Puppeteer] ✗ No embed URL found after rendering');
        throw new Error('No embed URL found after rendering');
    } catch (error) {
        console.error('[Puppeteer] Error:', error.message);
        throw error;
    } finally {
        await page.close();
    }
}

/**
 * Close browser when done
 */
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
