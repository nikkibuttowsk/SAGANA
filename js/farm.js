document.addEventListener("DOMContentLoaded", () => {
    // visual media carousel logic
    const slides = document.querySelectorAll(".carousel-slide");
    let activeIdx = 0;

    document.getElementById("media-next")?.addEventListener("click", () => {
        slides[activeIdx].classList.remove("active");
        activeIdx = (activeIdx + 1) % slides.length;
        slides[activeIdx].classList.add("active");
    });

    document.getElementById("media-prev")?.addEventListener("click", () => {
        slides[activeIdx].classList.remove("active");
        activeIdx = (activeIdx - 1 + slides.length) % slides.length;
        slides[activeIdx].classList.add("active");
    });

    // chat bot ---> need to integrate gemini chat pa
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatLog = document.getElementById("chat-log");

    chatForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = chatInput.value.trim();
        if (!query) return;

        // Render user message
        const userMsg = document.createElement("div");
        userMsg.className = "msg user-msg";
        userMsg.textContent = query;
        chatLog.appendChild(userMsg);

        chatInput.value = "";

        // Automated reply response simulation
        setTimeout(() => {
            const botMsg = document.createElement("div");
            botMsg.className = "msg bot-msg";
            botMsg.textContent = "Thanks for reaching out! Our team has logged your question and will reply shortly.";
            chatLog.appendChild(botMsg);
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 600);
    });
});

document.addEventListener("DOMContentLoaded", () => {
    loadSingleFarmDetails();
    setupCarouselControls();
});

async function loadSingleFarmDetails() {
    // 1. Read 'id' from URL parameters (e.g. farm.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const farmId = urlParams.get('id');

    if (!farmId) {
        console.warn("No farm ID specified in URL.");
        return;
    }

    // 2. Fetch specific farm row from PostgreSQL
    const { data: farm, error } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

    if (error || !farm) {
        console.error("Error loading farm details:", error);
        return;
    }

    // 3. Inject Database data into the HTML elements
    document.title = `${farm.name} - SAGANA`;
    
    const titleEl = document.querySelector(".farm-info-sidebar h1");
    if (titleEl) titleEl.textContent = farm.name;

    const locEl = document.querySelector(".location-sub");
    if (locEl) locEl.textContent = farm.location;

    const descEl = document.querySelector(".sidebar-card p");
    if (descEl) descEl.textContent = farm.description;

    // Update Details List (Crops, Season, Hours, Fee)
    const dds = document.querySelectorAll(".info-list dd");
    if (dds.length >= 4) {
        dds[0].textContent = Array.isArray(farm.crops) ? farm.crops.join(", ") : farm.crops;
        dds[1].textContent = farm.bearing_season || 'N/A';
        dds[2].textContent = farm.hours || 'N/A';
        dds[3].textContent = farm.entrance_fee ? `₱${farm.entrance_fee} / Person` : 'Free';
    }

    // Update Reserve button redirect URL with current farmId
    const reserveBtn = document.querySelector(".farm-info-sidebar .btn-primary");
    if (reserveBtn) {
        reserveBtn.href = `reservation.html?farmId=${farm.id}`;
    }

    // Update Map link
    const mapsBtn = document.querySelector(".farm-info-sidebar .btn-outline");
    if (mapsBtn && farm.latitude && farm.longitude) {
        mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${farm.latitude},${farm.longitude}`;
    }

    // 4. Inject Video and Photos into 75% Media Carousel
    const wrapper = document.querySelector(".carousel-wrapper");
    if (wrapper) {
        let carouselContent = "";

        // Video slide
        if (farm.video_url) {
            carouselContent += `
                <div class="carousel-slide active" data-type="video">
                    <video controls poster="${farm.images?.[0] || ''}">
                        <source src="${farm.video_url}" type="video/mp4">
                    </video>
                    <span class="slide-badge">Video Walkthrough</span>
                </div>
            `;
        }

        // Image slides
        if (farm.images && farm.images.length > 0) {
            farm.images.forEach((imgUrl, index) => {
                const isActive = (!farm.video_url && index === 0) ? 'active' : '';
                carouselContent += `
                    <div class="carousel-slide ${isActive}" data-type="photo">
                        <img src="${imgUrl}" alt="${farm.name}">
                    </div>
                `;
            });
        }

        wrapper.innerHTML = carouselContent;
    }
}

// Media Carousel controls logic
function setupCarouselControls() {
    let activeIdx = 0;

    document.getElementById("media-next")?.addEventListener("click", () => {
        const slides = document.querySelectorAll(".carousel-slide");
        if (!slides.length) return;
        slides[activeIdx].classList.remove("active");
        activeIdx = (activeIdx + 1) % slides.length;
        slides[activeIdx].classList.add("active");
    });

    document.getElementById("media-prev")?.addEventListener("click", () => {
        const slides = document.querySelectorAll(".carousel-slide");
        if (!slides.length) return;
        slides[activeIdx].classList.remove("active");
        activeIdx = (activeIdx - 1 + slides.length) % slides.length;
        slides[activeIdx].classList.add("active");
    });
}