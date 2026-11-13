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
            renderCarouselFallback();
            return;
        }

        if (!farms || farms.length === 0) {
            console.warn("No farms returned from database.");
            renderCarouselFallback();
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
        renderCarouselFallback();
    }
}

// No farms (or the request failed): leave the carousel empty. Its space and the arrows
// disappear (see carousel.css); the "Suggested for you" heading stays.
function renderCarouselFallback() {
    const track = document.getElementById("news-carousel-track");
    if (track) track.innerHTML = "";
    document.querySelector("#hero-carousel .carousel-nav-buttons")?.setAttribute("hidden", "");
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

    if (displayItems.length === 0) {
        renderCarouselFallback();
        return;
    }

    displayItems.forEach((farm, index) => {
        const activeClass = index === 0 ? "active" : "";
        const imageSrc = (farm.images && farm.images.length > 0) ? farm.images[0] : 'images/default-farm.jpg';
        const headlineText = farm.headline || `${farm.name} Opens Peak Season Tours`;
        const newsSummary = farm.news_summary || farm.description || 'Discover fresh fruit picking and harvest updates from this farm.';
        const pubDate = farm.published_at ? new Date(farm.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Latest Update';

        track.innerHTML += `
            <article class="slide news-slide ${activeClass}">
                <div class="slide-media">
                    <img src="${imageSrc}" alt="${farm.name}" onerror="this.style.display='none'">
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

    // There are real slides, so make sure the arrows/dots pill is visible
    document.querySelector("#hero-carousel .carousel-nav-buttons")?.removeAttribute("hidden");

    // Carousel Navigation Logic
    const slides = track.querySelectorAll(".slide");
    const prevBtn = document.getElementById("hero-prev");
    const nextBtn = document.getElementById("hero-next");
    let currentSlide = 0;

    // Position dots, placed between the arrows (styled in carousel.css)
    const oldDots = document.querySelector("#hero-carousel .carousel-dots");
    if (oldDots) oldDots.remove();
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "carousel-dots";
    slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", `Go to suggestion ${i + 1} of ${slides.length}`);
        dot.addEventListener("click", () => showSlide(i));
        dotsWrap.appendChild(dot);
    });
    dotsWrap.style.display = slides.length > 1 ? "" : "none";
    if (prevBtn) prevBtn.insertAdjacentElement("afterend", dotsWrap);

    function showSlide(index) {
        currentSlide = index;
        slides.forEach((slide, i) => {
            slide.classList.toggle("active", i === index);
        });
        dotsWrap.querySelectorAll(".carousel-dot").forEach((dot, i) => {
            dot.classList.toggle("is-active", i === index);
        });
    }

    nextBtn?.addEventListener("click", () => {
        if (slides.length === 0) return;
        showSlide((currentSlide + 1) % slides.length);
    });

    prevBtn?.addEventListener("click", () => {
        if (slides.length === 0) return;
        showSlide((currentSlide - 1 + slides.length) % slides.length);
    });

    showSlide(0);
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