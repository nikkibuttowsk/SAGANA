document.addEventListener("DOMContentLoaded", () => {
    const regForm = document.getElementById("farm-registration-form");
    if (regForm) {
        regForm.addEventListener("submit", handleFarmRegistration);
    }
});

async function handleFarmRegistration(e) {
    e.preventDefault();

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
    const imageUrl = document.getElementById("reg-image-url").value.trim() || 'images/default-farm.jpg';

    if (!name || !province || !location || !adminEmail || cropsArray.length === 0) {
        alert("Please fill out all required fields.");
        return;
    }

    // Insert payload into Supabase PostgreSQL 'farms' table
    const { data, error } = await supabase
        .from('farms')
        .insert([
            {
                name: name,
                province: province,
                location: location,
                admin_email: adminEmail,
                entrance_fee: entranceFee,
                crops: cropsArray,
                season: season,
                category: 'popular', // Default new listings to popular/featured
                bearing_season: bearingSeason || 'All Season',
                hours: hours || '8:00 AM - 5:00 PM',
                description: description || 'Welcome to our fruit farm experience!',
                latitude: lat || null,
                longitude: lng || null,
                images: [imageUrl]
            }
        ])
        .select();

    if (error) {
        console.error("Supabase Farm Registration Error:", error);
        alert("Failed to register farm: " + error.message);
        return;
    }

    alert(`🎉 Success! "${name}" has been registered on SAGANA. Redirecting to farm catalog...`);
    window.location.href = "farm-list.html";
}