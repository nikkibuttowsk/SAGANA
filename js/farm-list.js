document.addEventListener("DOMContentLoaded", () => {
    // Attach search event listener
    const searchInput = document.getElementById("farm-search-input");
    if (searchInput) {
        // Pre-fill from a link like farm-list.html?q=mango (e.g. a search sent from another page)
        const urlQuery = new URLSearchParams(window.location.search).get("q");
        if (urlQuery) searchInput.value = urlQuery;

        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterFarmsUI(query);
        });

        // Pressing Enter / the Search button just filters; no page reload
        searchInput.closest("form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            filterFarmsUI(searchInput.value.toLowerCase().trim());
        });
    }

    fetchFarmsFromSupabase();
});

let allFarmsData = []; // Store fetched farms locally for live searching

async function fetchFarmsFromSupabase() {
    try {
        // Query PostgreSQL database through Supabase
        const { data: farms, error } = await supabase
            .from('farms')
            .select('*');

        if (error) {
            console.error("Error fetching farms:", error.message);
            return;
        }

        console.log("Fetched farms from database:", farms); // Useful for debugging in console
        allFarmsData = farms || [];

        // If the search box already has text (e.g. from ?q=), start filtered
        const startQuery = (document.getElementById("farm-search-input")?.value || "").toLowerCase().trim();
        filterFarmsUI(startQuery);
    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

function renderFarmsGrid(farms) {
    const popularGrid = document.getElementById("popular-farms-grid");
    const wetGrid = document.getElementById("wet-season-grid");
    const dryGrid = document.getElementById("dry-season-grid");
    const nearbyGrid = document.getElementById("nearby-farms-grid");

    // Clear previous items
    if (popularGrid) popularGrid.innerHTML = "";
    if (wetGrid) wetGrid.innerHTML = "";
    if (dryGrid) dryGrid.innerHTML = "";
    if (nearbyGrid) nearbyGrid.innerHTML = "";

    // Nothing to show: leave every row empty. The CSS (farm-list.css) shows the
    // "No farms found." box in each empty row, so no message is written here.
    if (!farms || farms.length === 0) return;

    farms.forEach(farm => {
        const cardHTML = createFarmCardHTML(farm);
        let renderedCount = 0;

        // Normalize database strings to lowercase for safe checking
        const category = (farm.category || '').toLowerCase();
        const season = (farm.season || '').toLowerCase();

        // 1. Check Popular section
        if (category === 'popular' && popularGrid) {
            popularGrid.innerHTML += cardHTML;
            renderedCount++;
        }

        // 2. Check Nearby section
        if (category === 'nearby' && nearbyGrid) {
            nearbyGrid.innerHTML += cardHTML;
            renderedCount++;
        }

        // 3. Check Wet Season section
        if ((season === 'wet' || season === 'all') && wetGrid) {
            wetGrid.innerHTML += cardHTML;
            renderedCount++;
        }

        // 4. Check Dry Season section
        if ((season === 'dry' || season === 'all') && dryGrid) {
            dryGrid.innerHTML += cardHTML;
            renderedCount++;
        }

        // Fallback: If farm didn't match any specific category/season rule, show it under Popular Grid
        if (renderedCount === 0 && popularGrid) {
            popularGrid.innerHTML += cardHTML;
        }
    });
}

// Helper to generate farm card HTML
function createFarmCardHTML(farm) {
    const images = Array.isArray(farm.images) ? farm.images : [];
    const imageSrc = images.length > 0 ? images[0] : 'images/default-farm.jpg';
    
    let cropsList = '';
    if (Array.isArray(farm.crops)) {
        cropsList = farm.crops.join(", ");
    } else if (typeof farm.crops === 'string') {
        cropsList = farm.crops;
    } else {
        fillGrid("nearby-farms-grid", [], false, "Press \"Use My Location\" to see the farms closest to you.");
    }

    const flagged = farms.filter((f) => f.category === "popular");
    fillGrid("popular-farms-grid", flagged.length || searching ? flagged : farms.slice(0, 3));

    fillGrid("wet-season-grid", farms.filter((f) => ["wet", "all"].includes(f.season)));
    fillGrid("dry-season-grid", farms.filter((f) => ["dry", "all"].includes(f.season)));
}

function filterFarms(query) {
    const q = query.toLowerCase().trim();
    if (!q) return allFarms;
    return allFarms.filter((f) =>
        [f.name, f.province, f.location, f.crops.join(" ")].join(" ").toLowerCase().includes(q)
    );
}

function locateUser() {
    const status = $("#location-status");
    if (!navigator.geolocation) {
        status.textContent = "Your browser doesn't support location.";
        return;
    }
    status.textContent = "Finding your location...";
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            status.textContent = "Showing the farms closest to you.";
            renderFarmsGrid(filterFarms($("#farm-search-input")?.value || ""));
        },
        () => { status.textContent = "We couldn't get your location. Please allow location access and try again."; }
    );
}