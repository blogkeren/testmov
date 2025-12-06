# Movie Scraper Backend

Backend API untuk scraping film dari **Kitanonton** dan **Rebahin** dengan kemampuan ekstraksi embed video.

## ✨ Fitur

- 🎬 Scraping daftar film dari Kitanonton dan Rebahin
- 📝 Detail lengkap film (judul, deskripsi, poster, genre, rating, dll)
- 🎥 Ekstraksi URL embed video dari berbagai server
- 📥 Ekstraksi link download
- ⚙️ Base URL dapat dikonfigurasi melalui `.env`
- 🔄 Support multi-source (gabungan dari 2 website)

## 🚀 Instalasi

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Konfigurasi Environment

Copy file `.env.example` ke `.env` dan sesuaikan jika diperlukan:

```bash
cp .env.example .env
```

File `.env`:
```env
PORT=3000
KITANONTON_BASE_URL=https://kitanonton2.live
REBAHIN_BASE_URL=https://rebahinxxi3.fit
```

**Note:** Base URL dapat diubah sesuai kebutuhan tanpa perlu mengubah kode.

### 3. Jalankan Server

```bash
npm start
```

Atau untuk development dengan auto-reload:

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

## 📚 API Endpoints

### Root
```
GET /
```
Menampilkan dokumentasi API dan konfigurasi

### Kitanonton

#### Daftar Film
```
GET /api/movies/kitanonton
```

Response:
```json
{
  "success": true,
  "source": "kitanonton",
  "count": 20,
  "data": [
    {
      "title": "Movie Title",
      "url": "https://kitanonton2.live/movie/...",
      "image": "https://...",
      "quality": "HD",
      "year": "2024",
      "rating": "8.5",
      "source": "kitanonton"
    }
  ]
}
```

#### Detail Film
```
GET /api/movies/kitanonton/detail?url={movieUrl}
```

Query Parameters:
- `url` (required): URL halaman detail film

Response:
```json
{
  "success": true,
  "data": {
    "title": "Movie Title",
    "description": "Movie synopsis...",
    "posterImage": "https://...",
    "genre": ["Action", "Drama"],
    "duration": "120 min",
    "year": "2024",
    "rating": "8.5",
    "country": "USA",
    "embedUrls": [
      {
        "type": "iframe",
        "url": "https://...",
        "label": "Server 1"
      }
    ],
    "downloadLinks": [
      {
        "quality": "720p",
        "url": "https://..."
      }
    ],
    "source": "kitanonton",
    "url": "https://..."
  }
}
```

#### Ekstrak Embed URL
```
GET /api/movies/kitanonton/embed?url={playerUrl}
```

Query Parameters:
- `url` (required): URL halaman player

Response:
```json
{
  "success": true,
  "embedUrl": "https://..."
}
```

### Rebahin

#### Daftar Film
```
GET /api/movies/rebahin
```

#### Detail Film
```
GET /api/movies/rebahin/detail?url={movieUrl}
```

#### Ekstrak Embed URL
```
GET /api/movies/rebahin/embed?url={playerUrl}
```

### Gabungan Semua

#### Daftar Film dari Semua Sumber
```
GET /api/movies/all
```

Response:
```json
{
  "success": true,
  "sources": {
    "kitanonton": true,
    "rebahin": true
  },
  "count": 40,
  "data": [...]
}
```

## 🏗️ Struktur Folder

```
backend/
├── src/
│   ├── config/
│   │   └── config.js           # Konfigurasi dari .env
│   ├── utils/
│   │   └── httpClient.js       # HTTP client dengan headers
│   ├── scrapers/
│   │   ├── kitanonton.scraper.js
│   │   └── rebahin.scraper.js
│   ├── routes/
│   │   └── movie.routes.js     # API routes
│   └── index.js                # Entry point
├── .env                        # Environment variables
├── .env.example               # Template environment
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Konfigurasi Base URL

Untuk mengubah base URL (misalnya jika website pindah domain), cukup edit file `.env`:

```env
KITANONTON_BASE_URL=https://kitanonton3.live
REBAHIN_BASE_URL=https://rebahinxxi4.fit
```

Tidak perlu restart server jika Anda menggunakan `npm run dev`.

## 🔧 Teknologi

- **Express.js** - Web framework
- **Axios** - HTTP client
- **Cheerio** - HTML parser (jQuery-like)
- **dotenv** - Environment configuration
- **CORS** - Cross-origin support

## 📝 Catatan

- Scraper ini sangat bergantung pada struktur HTML website target
- Jika website mengubah struktur HTML, selector di scraper perlu disesuaikan
- Beberapa embed mungkin memerlukan ekstraksi tambahan dari JavaScript
- Rate limiting mungkin diperlukan untuk production

## 🛠️ Troubleshooting

### Scraper tidak menemukan data
- Periksa apakah website masih aktif
- Cek struktur HTML website (mungkin berubah)
- Sesuaikan selector di file scraper

### CORS Error
- Pastikan middleware CORS sudah aktif di `index.js`
- Konfigurasi CORS sesuai kebutuhan

### URL tidak lengkap
- Periksa apakah base URL di `.env` sudah benar
- Pastikan tidak ada trailing slash

## 📄 License

MIT
