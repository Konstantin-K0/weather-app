// main.js
import { fetchCityName, fetchWeather } from "./api.js";
import { renderCity, renderCurrent, renderDaily, renderHourly, renderDate } from "./render.js";
import { daysOfWeek } from "./weather.js";

const locale = navigator.language || "en-US";

const lang = navigator.language.slice(0, 2);

const days = daysOfWeek[lang] ?? daysOfWeek.en; // fallback на англійську

async function update() {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const [city, weather] = await Promise.all([
            fetchCityName(latitude, longitude, locale), // функція тепер має повертати назву
            fetchWeather(latitude, longitude), // функція тепер має повертати дані погоди
        ]);

        renderDate(locale);
        renderCity(city);
        renderCurrent(weather, lang);
        renderDaily(weather, days);
        renderHourly(0, weather);
    });
}

update();

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        update();
    }
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js");
}
