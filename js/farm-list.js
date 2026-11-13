
let flAllFarms = [];      // every farm from the database
let flUserPos = null;     // { lat, lng } once "Use My Location" is pressed

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("farm-search-input");
    if (searchInput) {
        // pre-fill from a link like farm-list.html?q=mango (a search sent from another page)
        const urlQuery = new URLSearchParams(window.location.search).get("q");
        if (urlQuery) searchInput.value = urlQuery;

        // While you type, results can shrink the page. A shorter page makes the browser throw you back
        // up the screen, so the page keeps its current height until you leave the search box.
        const page = document.getElementById("main-content");
        const holdHeight = () => { if (page && !page.style.minHeight) page.style.minHeight = page.offsetHeight + "px"; };
        const releaseHeight = () => { if (page) page.style.minHeight = ""; };

        searchInput.addEventListener("input", () => { holdHeight(); flApplySearch(); });
        searchInput.addEventListener("blur", releaseHeight);
        // Enter / the Search button just filters, with no page reload
        searchInput.closest("form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            holdHeight();
            flApplySearch();
        });
    }

    document.getElementById("use-location-btn")?.addEventListener("click", flLocateUser);
    flLoadFarms();
});

/* ---------- data ---------- */
async function flLoadFarms() {
    try {
        const { data, error } = await supabase.from("farms").select("*");
        if (error) {
            console.error("Error fetching farms:", error.message);
            return;
        }
        flAllFarms = data || [];
        flApplySearch();
    } catch (err) {
        console.error("Unexpected error while loading farms:", err);
    }
}

function flApplySearch() {
    const query = (document.getElementById("farm-search-input")?.value || "").toLowerCase().trim();
    flRender(flFilter(query), query !== "");
}

function flFilter(query) {
    if (!query) return flAllFarms;
    return flAllFarms.filter((f) =>
        [f.name, f.province, f.location, flCropsText(f)].join(" ").toLowerCase().includes(query)
    );
}

/* ---------- rendering ---------- */
function flRender(farms, searching) {
    // Nearby: only filled after "Use My Location"; otherwise left empty (the CSS shows the hint)
    if (flUserPos) {
        const withDistance = farms
            .filter((f) => f.latitude != null && f.longitude != null)
            .map((f) => ({ farm: f, km: flDistanceKm(flUserPos.lat, flUserPos.lng, Number(f.latitude), Number(f.longitude)) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 4);
        flFill("nearby-farms-grid", withDistance.map((x) => flCardHTML(x.farm, x.km)));
    } else {
        flFill("nearby-farms-grid", []);
    }

    const flagged = farms.filter((f) => (f.category || "").toLowerCase() === "popular");
    flFill("popular-farms-grid", (flagged.length ? flagged : farms.slice(0, 3)).map((f) => flCardHTML(f)));

    flFill("wet-season-grid", farms.filter((f) => ["wet", "all"].includes(flSeason(f))).map((f) => flCardHTML(f)));
    flFill("dry-season-grid", farms.filter((f) => ["dry", "all"].includes(flSeason(f))).map((f) => flCardHTML(f)));
}

function flFill(gridId, cards) {
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = cards.join("");     // empty list -> empty row -> CSS shows "No farms found."
}

function flCardHTML(farm, km = null) {
    const crops = flCropsText(farm) || "Fresh Produce";
    return `
        <article class="farm-card">
            <a href="farm.html?id=${encodeURIComponent(farm.id)}">
                <img src="${flEscape(flImage(farm))}" alt="${flEscape(farm.name)}" loading="lazy"
                     onerror="this.onerror=null;this.src='../images/default-farm.jpg'">
                <div class="card-info">
                    <h3>${flEscape(farm.name)}</h3>
                    <p class="location">${flEscape(farm.location || farm.province)}</p>
                    <span class="tag">${flEscape(crops)}</span>
                    ${km === null ? "" : `<p class="distance">${km.toFixed(1)} km away</p>`}
                </div>
            </a>
        </article>`;
}

/* ---------- "Use My Location" ---------- */
function flLocateUser() {
    const btn = document.getElementById("use-location-btn");
    const label = btn ? btn.textContent : "";
    const say = (text) => {
        if (!btn) return;
        btn.textContent = text;
        setTimeout(() => { btn.textContent = label; }, 3500);
    };

    if (!navigator.geolocation) { say("Location not supported"); return; }
    if (btn) btn.textContent = "Finding you…";

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            flUserPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (btn) btn.textContent = label;
            flApplySearch();
        },
        () => say("Location blocked")
    );
}

/* ---------- small helpers ---------- */
function flCropsText(farm) {
    if (Array.isArray(farm.crops)) return farm.crops.join(", ");
    return typeof farm.crops === "string" ? farm.crops : "";
}

function flSeason(farm) {
    return String(farm.season || "").toLowerCase();
}

function flImage(farm) {
    const first = Array.isArray(farm.images) && farm.images.length ? farm.images[0] : "";
    if (!first) return "../images/default-farm.jpg";
    if (/^(https?:)?\/\//i.test(first) || first.startsWith("data:")) return first;   // full web address
    return "../" + String(first).replace(/^\/+/, "");                                  // a path inside the project
}

function flDistanceKm(lat1, lng1, lat2, lng2) {
    const rad = (d) => (d * Math.PI) / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

function flEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}