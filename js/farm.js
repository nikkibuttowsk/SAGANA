/* farm.js — farm details pop-up (farm.html)
   Loads the farm named in the address (?id=…), fills the pop-up, and only then opens it.
   If there is no id, or the farm can't be found, the pop-up stays closed and a note is shown. */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

document.addEventListener("DOMContentLoaded", () => {
    setupCarouselControls();
    setupChat();
    loadSingleFarmDetails();
});

/* ---------- small helpers ---------- */
const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// Show the "no farm" note with a message (the pop-up stays closed)
function showNoFarm(message) {
    const note = document.querySelector(".no-farm");
    if (note && message) note.querySelector("p").textContent = message;
}

// Turn text like "November to May" / "Nov - Apr" / "All year" into 12 on/off flags
function parseSeason(text) {
    const flags = new Array(12).fill(false);
    const s = String(text || "").toLowerCase();
    if (/year[\s-]*round|all year|whole year|yearly/.test(s)) return flags.fill(true);

    const found = [];
    const re = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/g;
    let m;
    while ((m = re.exec(s))) found.push(MONTHS.indexOf(m[1]));

    if (found.length === 2 && /\bto\b|-|–|until|through/.test(s)) {
        for (let i = found[0]; ; i = (i + 1) % 12) {   // a range, wrapping past December
            flags[i] = true;
            if (i === found[1]) break;
        }
    } else {
        found.forEach((i) => (flags[i] = true));
    }
    return flags;
}

/* ---------- load the farm ---------- */
async function loadSingleFarmDetails() {
    const params = new URLSearchParams(window.location.search);
    const farmId = params.get("id") || params.get("farmId");

    if (!farmId) {
        console.warn("No farm ID specified in URL.");
        return;                                   // nothing selected: no pop-up
    }

    const { data: farm, error } = await supabase
        .from("farms")
        .select("*")
        .eq("id", farmId)
        .single();

    if (error || !farm) {
        console.error("Error loading farm details:", error);
        showNoFarm("We couldn't find that farm. Pick one from the list instead.");
        return;
    }

    document.title = `${farm.name} - SAGANA`;

    // name, place, description
    $("farm-title").textContent = farm.name;
    const place = farm.location || "";
    const province = farm.province || "";
    $("farm-location-sub").textContent =
        province && !place.toLowerCase().includes(province.toLowerCase()) ? [place, province].filter(Boolean).join(", ") : (place || province);
    $("farm-description").textContent = farm.description || "Come and visit this farm for fresh, locally grown fruit.";

    // optional extras: shown only when the farm has the data
    const type = farm.farm_type || farm.type;
    $("farm-type").hidden = !type;
    if (type) $("farm-type").textContent = type;

    const rating = farm.rating;
    $("farm-rating").hidden = !rating;
    if (rating) {
        const reviews = farm.reviews_count ?? farm.review_count;
        $("farm-rating-value").textContent = Number(rating).toFixed(1);
        $("farm-review-count").textContent = reviews ? ` · ${reviews} reviews` : "";
    }

    // info rows
    $("farm-hours").textContent = farm.hours || "N/A";
    $("farm-crops").textContent = Array.isArray(farm.crops) ? farm.crops.join(", ") : (farm.crops || "Fresh produce");
    $("farm-season").textContent = farm.bearing_season || "N/A";

    const phone = farm.phone || farm.contact_number;
    document.querySelectorAll('[data-row="phone"]').forEach((el) => (el.hidden = !phone));
    if (phone) {
        $("farm-phone").textContent = phone;
        $("farm-phone").href = `tel:${String(phone).replace(/[^\d+]/g, "")}`;
    }

    $("farm-place").textContent = farm.location || farm.province || "";
    $("farm-directions").href = (farm.latitude && farm.longitude)
        ? `https://www.google.com/maps/search/?api=1&query=${farm.latitude},${farm.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${farm.name} ${farm.location || ""}`)}`;

    // harvest-season chips
    const flags = parseSeason(farm.bearing_season);
    $("season-section").hidden = !flags.some(Boolean);
    // start the chips at the first harvest month (Nov, Dec, Jan … like the design)
    const start = flags.every(Boolean) || !flags.some(Boolean) ? 0 : flags.findIndex((on, i) => on && !flags[(i + 11) % 12]);
    document.querySelectorAll("#season-chips li").forEach((li, k) => {
        const m = (start + k) % 12;
        li.textContent = MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1);
        li.classList.toggle("on", flags[m]);
    });

    // activities (only if the farm has a list)
    const activities = Array.isArray(farm.activities) ? farm.activities : [];
    $("activities-section").hidden = activities.length === 0;
    $("activity-list").innerHTML = activities.map((a) => `<li>${escapeHTML(a)}</li>`).join("");

    // price + booking link
    $("farm-price").textContent = farm.entrance_fee ? `₱${farm.entrance_fee}` : "Free";
    $("farm-price-unit").hidden = !farm.entrance_fee;
    $("book-btn").href = `reservation.html?farmId=${farm.id}`;

    // photos + video
    const wrapper = document.querySelector(".carousel-wrapper");
    if (wrapper) {
        let html = "";
        const images = Array.isArray(farm.images) ? farm.images : [];

        if (farm.video_url) {
            html += `
                <div class="carousel-slide active" data-type="video">
                    <video controls poster="${escapeHTML(images[0] || "")}">
                        <source src="${escapeHTML(farm.video_url)}" type="video/mp4">
                    </video>
                    <span class="slide-badge">Video Walkthrough</span>
                </div>`;
        }
        images.forEach((url, i) => {
            const active = (!farm.video_url && i === 0) ? "active" : "";
            html += `
                <div class="carousel-slide ${active}" data-type="photo">
                    <img src="${escapeHTML(url)}" alt="${escapeHTML(farm.name)}" onerror="this.src='images/default-farm.jpg'">
                </div>`;
        });
        if (!html) {
            html = `
                <div class="carousel-slide active" data-type="photo">
                    <img src="../images/default-farm.jpg" alt="${escapeHTML(farm.name)}">
                </div>`;
        }
        wrapper.innerHTML = html;

        const many = wrapper.querySelectorAll(".carousel-slide").length > 1;
        $("media-prev").hidden = $("media-next").hidden = !many;
    }

    setupFarmNav(farm.id);

    // everything is filled in: now show the pop-up
    window.openFarmModal?.();
}

/* ---------- previous / next farm (the big arrows outside the pop-up) ---------- */
async function setupFarmNav(currentId) {
    const prev = $("farm-prev");
    const next = $("farm-next");
    if (!prev || !next) return;
    try {
        const { data, error } = await supabase.from("farms").select("id").order("name", { ascending: true });
        if (error || !Array.isArray(data) || data.length < 2) return;     // nothing to move to: arrows stay hidden
        const ids = data.map((f) => String(f.id));
        let i = ids.indexOf(String(currentId));
        if (i < 0) return;
        const go = (step) => {
            window.location.href = `farm.html?id=${encodeURIComponent(ids[(i + step + ids.length) % ids.length])}`;
        };
        prev.onclick = () => go(-1);
        next.onclick = () => go(1);
        prev.hidden = next.hidden = false;
        document.addEventListener("keydown", (e) => {            // keyboard: ← → move between farms
            if (e.target.closest("input, textarea, video")) return;
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
        });
    } catch (err) {
        console.warn("Could not load the farm list for the arrows:", err);
    }
}

/* ---------- photo / video arrows (inside the picture) ---------- */
function setupCarouselControls() {
    function step(direction) {
        const slides = document.querySelectorAll(".carousel-slide");
        if (slides.length < 2) return;
        let current = Array.prototype.findIndex.call(slides, (s) => s.classList.contains("active"));
        if (current < 0) current = 0;
        slides[current].querySelector("video")?.pause();       // stop the video when leaving it
        slides[current].classList.remove("active");
        slides[(current + direction + slides.length) % slides.length].classList.add("active");
    }
    $("media-next")?.addEventListener("click", () => step(1));
    $("media-prev")?.addEventListener("click", () => step(-1));
}

/* ---------- chat (placeholder until the Gemini chat is connected) ---------- */
function setupChat() {
    const chatForm = $("chat-form");
    const chatInput = $("chat-input");
    const chatLog = $("chat-log");

    chatForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        const userMsg = document.createElement("div");
        userMsg.className = "msg user-msg";
        userMsg.textContent = query;
        chatLog.appendChild(userMsg);
        chatInput.value = "";
        chatLog.scrollTop = chatLog.scrollHeight;

        setTimeout(() => {
            const botMsg = document.createElement("div");
            botMsg.className = "msg bot-msg";
            botMsg.textContent = "Thanks for reaching out! Our team has logged your question and will reply shortly.";
            chatLog.appendChild(botMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 600);
    });
}
