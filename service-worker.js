// service-worker.js

const CACHE_NAME = "weather-pwa-v1";

const STATIC_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./main.js",
    "./api.js",
    "./render.js",
    "./weather.js",
    "./manifest.json",
    "./icon.png",
    "./icons/clear-day.svg",
    "./icons/drizzle.svg",
    "./icons/fog.svg",
    "./icons/hail.svg",
    "./icons/overcast-day.svg",
    "./icons/rain.svg",
    "./icons/sleet.svg",
    "./icons/snow.svg",
    "./icons/thunderstorms-rain.svg",
    "./icons/thunderstorms-snow.svg",
];

// Встановлення — кешуємо всі статичні файли
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES))
    );
    self.skipWaiting(); // активуємо одразу без очікування
});

// Активація — видаляємо старий кеш
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim(); // перехоплюємо всі вкладки одразу
});

// Fetch — стратегія залежить від типу запиту
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // API запити — завжди мережа, при помилці — заглушка
    if (url.hostname === "api.open-meteo.com" || url.hostname === "api.bigdatacloud.net") {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } }
                );
            })
        );
        return;
    }

    // Статичні файли — спочатку кеш
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});