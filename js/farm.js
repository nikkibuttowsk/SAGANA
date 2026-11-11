let currentFarm = null;

document.addEventListener("DOMContentLoaded", async () => {
    setupChat();
    currentFarm = await FarmService.getFarmById(getParam("id"));

    if (!currentFarm) {
        $("#main-content").replaceChildren(
            h("p", { class: "error-msg", role: "alert" },
                "We couldn't find that farm. ", h("a", { href: "farm-list.html", text: "Browse all farms" })));
        return;
    }
    renderFarm(currentFarm);
    setupCarousel();
});

const setText = (id, text) => { $(`#${id}`).textContent = text; };

function renderFarm(farm) {
    document.title = `${farm.name} - SAGANA`;
    setText("farm-name", farm.name);
    setText("farm-location", farm.location);
    setText("farm-description", farm.description);
    setText("farm-crops", farm.getFormattedCrops());
    setText("farm-bearing", farm.bearingSeason);
    setText("farm-season", farm.getSeasonLabel());
    setText("farm-hours", farm.hours);
    setText("farm-fee", farm.getFormattedFee());

    // Only show activities the farm actually has (the old page showed Baguio's activities on every farm)
    if (farm.activities.length > 0) {
        $("#farm-activities").replaceChildren(...farm.activities.map((a) => h("li", { text: a })));
        $("#activities-section").hidden = false;
    }

    $("#reserve-link").href = `reservation.html?farmId=${encodeURIComponent(farm.id)}`;
    $("#maps-link").href = mapsUrl(farm);
    renderMedia(farm);
}

// media area
function renderMedia(farm) {
    const slides = [];
    const video = farm.videoUrl ? assetUrl(farm.videoUrl) : null;

    if (video && video !== DEFAULT_IMAGE) {
        slides.push(h("div", { class: "carousel-slide", "data-type": "video" },
            h("video", { controls: true, preload: "metadata", poster: assetUrl(farm.getCoverPhoto()) },
                h("source", { src: video, type: "video/mp4" })),
            h("span", { class: "slide-badge", text: "Video walkthrough" })));
    }
    farm.images.forEach((src, i) => slides.push(
        h("div", { class: "carousel-slide", "data-type": "photo" },
            h("img", { src: assetUrl(src), alt: `${farm.name} photo ${i + 1}` }))));

    $("#media-wrapper").replaceChildren(...slides);
}

function setupCarousel() {
    const slides = $$(".carousel-slide");
    if (slides.length === 0) return;

    let current = 0;
    const show = (index) => {
        slides[current].querySelector("video")?.pause(); 
        slides[current].classList.remove("active");
        current = (index + slides.length) % slides.length;
        slides[current].classList.add("active");
    };
    slides[0].classList.add("active");

    if (slides.length === 1) {
        $("#media-prev").hidden = true;
        $("#media-next").hidden = true;
        return;
    }
    $("#media-prev").addEventListener("click", () => show(current - 1));
    $("#media-next").addEventListener("click", () => show(current + 1));
}

// ---------- Ask a question ----------
function addChatMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `msg ${sender === "user" ? "user-msg" : "bot-msg"}`;
    message.textContent = text;
    const log = $("#chat-log");
    log.append(message);
    log.scrollTop = log.scrollHeight;
}

// to be replaced by AI
function answerFromFarm(question, farm) {
    const q = question.toLowerCase();
    if (/hour|open|close|schedule/.test(q)) return `Opening hours: ${farm.hours}.`;
    if (/fee|price|cost|how much|entrance|ticket/.test(q)) return `Entrance fee: ${farm.getFormattedFee()}.`;
    if (/fruit|crop|harvest|season|bear/.test(q)) return `This farm grows ${farm.getFormattedCrops()}. Bearing season: ${farm.bearingSeason}.`;
    if (/where|location|address|direction|far/.test(q)) return `We're in ${farm.location}. Use "Open in Google Maps" for directions.`;
    if (/book|reserve|visit/.test(q)) return `Use the "Reserve a visit" button on this page to book.`;
    return "I don't have that information yet. Please email sagana077@gmail.com and we'll get back to you.";
}

function setupChat() {
    $("#chat-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("#chat-input");
        const question = input.value.trim();
        if (!question) return;

        addChatMessage(question, "user");
        input.value = "";
        setTimeout(() => {
            addChatMessage(currentFarm ? answerFromFarm(question, currentFarm) : "Still loading, please try again.", "bot");
        }, 400);
    });
}

// to do: AI integration (Gemini), question to Supabase Edge Function that calls AI