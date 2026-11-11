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

    track.replaceChildren(...farms.map((farm, index) =>
        h("article", { class: `slide news-slide${index === 0 ? " active" : ""}` },
            h("div", { class: "slide-media" },
                h("img", { src: assetUrl(farm.getCoverPhoto()), alt: "" })),
            h("div", { class: "slide-caption news-caption" },
                h("span", { class: "news-tag", text: farm.isTrending ? "Trending" : "Featured" }),
                h("h3", { text: farm.headline || `${farm.name} Opens Peak Season Tours` }),
                h("p", { class: "summary-text", text: farm.newsSummary || farm.description }),
                h("div", { class: "news-footer" },
                    h("span", { class: "farm-source" }, "Source: ", h("strong", { text: farm.name })),
                    h("a", {
                        class: "btn btn-sm btn-primary",
                        href: `${PAGES_ROOT}farm.html?id=${encodeURIComponent(farm.id)}`,
                        text: "Read story & book a visit \u2192"
                    }))))));

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
        const popup = h("div", { class: "map-popup-card" },
            h("h4", { text: farm.name }),
            h("p", {},
                h("strong", { text: "Location: " }), farm.location, h("br"),
                h("strong", { text: "Crops: " }), farm.getFormattedCrops()),
            h("a", { class: "btn-popup", href: `${PAGES_ROOT}farm.html?id=${encodeURIComponent(farm.id)}`, text: "View farm & book" }),
            " ",
            h("a", { href: mapsUrl(farm), target: "_blank", rel: "noopener noreferrer", text: "Get directions" }));
        L.marker([farm.latitude, farm.longitude]).addTo(leafletMap).bindPopup(popup);
    });

    if (pinned.length > 0) {
        leafletMap.fitBounds(pinned.map((f) => [f.latitude, f.longitude]), { padding: [40, 40], maxZoom: 10 });
    }
}