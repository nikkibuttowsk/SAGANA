let allFarms = [];
let userPos = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        allFarms = await FarmService.getAllFarms();
    } catch (err) {
        console.error("Error fetching farms:", err);
        $("#popular-farms-grid").innerHTML = `<p class="error-msg" role="alert">We couldn't load the farms. Please refresh the page.</p>`;
        return;
    }

    $("#use-location-btn")?.after(h("p", { id: "location-status", role: "status" }));

    renderFarmsGrid(allFarms);
    $("#farm-search-input")?.addEventListener("input", (e) => renderFarmsGrid(filterFarms(e.target.value)));
    $("#use-location-btn")?.addEventListener("click", locateUser);
});

function fillGrid(id, farms, withDistance = false, emptyText = "No farms to show.") {
    const grid = $(`#${id}`);
    if (!grid) return;
    grid.innerHTML = farms.length
        ? farms.map((f) => farmCardHTML(f, withDistance ? f.distanceFrom(userPos.lat, userPos.lng) : null)).join("")
        : `<p class="empty-msg">${emptyText}</p>`;
}

function renderFarmsGrid(farms) {
    const searching = Boolean($("#farm-search-input")?.value.trim());
    if (userPos) {
        const nearest = farms
            .filter((f) => f.hasLocation())
            .sort((a, b) => a.distanceFrom(userPos.lat, userPos.lng) - b.distanceFrom(userPos.lat, userPos.lng))
            .slice(0, 6);
        fillGrid("nearby-farms-grid", nearest, true);
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