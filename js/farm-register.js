document.addEventListener("DOMContentLoaded", () => {
    const regForm = document.getElementById("farm-registration-form");
    if (regForm) {
        regForm.addEventListener("submit", handleFarmRegistration);
    }

    const anotherBtn = document.getElementById("register-another");
    if (anotherBtn) {
        anotherBtn.addEventListener("click", showForm);
    }
});

function showError(message) {
    const box = document.getElementById("form-error");
    box.textContent = message;
    box.hidden = !message;
}

function showSubmittedBanner(farmName, email) {
    document.getElementById("submitted-farm-name").textContent = farmName;
    document.getElementById("submitted-email").textContent = email;

    document.getElementById("farm-registration-form").hidden = true;

    const banner = document.getElementById("submission-banner");
    banner.hidden = false;
    banner.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showForm() {
    const form = document.getElementById("farm-registration-form");
    form.reset();
    form.hidden = false;
    document.getElementById("submission-banner").hidden = true;
    showError("");
    document.getElementById("reg-farm-name").focus();
}

async function handleFarmRegistration(e) {
    e.preventDefault();
    showError("");

    const name = document.getElementById("reg-farm-name").value.trim();
    const province = document.getElementById("reg-province").value.trim();
    const location = document.getElementById("reg-location").value.trim();
    const adminEmail = document.getElementById("reg-admin-email").value.trim();
    const entranceFee = parseFloat(document.getElementById("reg-entrance-fee").value || "0");

    // Parse comma-separated crops into an Array
    const cropsInput = document.getElementById("reg-crops").value;
    const cropsArray = cropsInput.split(",").map(item => item.trim()).filter(Boolean);

    const season = document.getElementById("reg-season").value;
    const bearingSeason = document.getElementById("reg-bearing-season").value.trim();
    const hours = document.getElementById("reg-hours").value.trim();
    const description = document.getElementById("reg-description").value.trim();

    const lat = parseFloat(document.getElementById("reg-lat").value || "0");
    const lng = parseFloat(document.getElementById("reg-lng").value || "0");
    const imageUrl = document.getElementById("reg-image-url").value.trim() || "images/default-farm.jpg";

    if (!name || !province || !location || !adminEmail || cropsArray.length === 0) {
        showError("Please fill out all required fields.");
        return;
    }

    const submitBtn = document.getElementById("submit-btn");
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    // Insert payload into Supabase PostgreSQL 'farms' table
    const { error } = await supabase
        .from("farms")
        .insert([
            {
                name: name,
                province: province,
                location: location,
                admin_email: adminEmail,
                entrance_fee: entranceFee,
                crops: cropsArray,
                season: season,
                category: "popular",
                bearing_season: bearingSeason || "All Season",
                hours: hours || "8:00 AM - 5:00 PM",
                description: description || "Welcome to our fruit farm experience!",
                latitude: lat || null,
                longitude: lng || null,
                images: [imageUrl]
                // status: "pending"   // <- uncomment once your 'farms' table has a 'status' column
            }
        ]);

    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;

    if (error) {
        console.error("Supabase Farm Registration Error:", error);
        showError("Failed to register farm: " + error.message);
        return;
    }

    showSubmittedBanner(name, adminEmail);
}