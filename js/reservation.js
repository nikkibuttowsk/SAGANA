let selectedFarm = null;   
let selectedSlot = "";

const idempotencyKey = ReservationModel.newKey();

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = $("#visit-date");

    if (typeof flatpickr === "function") {
        flatpickr(dateInput, { minDate: "today", maxDate: new Date().fp_incr(180), dateFormat: "Y-m-d" });
    } else {
        dateInput.type = "date";
        dateInput.readOnly = false;
        dateInput.min = new Date().toISOString().slice(0, 10);
    }

    const slotButtons = $$(".slot-btn");
    slotButtons.forEach((btn) => btn.addEventListener("click", () => {
        slotButtons.forEach((b) => {
            b.classList.toggle("selected", b === btn);
            b.setAttribute("aria-pressed", String(b === btn));
        });
        selectedSlot = btn.dataset.slot;
        $("#selected-slot").value = selectedSlot;
    }));

    initializeFarmSelection();
});

const createSelectedFarmCard = (farm) =>
    h("div", { class: "selected-farm-card" },
        h("img", { src: assetUrl(farm.getCoverPhoto()), alt: "" }),
        h("div", {},
            h("h2", { text: farm.name }),
            h("p", { text: `${farm.location} \u2022 Crops: ${farm.getFormattedCrops()}` })),
        h("a", { class: "change-farm-btn", href: "farm-list.html", text: "Change farm" }));

async function initializeFarmSelection() {
    const container = $("#farm-selection-container");
    if (!container) return;

    let farms;
    try {
        farms = await FarmService.getAllFarms();
    } catch (err) {
        console.error(err);
        container.replaceChildren(
            h("p", { class: "error-msg", role: "alert", text: "We couldn't load the farms. Please refresh the page." }));
        return;
    }

    // Case A: the visitor came from a farm page (?farmId=...)
    const wantedId = getParam("farmId") || getParam("id");
    selectedFarm = farms.find((f) => String(f.id) === String(wantedId)) || null;
    if (selectedFarm) {
        container.replaceChildren(createSelectedFarmCard(selectedFarm));
        return;
    }

    // Case B: came from the navbar. no URL passed.
    const select = h("select", { id: "farm-dropdown", class: "form-select full-width" },
        new Option("Choose a farm", ""),
        ...farms.map((f) => new Option(`${f.name} (${f.location})`, f.id)));
    select.addEventListener("change", (e) => {
        // option values are strings, so compare as strings
        selectedFarm = farms.find((f) => String(f.id) === e.target.value) || null;
    });
    container.replaceChildren(
        h("div", { class: "farm-select-dropdown-box" },
            h("label", { for: "farm-dropdown" }, h("strong", { text: "Select a farm to visit:" })),
            select));
}

function showError(message) {
    let box = $("#form-error");
    if (!box) {
        box = document.createElement("p");
        box.id = "form-error";
        box.className = "error-msg";
        box.setAttribute("role", "alert");
    }
    
    const actions = $(".step-panel.active .step-actions");
    if (actions) actions.before(box);
    else $("#multi-step-reservation-form").prepend(box);

    box.textContent = message;
    box.hidden = !message;
    if (message) box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function nextStep(stepNumber) {
    showError("");

    if (stepNumber === 2) {
        if (!selectedFarm) return showError("Please choose a farm.");
        if (!$("#visit-date").value) return showError("Please choose a visit date.");
        if (!selectedSlot) return showError("Please choose a time slot.");
    }

    $$(".step-panel").forEach((panel) => panel.classList.remove("active"));
    $(`#step-${stepNumber}`).classList.add("active");

    $$(".step-item").forEach((item, index) => {
        const isCurrent = index + 1 === stepNumber;
        item.classList.toggle("active", isCurrent);
        if (isCurrent) item.setAttribute("aria-current", "step");
        else item.removeAttribute("aria-current");
    });
}

async function submitReservation() {
    showError("");

    if (!selectedFarm) {
        const dropdown = $("#farm-dropdown");
        if (dropdown && dropdown.value) {
            const farmId = dropdown.value;
            selectedFarm = { id: farmId, name: dropdown.options[dropdown.selectedIndex]?.text || "Selected Farm" };
        }
    }

    const invalid = $$("#step-2 input, #step-2 select").find((field) => !field.checkValidity());
    if (invalid) {
        const label = invalid.labels?.[0]?.textContent || invalid.name || "a field";
        showError(`Please check "${label}": ${invalid.validationMessage}`);
        invalid.focus();
        return;
    }

    const button = $("#step-2 .btn-primary");
    button.disabled = true;

    try {
        const reservation = await AppController.submitReservation({
            farm_id: selectedFarm?.id,
            visitor_name: $("#visitor-name").value,
            visitor_email: $("#visitor-email").value,
            visitor_phone: $("#visitor-phone").value,
            visit_date: $("#visit-date").value,
            time_slot: selectedSlot,
            guest_count: $("#visitor-count").value,
            idempotency_key: idempotencyKey
        });
        showTicket(reservation);
        nextStep(3);
    } catch (err) {
        console.error("Reservation failed:", err);
        showError(err.message);
        button.disabled = false;
    }
}

function showTicket(reservation) {
    $("#ticket-farm").textContent = selectedFarm.name;
    $("#ticket-name").textContent = reservation.visitorName;
    $("#ticket-date").textContent = new Date(`${reservation.visitDate}T00:00`).toLocaleDateString("en-PH", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    $("#ticket-slot").textContent = reservation.timeSlot;
    $("#ticket-guests").textContent = reservation.guestCount;
    const ref = $("#ticket-ref");
    if (ref) ref.textContent = reservation.idempotencyKey.slice(0, 8).toUpperCase();

    const qrImage = $(".ticket-qr img");
    if (!qrImage) return;
    if (typeof qrcode === "function") {
        const qr = qrcode(0, "M");
        qr.addData(`SAGANA-TICKET:${reservation.idempotencyKey}`);
        qr.make();
        qrImage.src = qr.createDataURL(5, 2);
        qrImage.alt = "Check-in QR code for your reservation";
    } else {
        qrImage.hidden = true;
    }
}