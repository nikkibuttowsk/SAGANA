const IN_PAGES_FOLDER = location.pathname.includes("/pages/");
const ASSET_ROOT = IN_PAGES_FOLDER ? "../" : "";  
const PAGES_ROOT = IN_PAGES_FOLDER ? "" : "pages/"; 
const DEFAULT_IMAGE = `${ASSET_ROOT}images/default-farm.jpg`;
const API_URL = `${ASSET_ROOT}api.php`;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const getParam = (name) => new URLSearchParams(location.search).get(name);

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}

function assetUrl(path) {
    if (typeof path !== "string" || !path) return DEFAULT_IMAGE;
    if (/^https:\/\//i.test(path)) return path;
    if (/^[\w./-]+$/.test(path) && !path.includes("..")) return ASSET_ROOT + path.replace(/^\/+/, "");
    return DEFAULT_IMAGE;
}

function mapsUrl(farm) {
    if (farm.latitude !== null && farm.longitude !== null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${farm.name} ${farm.location}`)}`;
}

function distanceKm(lat1, lng1, lat2, lng2) {
    const rad = (deg) => (deg * Math.PI) / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
        + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value === true ? "" : value);
    }
    node.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
    return node;
}

function createFarmCard(farm, km = null) {
    return h("article", { class: "farm-card" },
        h("a", { href: `${PAGES_ROOT}farm.html?id=${encodeURIComponent(farm.id)}` },
            h("img", { src: assetUrl(farm.getCoverPhoto()), alt: "", loading: "lazy" }),
            h("div", { class: "card-info" },
                h("h3", { text: farm.name }),
                h("p", { class: "location", text: farm.location }),
                h("span", { class: "tag", text: farm.getFormattedCrops() }),
                km === null ? null : h("p", { class: "distance", text: `${km.toFixed(1)} km away` }))));
}

document.addEventListener("error", (e) => {
    const img = e.target;
    if (img.tagName === "IMG" && !img.dataset.fallbackUsed) {
        img.dataset.fallbackUsed = "1";
        img.src = DEFAULT_IMAGE;
    }
}, true);
