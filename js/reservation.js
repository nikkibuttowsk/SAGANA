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
    // Get URL param if redirected from a specific farm page
    const urlParams = new URLSearchParams(window.location.search);
    const farmId = urlParams.get('farmId');

    const name = document.getElementById("visitor-name").value;
    const email = document.getElementById("visitor-email").value;
    const phone = document.getElementById("visitor-phone").value;
    const date = document.getElementById("visit-date").value;
    const slot = document.getElementById("selected-slot").value;
    const guests = parseInt(document.getElementById("visitor-count").value, 10);

    if (!name || !email || !phone || !date || !slot) {
        alert("Please complete all required reservation details.");
        return;
    }

    // Insert payload directly into Supabase PostgreSQL
    const { data, error } = await supabase
        .from('reservations')
        .insert([
            {
                farm_id: farmId || null, // Optional if no farm selected
                visitor_name: name,
                visitor_email: email,
                visitor_phone: phone,
                visit_date: date,
                time_slot: slot,
                guest_count: guests
            }
        ])
        .select();

    if (error) {
        console.error("Supabase Error:", error);
        alert("Reservation failed: " + error.message);
        return;
    }

    // Populate Digital Ticket (Step 3 UI)
    document.getElementById("ticket-name").textContent = name;
    document.getElementById("ticket-date").textContent = date;
    document.getElementById("ticket-slot").textContent = slot;
    document.getElementById("ticket-guests").textContent = guests;

    // Advance UI to Digital Ticket confirmation tab
    nextStep(3);
}