document.addEventListener("DOMContentLoaded", () => {
    fetchFarmsFromSupabase();

    // Attach search event listener
    const searchInput = document.getElementById("farm-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterFarmsUI(query);
        });
    }
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
        renderFarmsGrid(allFarmsData);
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

    if (!farms || farms.length === 0) {
        if (popularGrid) popularGrid.innerHTML = "<p>No farms found.</p>";
        return;
    }

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
        cropsList = 'Fresh Produce';
    }

    const farmName = farm.name || 'Unnamed Farm';
    const farmLocation = farm.location || farm.province || 'Philippines';
    const farmId = farm.id || '';

    return `
        <article class="farm-card" data-name="${farmName.toLowerCase()}" data-province="${farmLocation.toLowerCase()}" data-crops="${cropsList.toLowerCase()}">
            <a href="farm.html?id=${farmId}">
                <img src="${imageSrc}" alt="${farmName}" onerror="this.src='images/default-farm.jpg'">
                <div class="card-info">
                    <h3>${farmName}</h3>
                    <p class="location">${farmLocation}</p>
                    <span class="tag">${cropsList}</span>
                </div>
            </a>
        </article>
    `;
}

// Search bar filter helper
function filterFarmsUI(query) {
    if (!query) {
        renderFarmsGrid(allFarmsData);
        return;
    }

    const filtered = allFarmsData.filter(farm => {
        const nameMatch = (farm.name || '').toLowerCase().includes(query);
        const provinceMatch = (farm.province || farm.location || '').toLowerCase().includes(query);
        
        let cropsMatch = false;
        if (Array.isArray(farm.crops)) {
            cropsMatch = farm.crops.join(" ").toLowerCase().includes(query);
        } else if (farm.crops) {
            cropsMatch = String(farm.crops).toLowerCase().includes(query);
        }

        return nameMatch || provinceMatch || cropsMatch;
    });

    renderFarmsGrid(filtered);
}