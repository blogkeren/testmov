import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  kitanontonBaseUrl: process.env.KITANONTON_BASE_URL || 'https://kitanonton2.live',
  rebahinBaseUrl: process.env.REBAHIN_BASE_URL || 'https://rebahinxxi3.fit',
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  // Tambahan baru untuk Cache
  cloudflareWorkerUrl: process.env.CLOUDFLARE_WORKER_URL,
  cloudflareApiSecret: process.env.CLOUDFLARE_API_SECRET
};
