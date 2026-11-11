// js/homePage.js
let leafletMap = null;

document.addEventListener("DOMContentLoaded", fetchHomePageData);

async function fetchHomePageData() {
    try {
        const homeData = await AppController.fetchHomePageData();

        if (homeData.allFarms.length === 0) {
            console.warn("No farms returned from database.");
            return;
        }
        renderPopularFarms(homeData.popularFarms);
        renderHeroCarousel(homeData.trendingNews);
        renderMapPins(homeData.allFarms);
    } catch (err) {
        console.error("Homepage error:", err);
    }
}

function renderPopularFarms(farms) {
    const grid = $("#suggested-farms .farm-grid");
    if (!grid) return;
    grid.innerHTML = farms.slice(0, 3).map((farm) => farmCardHTML(farm)).join("");
}

function renderHeroCarousel(farms) {
    const track = $("#news-carousel-track");
    if (!track) return;

    track.innerHTML = farms.map((farm, index) => `
        <article class="slide news-slide ${index === 0 ? "active" : ""}">
            <div class="slide-media">
                <img src="${escapeHTML(assetUrl(farm.getCoverPhoto()))}" alt="">
            </div>
            <div class="slide-caption news-caption">
                <span class="news-tag">${farm.isTrending ? "Trending" : "Featured"}</span>
                <h3>${escapeHTML(farm.headline || `${farm.name} Opens Peak Season Tours`)}</h3>
                <p class="summary-text">${escapeHTML(farm.newsSummary || farm.description)}</p>
                <div class="news-footer">
                    <span class="farm-source">Source: <strong>${escapeHTML(farm.name)}</strong></span>
                    <a href="${PAGES_ROOT}farm.html?id=${encodeURIComponent(farm.id)}" class="btn btn-sm btn-primary">Read story &amp; book a visit &rarr;</a>
                </div>
            </div>
        </article>`).join("");

    const slides = $$(".slide", track);
    if (slides.length < 2) return;

    let current = 0;
    const show = (index) => {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle("active", i === current));
    };
    $("#hero-next")?.addEventListener("click", () => show(current + 1));
    $("#hero-prev")?.addEventListener("click", () => show(current - 1));
}

function renderMapPins(farms) {
    if (!$("#leaflet-map") || typeof L === "undefined") return;

    if (!leafletMap) {
        leafletMap = L.map("leaflet-map").setView([12.8797, 121.774], 6);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(leafletMap);
    }

    const pinned = farms.filter((farm) => farm.hasLocation());
    pinned.forEach((farm) => {
        // Popup text comes from the database, so it MUST be escaped
        const popup = `
            <div class="map-popup-card">
                <h4>${escapeHTML(farm.name)}</h4>
                <p><strong>Location:</strong> ${escapeHTML(farm.location)}<br>
                <strong>Crops:</strong> ${escapeHTML(farm.getFormattedCrops())}</p>
                <a href="${PAGES_ROOT}farm.html?id=${encodeURIComponent(farm.id)}" class="btn-popup">View farm &amp; book</a>
                <a href="${escapeHTML(mapsUrl(farm))}" target="_blank" rel="noopener noreferrer">Get directions</a>
            </div>`;
        L.marker([farm.latitude, farm.longitude]).addTo(leafletMap).bindPopup(popup);
    });

    if (pinned.length > 0) {
        leafletMap.fitBounds(pinned.map((f) => [f.latitude, f.longitude]), { padding: [40, 40], maxZoom: 10 });
    }
}