import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import movieRoutes from './routes/movie.routes.js';
import { config } from './config/config.js';

dotenv.config();

const app = express();
const PORT = config.port || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/api', movieRoutes);

app.get('/', (req, res) => {
    res.json({
        message: '🎬 Movie Scraper API v2.0',
        endpoints: {
            rebahin: {
                home: '/api/rebahin/home',
                movies: '/api/rebahin/movie',
                movies_page: '/api/rebahin/movie/page/:num',
                detail: '/api/rebahin/detail/:slug',
                play: '/api/rebahin/play/:slug?ep=2 - Returns all streaming servers'
            },
            kitanonton: {
                home: '/api/kitanonton/home',
                movies: '/api/kitanonton/movie',
                movies_page: '/api/kitanonton/movie/page/:num',
                detail: '/api/kitanonton/detail/:slug',
                play: '/api/kitanonton/play/:slug?ep=2 - Returns all streaming servers'
            }
        },
        examples: {
            home: '/api/rebahin/home',
            detail: '/api/rebahin/detail/gates-of-flesh-2025-sub-indo',
            play: '/api/rebahin/play/gates-of-flesh-2025-sub-indo?ep=2'
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found', message: `Cannot ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Movie Scraper API v2.0 running on port ${PORT}`);
    console.log(`📍 API Documentation: http://localhost:${PORT}`);
    console.log(`\n📺 Configured Sources:`);
    console.log(`   - Kitanonton: ${config.kitanontonBaseUrl}`);
    console.log(`   - Rebahin: ${config.rebahinBaseUrl}\n`);
});
