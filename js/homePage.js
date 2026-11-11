document.addEventListener("DOMContentLoaded", () => {
    fetchHomePageData();
});

let leafletMap = null;

async function fetchHomePageData() {
    try {
        // Delegate fetching to AppController facade
        const homeData = await AppController.fetchHomePageData();

        if (!homeData || !homeData.allFarms || homeData.allFarms.length === 0) {
            console.warn("No farms returned from database.");
            return;
        }

        // 1. Populate Popular Farms Section
        renderPopularFarms(homeData.popularFarms);

        // 2. Populate Hero Carousel
        renderHeroCarousel(homeData.trendingNews);

        // 3. Populate Leaflet Map Pins
        renderMapPins(homeData.allFarms);

    } catch (err) {
        console.error("Unexpected homepage error:", err);
    }
}

// popular farms renderer
function renderPopularFarms(farms) {
    const popularGrid = document.querySelector("#suggested-farms .farm-grid");
    if (!popularGrid) return;

    popularGrid.innerHTML = "";

    farms.slice(0, 3).forEach(farm => {
        popularGrid.innerHTML += `
            <article class="farm-card">
                <a href="pages/farm.html?id=${farm.id}">
                    <img src="${farm.getCoverPhoto()}" alt="${farm.name}" onerror="this.src='images/default-farm.jpg'">
                    <div class="card-info">
                        <h3>${farm.name}</h3>
                        <p class="location">${farm.location}</p>
                        <span class="tag">${farm.getFormattedCrops()}</span>
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

    farms.forEach((farm, index) => {
        const activeClass = index === 0 ? "active" : "";
        const headlineText = farm.headline || `${farm.name} Opens Peak Season Tours`;
        const newsSummary = farm.newsSummary || farm.description || 'Discover fresh fruit picking and harvest updates from this farm.';

        track.innerHTML += `
            <article class="slide news-slide ${activeClass}">
                <div class="slide-media">
                    <img src="${farm.getCoverPhoto()}" alt="${farm.name}">
                </div>
                <div class="slide-caption news-caption">
                    <span class="news-tag">BREAKING NEWS</span>
                    <h3>${headlineText}</h3>
                    <p class="summary-text">${newsSummary}</p>
                    <div class="news-footer">
                        <span class="farm-source">Source: <strong>${farm.name}</strong></span>
                        <a href="pages/farm.html?id=${farm.id}" class="btn btn-sm btn-primary">Read Story & Book Visit &rarr;</a>
                    </div>
                </div>
            </article>
        `;
    });

    const slides = track.querySelectorAll(".slide");
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
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

    if (!leafletMap) {
        leafletMap = L.map('leaflet-map').setView([12.8797, 121.7740], 6);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(leafletMap);
    }

    farms.forEach(farm => {
        if (farm.latitude && farm.longitude) {
            const marker = L.marker([farm.latitude, farm.longitude]).addTo(leafletMap);

            const popupContent = `
                <div class="map-popup-card">
                    <h4>${farm.name}</h4>
                    <p><strong>Location:</strong> ${farm.location}<br>
                    <strong>Crops:</strong> ${farm.getFormattedCrops()}</p>
                    <a href="pages/farm.html?id=${farm.id}" class="btn-popup">View Farm & Book</a>
                </div>
            `;

            marker.bindPopup(popupContent);
        }
    });
}