document.addEventListener("DOMContentLoaded", () => {
    // Flatpickr Calendar initialization
    flatpickr("#visit-date", {
        inline: true,
        minDate: "today",
        dateFormat: "Y-m-d"
    });

    // Slot button selection
    const slotBtns = document.querySelectorAll(".slot-btn");
    slotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            slotBtns.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            document.getElementById("selected-slot").value = btn.dataset.slot;
        });
    });
});

function nextStep(stepNumber) {
    // Handle Step Validation
    if (stepNumber === 2) {
        const date = document.getElementById("visit-date").value;
        const slot = document.getElementById("selected-slot").value;
        if (!date || !slot) {
            alert("Please select both a date and a time slot to continue.");
            return;
        }
    }

    // Toggle panels
    document.querySelectorAll(".step-panel").forEach(panel => panel.classList.remove("active"));
    document.getElementById(`step-${stepNumber}`).classList.add("active");

    // Toggle step headers
    document.querySelectorAll(".step-item").forEach((item, index) => {
        item.classList.toggle("active", index + 1 === stepNumber);
    });
}

async function submitReservation() {
    const urlParams = new URLSearchParams(window.location.search);
    let farmId = urlParams.get('farmId') || urlParams.get('id');

    if (!farmId || farmId === "null" || farmId === "") {
        farmId = null;
    }

    const name = document.getElementById("visitor-name")?.value;
    const email = document.getElementById("visitor-email")?.value;
    const phone = document.getElementById("visitor-phone")?.value;
    const date = document.getElementById("visit-date")?.value;
    const slot = document.getElementById("selected-slot")?.value;
    const guests = parseInt(document.getElementById("visitor-count")?.value || "1", 10);

    if (!name || !email || !phone || !date || !slot) {
        alert("Please complete all required fields.");
        return;
    }

    // 1. Insert reservation into Supabase PostgreSQL
    const { data, error } = await supabase
        .from('reservations')
        .insert([
            {
                farm_id: farmId,
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
        console.error("Supabase Reservation Error:", error);
        alert("Reservation failed: " + (error?.message || "Unknown error"));
        return;
    }

    // 2. Get the Unique Database ID for this reservation
    const newReservation = data[0];
    const reservationId = newReservation.id; 

    // 3. Populate Digital Ticket Text
    document.getElementById("ticket-name").textContent = name;
    document.getElementById("ticket-date").textContent = date;
    document.getElementById("ticket-slot").textContent = slot;
    document.getElementById("ticket-guests").textContent = guests;

    // 4. Generate Unique QR Code using the Reservation ID
    const qrImageElement = document.querySelector(".ticket-qr img");
    if (qrImageElement) {
        // Encode ticket payload into QR Code URL
        const qrData = encodeURIComponent(`SAGANA-TICKET:${reservationId}`);
        qrImageElement.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;
        qrImageElement.alt = `Unique Ticket QR Code for ${reservationId}`;
    }

    // Advance wizard to Ticket step (Step 3)
    nextStep(3);
}