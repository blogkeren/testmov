import './style.css'
import './movies-page.css'

const API_BASE = 'http://localhost:3000/api';

// State
let currentSource = 'rebahin';
let currentMovies = [];
let currentMovie = null;
let currentServer = 1;
let currentEpisode = null;
let featuredMovie = null;
let currentPage = 1;
let totalPages = 10;
let moviesPageData = [];

// DOM Elements
const navbar = document.getElementById('navbar');
const heroSection = document.getElementById('hero-section');
const mainContent = document.getElementById('main-content');
const moviesSection = document.getElementById('movies-section');
const playerSection = document.getElementById('player-section');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const sourceSelect = document.getElementById('source-select');
const searchInput = document.getElementById('search-input');
const backBtn = document.getElementById('back-btn');
const videoPlayer = document.getElementById('video-player');
const movieTitle = document.getElementById('movie-title');
const infoSource = document.getElementById('info-source');
const infoEpisode = document.getElementById('info-episode');
const infoServer = document.getElementById('info-server');

// Hero Elements
const heroTitle = document.getElementById('hero-title');
const heroRating = document.getElementById('hero-rating');
const heroYear = document.getElementById('hero-year');
const heroQuality = document.getElementById('hero-quality');
const heroDescription = document.getElementById('hero-description');
const heroPlayBtn = document.getElementById('hero-play');
const heroInfoBtn = document.getElementById('hero-info');

// Carousels
const trendingCarousel = document.getElementById('trending-carousel');
const popularCarousel = document.getElementById('popular-carousel');

// Movie Detail Modal
const detailModal = document.getElementById('movie-detail-modal');
const detailClose = document.getElementById('detail-close');
const detailOverlay = document.getElementById('detail-overlay');
const detailPoster = document.getElementById('detail-poster');
const detailTitle = document.getElementById('detail-title');
const detailRating = document.getElementById('detail-rating');
const detailYear = document.getElementById('detail-year');
const detailQuality = document.getElementById('detail-quality');
const detailDescription = document.getElementById('detail-description');
const detailServers = document.getElementById('detail-servers');

// Movies Page Elements
const moviesPage = document.getElementById('movies-page');
const moviesBackBtn = document.getElementById('movies-back-btn');
const moviesGridPage = document.getElementById('movies-grid-page');
const moviesLoading = document.getElementById('movies-loading');
const pagination = document.getElementById('pagination');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbers = document.getElementById('page-numbers');
const sortSelect = document.getElementById('sort-select');
const yearFilter = document.getElementById('year-filter');

// Initialize
init();

function init() {
    loadMovies();
    setupEventListeners();
    setupScrollEffects();
    setupCarouselNavigation();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Source selection
    sourceSelect.addEventListener('change', (e) => {
        currentSource = e.target.value;
        loadMovies();
    });

    // Search with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 500);
    });

    // Hero buttons
    heroPlayBtn?.addEventListener('click', () => {
        if (featuredMovie) showMovieDetail(featuredMovie);
    });

    heroInfoBtn?.addEventListener('click', () => {
        if (featuredMovie) showMovieDetail(featuredMovie);
    });

    // Player controls
    backBtn.addEventListener('click', showMainContent);

    // Server selection
    document.getElementById('server-buttons').addEventListener('click', (e) => {
        if (e.target.classList.contains('server-btn')) {
            const server = parseInt(e.target.dataset.server);
            changeServer(server);
        }
    });

    // Detail Modal controls
    detailClose?.addEventListener('click', hideDetailModal);
    detailOverlay?.addEventListener('click', hideDetailModal);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideDetailModal();
        }
    });

    // Movies page navigation
    document.querySelectorAll('.nav-links a')[1]?.addEventListener('click', (e) => {
        e.preventDefault();
        showMoviesPage(1);
    });

    moviesBackBtn?.addEventListener('click', () => {
        hideMoviesPage();
    });

    // Pagination
    prevPageBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            showMoviesPage(currentPage - 1);
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        if (currentPage < totalPages) {
            showMoviesPage(currentPage + 1);
        }
    });

    // Filters
    sortSelect?.addEventListener('change', () => {
        applyFilters();
    });

    yearFilter?.addEventListener('change', () => {
        applyFilters();
    });
}

// ===== SCROLL EFFECTS =====
function setupScrollEffects() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== CAROUSEL NAVIGATION =====
function setupCarouselNavigation() {
    document.querySelectorAll('.carousel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const rowId = e.currentTarget.dataset.row;
            const carousel = document.getElementById(`${rowId}-carousel`);
            const scrollAmount = 800;

            if (e.currentTarget.classList.contains('carousel-btn-left')) {
                carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });
}

// ===== LOAD MOVIES =====
async function loadMovies() {
    showLoading(true);
    hideError();

    try {
        const response = await fetch(`${API_BASE}/${currentSource}/home`);
        const data = await response.json();

        if (data.success && data.data) {
            currentMovies = data.data;

            // Set featured movie (first high-rated movie)
            featuredMovie = data.data.find(m => m.rating && parseFloat(m.rating) > 7.0) || data.data[0];

            if (featuredMovie) {
                displayHero(featuredMovie);
            }

            // Split movies into categories
            const trending = data.data.slice(0, Math.min(12, data.data.length));
            const popular = data.data.slice(12, Math.min(24, data.data.length));

            renderCarousel(trendingCarousel, trending);
            renderCarousel(popularCarousel, popular.length > 0 ? popular : trending);

            heroSection.classList.remove('hidden');
            moviesSection.classList.remove('hidden');
        } else {
            showError('Failed to load movies');
        }
    } catch (err) {
        showError('Error connecting to backend: ' + err.message);
    } finally {
        showLoading(false);
    }
}

// ===== DISPLAY HERO =====
function displayHero(movie) {
    heroTitle.textContent = movie.title || 'Featured Movie';
    heroRating.textContent = `⭐ ${movie.rating || 'N/A'}`;
    heroYear.textContent = movie.year || '2024';
    heroQuality.textContent = movie.quality || 'HD';

    // Set description (truncate if too long)
    const desc = movie.synopsis || movie.description || 'Experience the ultimate streaming adventure.';
    heroDescription.textContent = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;

    // Set background image
    if (movie.poster) {
        const heroBackground = document.querySelector('.hero-background');
        heroBackground.style.backgroundImage = `url(${movie.poster})`;
    }
}

// ===== RENDER CAROUSEL =====
function renderCarousel(carousel, movies) {
    carousel.innerHTML = '';

    if (!movies || movies.length === 0) {
        carousel.innerHTML = '<p style="color: #808080; padding: 2rem;">No movies available</p>';
        return;
    }

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        carousel.appendChild(card);
    });
}

// ===== CREATE MOVIE CARD =====
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const isMovie = !!movie.movie_url;

    card.innerHTML = `
    <img 
      src="${movie.poster || 'https://via.placeholder.com/280x400?text=No+Image'}" 
      alt="${movie.title}"
      onerror="this.src='https://via.placeholder.com/280x400?text=No+Image'"
      loading="lazy"
    >
    <div class="movie-info">
      <h3>${movie.title}</h3>
      <div class="movie-meta">
        <span>${movie.year || (isMovie ? 'Movie' : 'Series')}</span>
        ${movie.quality ? `<span class="quality-badge">${movie.quality}</span>` : ''}
        ${movie.rating ? `<span>⭐ ${movie.rating}</span>` : ''}
      </div>
      ${movie.current_episode ? `<div class="movie-meta">📺 EP ${movie.current_episode}</div>` : ''}
    </div>
  `;

    // Click handlers
    card.addEventListener('click', (e) => {
        showMovieDetail(movie);
    });

    return card;
}

// ===== SEARCH =====
function handleSearch(query) {
    if (!query.trim()) {
        // Reset to all movies
        const trending = currentMovies.slice(0, Math.min(12, currentMovies.length));
        const popular = currentMovies.slice(12, Math.min(24, currentMovies.length));
        renderCarousel(trendingCarousel, trending);
        renderCarousel(popularCarousel, popular.length > 0 ? popular : trending);
        return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = currentMovies.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm)
    );

    renderCarousel(trendingCarousel, filtered);
    renderCarousel(popularCarousel, []);

    // Update row title
    document.querySelector('#trending-row .row-title').textContent =
        `Search Results for "${query}" (${filtered.length})`;
}

// ===== MOVIE DETAIL MODAL =====
async function showMovieDetail(movie) {
    currentMovie = movie;

    // Show modal immediately with loading state
    detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Set basic info from card data
    detailPoster.src = movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';
    detailTitle.textContent = movie.title;
    detailRating.textContent = `⭐ ${movie.rating || 'N/A'}`;
    detailYear.textContent = movie.year || '2024';
    detailQuality.textContent = movie.quality || 'HD';
    detailDescription.textContent = 'Loading details...';
    detailServers.innerHTML = '<p style="color: #808080;">Loading servers...</p>';

    // Fetch full details from API
    try {
        const detailUrl = `${API_BASE}/${currentSource}/detail/${movie.slug}`;
        const detailResponse = await fetch(detailUrl);
        const detailData = await detailResponse.json();

        if (detailData.success && detailData.data) {
            const detail = detailData.data;

            // Update with full details
            detailPoster.src = detail.poster || movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';
            detailTitle.textContent = detail.title || movie.title;
            detailRating.textContent = `⭐ ${detail.rating || movie.rating || 'N/A'}`;
            detailYear.textContent = detail.year || movie.year || '2024';
            detailQuality.textContent = detail.quality || movie.quality || 'HD';

            // Use full description from detail API
            let description = detail.description || detail.synopsis || 'No description available.';
            // Clean up description (remove promotional text)
            if (description.includes('Rebahin merupakan')) {
                description = description.split('Rebahin merupakan')[0].trim();
            }
            if (description.includes('KitaNonton merupakan')) {
                description = description.split('KitaNonton merupakan')[0].trim();
            }
            detailDescription.textContent = description || 'No description available.';

            // Update current movie with full data
            currentMovie = { ...movie, ...detail };
        }
    } catch (err) {
        console.error('Error fetching movie details:', err);
        detailDescription.textContent = movie.synopsis || movie.description || 'No description available.';
    }

    // Load available servers
    try {
        const isMovie = !!movie.movie_url;
        let url = `${API_BASE}/${currentSource}/play/${movie.slug}`;
        if (!isMovie) {
            url += '?ep=1';
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.servers && data.servers.length > 0) {
            renderServerButtons(data.servers, currentMovie);
        } else {
            detailServers.innerHTML = '<p style="color: #808080;">No servers available</p>';
        }
    } catch (err) {
        detailServers.innerHTML = '<p style="color: #E50914;">Error loading servers</p>';
    }
}

function renderServerButtons(servers, movie) {
    detailServers.innerHTML = '';

    servers.forEach(serverData => {
        const btn = document.createElement('button');
        btn.className = 'server-select-btn';
        btn.textContent = `Server ${serverData.server}`;
        if (serverData.url.includes('short.icu')) {
            btn.textContent += ' ⚡';
        }
        btn.addEventListener('click', () => {
            playMovieWithServer(movie, serverData.server, serverData.url);
        });
        detailServers.appendChild(btn);
    });
}

function hideDetailModal() {
    detailModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function playMovieWithServer(movie, server, url) {
    // Close detail modal
    hideDetailModal();

    // Set current movie and server
    const isMovie = !!movie.movie_url;
    currentMovie = movie;
    currentServer = server;
    currentEpisode = isMovie ? null : 1;

    // Show player
    showPlayer();
    movieTitle.textContent = movie.title;
    infoSource.textContent = currentSource;
    infoEpisode.textContent = isMovie ? '-' : '1';
    infoServer.textContent = server;

    // Load video with provided URL
    videoPlayer.src = url;

    // Update server buttons
    updateServerButtons(server);
}

// ===== PLAY MOVIE =====
async function playMovie(movie) {
    const isMovie = !!movie.movie_url;

    currentMovie = movie;
    currentServer = 1;
    currentEpisode = isMovie ? null : 1;

    showPlayer();
    movieTitle.textContent = movie.title;
    infoSource.textContent = currentSource;

    // Reset server buttons
    updateServerButtons(1);

    if (isMovie) {
        infoEpisode.textContent = '-';
        infoServer.textContent = '1';
        await loadVideoEmbed(movie.slug, null, 1);
    } else {
        infoEpisode.textContent = '1';
        infoServer.textContent = '1';
        await loadVideoEmbed(movie.slug, 1, 1);
    }
}

// ===== CHANGE SERVER =====
function changeServer(server) {
    if (!currentMovie) return;

    currentServer = server;
    updateServerButtons(server);
    infoServer.textContent = server;

    loadVideoEmbed(currentMovie.slug, currentEpisode, server);
}

// ===== UPDATE SERVER BUTTONS =====
function updateServerButtons(activeServer) {
    const buttons = document.querySelectorAll('.server-btn');
    buttons.forEach(btn => {
        const server = parseInt(btn.dataset.server);
        if (server === activeServer) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ===== LOAD VIDEO EMBED =====
async function loadVideoEmbed(slug, episode = null, server = null) {
    try {
        videoPlayer.src = '';
        movieTitle.textContent = 'Loading video...';

        let url = `${API_BASE}/${currentSource}/play/${slug}`;
        if (episode) {
            url += `?ep=${episode}`;
        }

        console.log('Fetching embed URLs from:', url);

        const response = await fetch(url);
        const data = await response.json();

        console.log('Play response:', data);

        if (data.success && data.servers && data.servers.length > 0) {
            updateAvailableServers(data.servers);

            let playUrl = data.default_url;
            let playServer = data.default_server;

            if (server) {
                const requested = data.servers.find(s => s.server === server);
                if (requested) {
                    playUrl = requested.url;
                    playServer = requested.server;
                }
            }

            if (playUrl) {
                videoPlayer.src = playUrl;
                movieTitle.textContent = currentMovie.title;
                console.log('Playing:', playUrl);

                updateServerButtons(playServer);
                infoServer.textContent = playServer;
            } else {
                movieTitle.textContent = 'Error: No valid URL found';
            }
        } else {
            movieTitle.textContent = 'Error: ' + (data.error || 'No servers found');
            console.error('Failed to get embed URL:', data);
        }
    } catch (err) {
        movieTitle.textContent = 'Error loading video';
        console.error('Error:', err);
    }
}

// ===== UPDATE AVAILABLE SERVERS =====
function updateAvailableServers(servers) {
    const container = document.getElementById('server-buttons');
    container.innerHTML = '';

    servers.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'server-btn';
        btn.dataset.server = s.server;
        btn.textContent = `Server ${s.server}`;
        if (s.url.includes('short.icu')) {
            btn.textContent += ' (Fast)';
        }
        container.appendChild(btn);
    });
}

// ===== SHOW/HIDE SECTIONS =====
function showPlayer() {
    mainContent.classList.add('hidden');
    heroSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function showMainContent() {
    playerSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    videoPlayer.src = '';
    currentMovie = null;

    // Reset search title
    document.querySelector('#trending-row .row-title').textContent = 'Trending Now';
    window.scrollTo(0, 0);
}

function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function hideError() {
    error.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

// ===== MOVIES PAGE =====
async function showMoviesPage(page = 1) {
    currentPage = page;

    // Hide main content
    mainContent.classList.add('hidden');
    heroSection.classList.add('hidden');
    playerSection.classList.add('hidden');
    moviesPage.classList.remove('hidden');

    // Show loading
    moviesLoading.classList.remove('hidden');
    moviesGridPage.innerHTML = '';
    pagination.classList.add('hidden');

    window.scrollTo(0, 0);

    // Load movies
    try {
        const response = await fetch(`${API_BASE}/${currentSource}/movie/page/${page}`);
        const data = await response.json();

        if (data.success && data.data) {
            moviesPageData = data.data;
            moviesLoading.classList.add('hidden');

            // Apply filters
            applyFilters();

            // Create pagination
            createPagination(page);
            pagination.classList.remove('hidden');
        } else {
            moviesLoading.classList.add('hidden');
            moviesGridPage.innerHTML = '<p style="color: #808080; padding: 2rem; text-align: center;">No movies found</p>';
        }
    } catch (err) {
        moviesLoading.classList.add('hidden');
        moviesGridPage.innerHTML = `<p style="color: #E50914; padding: 2rem; text-align: center;">Error: ${err.message}</p>`;
    }
}

function hideMoviesPage() {
    moviesPage.classList.add('hidden');
    mainContent.classList.remove('hidden');
    heroSection.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function renderMoviesGrid(movies) {
    moviesGridPage.innerHTML = '';

    if (!movies || movies.length === 0) {
        moviesGridPage.innerHTML = '<p style="color: #808080; padding: 2rem; text-align: center;">No movies found</p>';
        return;
    }

    movies.forEach(movie => {
        const card = createMovieCard(movie);
        moviesGridPage.appendChild(card);
    });
}

function applyFilters() {
    let filtered = [...moviesPageData];

    // Filter by year
    const year = yearFilter.value;
    if (year !== 'all') {
        filtered = filtered.filter(movie => movie.year === year);
    }

    // Sort
    const sort = sortSelect.value;
    if (sort === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'year') {
        filtered.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
    }
    // 'latest' is default order from API

    renderMoviesGrid(filtered);
}

function createPagination(current) {
    pageNumbers.innerHTML = '';

    // Show max 7 page numbers
    let startPage = Math.max(1, current - 3);
    let endPage = Math.min(totalPages, current + 3);

    // First page
    if (startPage > 1) {
        addPageNumber(1);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
    }

    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i, i === current);
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
        addPageNumber(totalPages);
    }

    // Update prev/next buttons
    prevPageBtn.disabled = current === 1;
    nextPageBtn.disabled = current === totalPages;
}

function addPageNumber(page, isActive = false) {
    const btn = document.createElement('button');
    btn.className = 'page-number' + (isActive ? ' active' : '');
    btn.textContent = page;
    btn.addEventListener('click', () => {
        if (!isActive) {
            showMoviesPage(page);
        }
    });
    pageNumbers.appendChild(btn);
}
