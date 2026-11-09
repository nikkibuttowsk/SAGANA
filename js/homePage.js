document.addEventListener("DOMContentLoaded", () => {
    fetchHomePageData();
});

let leafletMap = null;

async function fetchHomePageData() {
    try {
        // Fetch all farms from Supabase
        const { data: farms, error } = await supabase
            .from('farms')
            .select('*');

        if (error) {
            console.error("Error fetching farms for homepage:", error.message);
            return;
        }

        if (!farms || farms.length === 0) {
            console.warn("No farms returned from database.");
            return;
        }

        // 1. Populate Popular Farms Section
        renderPopularFarms(farms);

        // 2. Populate Hero Carousel
        renderHeroCarousel(farms);

        // 3. Populate Leaflet Map Pins
        renderMapPins(farms);

    } catch (err) {
        console.error("Unexpected homepage error:", err);
    }
}


// Popular Farms Grid Renderer
function renderPopularFarms(farms) {
    const popularGrid = document.querySelector("#suggested-farms .farm-grid");
    if (!popularGrid) return;

    popularGrid.innerHTML = "";

    // filter farms into popular or other categories
    const popularFarms = farms.filter(f => (f.category || '').toLowerCase() === 'popular');
    const displayFarms = popularFarms.length > 0 ? popularFarms.slice(0, 3) : farms.slice(0, 3);

    displayFarms.forEach(farm => {
        const imageSrc = (farm.images && farm.images.length > 0) ? farm.images[0] : 'images/default-farm.jpg';
        const cropsList = Array.isArray(farm.crops) ? farm.crops.join(", ") : (farm.crops || 'Fresh Produce');

        popularGrid.innerHTML += `
            <article class="farm-card">
                <a href="farm.html?id=${farm.id}">
                    <img src="${imageSrc}" alt="${farm.name}" onerror="this.src='images/default-farm.jpg'">
                    <div class="card-info">
                        <h3>${farm.name}</h3>
                        <p class="location">${farm.location || farm.province}</p>
                        <span class="tag">${cropsList}</span>
                    </div>
                </a>
            </article>
        `;
    });
}

// HERO CAROUSEL RENDERER
function renderHeroCarousel(farms) {
    const track = document.getElementById("news-carousel-track");
    if (!track) return;

    track.innerHTML = "";
    
    // filtering farms into trending news
    const trendingNews = farms.filter(f => f.is_trending || f.headline);
    const displayItems = trendingNews.length > 0 ? trendingNews : farms.slice(0, 3);

    displayItems.forEach((farm, index) => {
        const activeClass = index === 0 ? "active" : "";
        const imageSrc = (farm.images && farm.images.length > 0) ? farm.images[0] : 'images/default-farm.jpg';
        const headlineText = farm.headline || `${farm.name} Opens Peak Season Tours`;
        const newsSummary = farm.news_summary || farm.description || 'Discover fresh fruit picking and harvest updates from this farm.';
        const pubDate = farm.published_at ? new Date(farm.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Latest Update';

        track.innerHTML += `
            <article class="slide news-slide ${activeClass}">
                <div class="slide-media">
                    <img src="${imageSrc}" alt="${farm.name}">
                </div>
                <div class="slide-caption news-caption">
                    <span class="news-tag">BREAKING NEWS &bull; ${pubDate}</span>
                    <h3>${headlineText}</h3>
                    <p class="summary-text">${newsSummary}</p>
                    <div class="news-footer">
                        <span class="farm-source">Source: <strong>${farm.name}</strong></span>
                        <a href="farm.html?id=${farm.id}" class="btn btn-sm btn-primary">Read Story & Book Visit &rarr;</a>
                    </div>
                </div>
            </article>
        `;
    });

    // Carousel Navigation Logic
    const slides = track.querySelectorAll(".slide");
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.toggle("active", i === index);
        });
    }

    document.getElementById("hero-next")?.addEventListener("click", () => {
        if (slides.length === 0) return;
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    document.getElementById("hero-prev")?.addEventListener("click", () => {
        if (slides.length === 0) return;
        currentSlide = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(currentSlide);
    });
}

// Dynamic Leaflet Map Pins
function renderMapPins(farms) {
    const mapElement = document.getElementById("leaflet-map");
    if (!mapElement || typeof L === 'undefined') return;

    // Initialize Map if not already initialized
    if (!leafletMap) {
        leafletMap = L.map('leaflet-map').setView([12.8797, 121.7740], 6);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leafletMap);
    }

    // Add marker for each farm with latitude & longitude
    farms.forEach(farm => {
        if (farm.latitude && farm.longitude) {
            const cropsList = Array.isArray(farm.crops) ? farm.crops.join(", ") : farm.crops;
            const marker = L.marker([farm.latitude, farm.longitude]).addTo(leafletMap);

            const popupContent = `
                <div class="map-popup-card">
                    <h4>${farm.name}</h4>
                    <p><strong>Location:</strong> ${farm.location || farm.province}<br>
                    <strong>Crops:</strong> ${cropsList}</p>
                    <a href="farm.html?id=${farm.id}" class="btn-popup">View Farm & Book</a>
                </div>
            `;

            marker.bindPopup(popupContent);
        }
    });
}