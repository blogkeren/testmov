# Movie Player Frontend

Simple frontend to test video playback from the backend API.

## 🚀 Quick Start

Frontend is already running on: **http://localhost:5173**
Backend API running on: **http://localhost:3000**

Just open http://localhost:5173 in your browser!

## 📁 Structure

```
frontend/
├── index.html    # Main HTML with movie grid & player
├── style.css     # Netflix-inspired dark theme
├── main.js       # API integration & video player logic
└── package.json  # Vite config
```

## ✨ Features

### 1. **Movie Grid**
- Browse movies from Rebahin or Kitanonton
- Switch sources with dropdown
- Beautiful card layout with posters
- Shows quality, rating, year

### 2. **Video Player**
- Click any movie to play
- Embedded iframe player
- Server selection (sv parameter)
- Episode selection for series (ep parameter)
- Back button to return to grid

### 3. **API Integration**
- Fetches from `/api/:source/home` for movie list
- Fetches from `/api/:source/play/:slug?ep=&sv=` for embed URL
- Automatic loading states
- Error handling

## 🎮 How to Use

1. **Browse Movies**: Homepage shows movies from selected source
2. **Switch Source**: Use dropdown to switch between Rebahin/Kitanonton
3. **Play Movie**: Click any movie card
4. **Watch**: Video loads in iframe player
5. **Go Back**: Click "← Back to Movies" button

## 🔧 Technologies

- **Vite** - Build tool & dev server
- **Vanilla JavaScript** - No framework needed
- **CSS3** - Modern styling with flexbox/grid
- **Fetch API** - Backend communication

## 🎨 Design

- Netflix-inspired dark theme
- Red accent color (#e50914)
- Responsive grid layout
- Smooth transitions
- Hover effects

## 📝 Notes

- **CORS**: Backend has CORS enabled
- **Iframe**: Uses iframe for video playback
- **API**: Connects to localhost:3000
- **Auto-refresh**: Not implemented (manual refresh button)
