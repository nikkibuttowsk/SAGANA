document.addEventListener("DOMContentLoaded", () => {
    $("#farm-registration-form")?.addEventListener("submit", handleFarmRegistration);
});

async function handleFarmRegistration(e) {
    e.preventDefault();
    const form = e.currentTarget;

    if (form.elements.website?.value) return;   
    if (!form.reportValidity()) return;         

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;                    

    const get = (id) => $(`#${id}`).value.trim();
    const lat = parseFloat(get("reg-lat"));
    const lng = parseFloat(get("reg-lng"));
    const imageUrl = get("reg-image-url");
    const crops = get("reg-crops").split(",").map((c) => c.trim()).filter(Boolean);

    try {
        await AppController.registerNewFarm({
            name: get("reg-farm-name"),
            province: get("reg-province"),
            location: get("reg-location"),
            admin_email: get("reg-admin-email"),
            entrance_fee: Number(get("reg-entrance-fee")) || 0,
            crops,
            season: get("reg-season"),
            bearing_season: get("reg-bearing-season") || "All Season",
            hours: get("reg-hours") || "8:00 AM - 5:00 PM",
            description: get("reg-description") || "Welcome to our fruit farm experience!",
            latitude: Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lng) ? lng : null,
            images: /^https:\/\//i.test(imageUrl) ? [imageUrl] : ["images/default-farm.jpg"]
        });

        form.replaceChildren(
            h("section", { role: "status" },
                h("h2", { text: "Thank you!" }),
                h("p", { text: "Your farm listing was submitted." }),
                h("p", {}, h("a", { class: "btn btn-primary", href: "farm-list.html", text: "Browse farms" }))));
    } catch (err) {
        console.error("Farm registration error:", err);
        alert("We couldn't submit your farm: " + err.message);
        button.disabled = false;
    }
}