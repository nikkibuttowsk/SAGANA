let selectedFarmId = null;
let selectedFarmName = "Selected Farm";

document.addEventListener("DOMContentLoaded", () => {
    // Flatpickr Datepicker
    if (typeof flatpickr !== "undefined") {
        flatpickr("#visit-date", {
            minDate: "today",
            dateFormat: "Y-m-d"
        });
    }

    // Time slot selection
    const slotBtns = document.querySelectorAll(".slot-btn");
    slotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            slotBtns.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            document.getElementById("selected-slot").value = btn.dataset.slot;
        });
    });

    // Load Farm Data from Supabase Database
    initializeFarmSelection();
});

async function initializeFarmSelection() {
    const container = document.getElementById("farm-selection-container");
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const farmIdParam = urlParams.get('farmId') || urlParams.get('id');

    // Case A: reservation from a specific farm page
    if (farmIdParam) {
        const { data: farm, error } = await supabase
            .from('farms')
            .select('*')
            .eq('id', farmIdParam)
            .single();

        if (!error && farm) {
            selectedFarmId = farm.id;
            selectedFarmName = farm.name;

            const imageSrc = (farm.images && farm.images.length > 0) ? farm.images[0] : 'images/default-farm.jpg';
            const cropsList = Array.isArray(farm.crops) ? farm.crops.join(", ") : farm.crops;

            container.innerHTML = `
                <div class="selected-farm-card">
                    <img src="${imageSrc}" alt="${farm.name}" onerror="this.src='images/default-farm.jpg'">
                    <div>
                        <h2>${farm.name}</h2>
                        <p>${farm.location || farm.province} &bull; Crops: ${cropsList}</p>
                    </div>
                    <a href="farm-list.html" class="change-farm-btn">Change Farm</a>
                </div>
            `;
            return;
        }
    }

    // Case B: "Reservation" from the Navbar (No URL ID passed)
    const { data: farms, error } = await supabase
        .from('farms')
        .select('id, name, location, province');

    if (error || !farms || farms.length === 0) {
        container.innerHTML = `<p class="error-msg">Failed to load farms list. Please refresh.</p>`;
        return;
    }

    selectedFarmId = farms[0].id;
    selectedFarmName = farms[0].name;

    let optionsHTML = farms.map(f => 
        `<option value="${f.id}">${f.name} (${f.location || f.province})</option>`
    ).join('');

    container.innerHTML = `
        <div class="farm-select-dropdown-box">
            <label for="farm-dropdown"><strong>Select a Farm to Visit:</strong></label>
            <select id="farm-dropdown" class="form-select full-width">
                ${optionsHTML}
            </select>
        </div>
    `;

    document.getElementById("farm-dropdown")?.addEventListener("change", (e) => {
        selectedFarmId = e.target.value;
        const chosenFarm = farms.find(f => f.id === selectedFarmId);
        if (chosenFarm) {
            selectedFarmName = chosenFarm.name;
        }
    });
}

function nextStep(stepNumber) {
    if (stepNumber === 2) {
        const date = document.getElementById("visit-date").value;
        const slot = document.getElementById("selected-slot").value;
        if (!date || !slot) {
            alert("Please select both a visit date and a time slot to continue.");
            return;
        }
    }

    document.querySelectorAll(".step-panel").forEach(panel => panel.classList.remove("active"));
    document.getElementById(`step-${stepNumber}`).classList.add("active");

    document.querySelectorAll(".step-item").forEach((item, index) => {
        item.classList.toggle("active", index + 1 === stepNumber);
    });
}

async function submitReservation() {
    const name = document.getElementById("visitor-name")?.value;
    const email = document.getElementById("visitor-email")?.value;
    const phone = document.getElementById("visitor-phone")?.value;
    const date = document.getElementById("visit-date")?.value;
    const slot = document.getElementById("selected-slot")?.value;
    const guests = parseInt(document.getElementById("visitor-count")?.value || "1", 10);

    if (!name || !email || !phone || !date || !slot) {
        alert("Please complete all visitor and reservation details.");
        return;
    }

    const { data, error } = await supabase
        .from('reservations')
        .insert([
            {
                farm_id: selectedFarmId,
                visitor_name: name,
                visitor_email: email,
                visitor_phone: phone,
                visit_date: date,
                time_slot: slot,
                guest_count: guests
            }
        ])
        .select();

    if (error || !data || data.length === 0) {
        console.error("Supabase Error:", error);
        alert("Reservation failed: " + (error?.message || "Unknown error"));
        return;
    }

    const newReservation = data[0];
    const reservationId = newReservation.id;

    document.getElementById("ticket-farm").textContent = selectedFarmName;
    document.getElementById("ticket-name").textContent = name;
    document.getElementById("ticket-date").textContent = date;
    document.getElementById("ticket-slot").textContent = slot;
    document.getElementById("ticket-guests").textContent = guests;

    const qrImg = document.querySelector(".ticket-qr img");
    if (qrImg) {
        const qrData = encodeURIComponent(`SAGANA-TICKET:${reservationId}`);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
    }

    nextStep(3);
}