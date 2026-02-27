"use strict";

const getLocation = () => {
    if (!navigator.geolocation) {
        alert("Геолокація не підтримується вашим браузером");
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
    };

    navigator.geolocation.getCurrentPosition(success, error, options);
};

const locale = navigator.language || "en-US";
const now = new Date();

const time = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

const date = now.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
});

const result = `${time} - ${date}`;

document.querySelector(".datetime").innerText = result;

const error = (err) => {
    console.warn(`Помилка геолокації (${err.code}): ${err.message}`);
};

const success = async (position) => {
    const { latitude, longitude } = position.coords;

    // Виконуємо запити (await змушує JS чекати відповіді)
    try {
        const [cityData, weatherData] = await Promise.all([
            getCityName(latitude, longitude), // функція тепер має повертати назву
            getWeather(latitude, longitude), // функція тепер має повертати дані погоди
        ]);
    } catch (err) {
        console.error("Помилка завантаження", err);
    }
};

const getCityName = async (lat, lon) => {
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${locale}`;

        const response = await fetch(url);
        const data = await response.json();

        // Вибираємо найбільш логічну назву (місто або район)
        const cityName = data.city || data.locality || "Невідомо";

        console.log(`city: ${cityName}`);

        // Оновлюємо заголовок в HTML
        document.getElementById("city-name").innerText = cityName.toUpperCase();
    } catch (err) {
        console.error("Не вдалося отримати назву міста:", err);
        document.getElementById("city-name").innerText = "ЛОКАЦІЯ";
    }
};

const getWeather = async (lat, lon) => {
    try {
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,

            // Поточна погода
            current_weather: "true",

            // Погодинний прогноз
            hourly: "temperature_2m,precipitation_probability,wind_speed_10m,weather_code",

            // Денний прогноз (14 днів)
            daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",

            forecast_days: "14",
            timezone: "auto",
        });

        const url = `https://api.open-meteo.com/v1/forecast?${params}`;

        const response = await fetch(url);

        if (!response.ok) throw new Error("Помилка сервісу Open-Meteo");

        const data = await response.json();

        const temp = Math.round(data.current_weather.temperature);
        const maxTempToday = Math.round(data.daily.temperature_2m_max[0]);
        const minTempToday = Math.round(data.daily.temperature_2m_min[0]);

        // Оновлюємо інтерфейс
        document.querySelector(".main-temperature").innerText = temp;
        document.querySelector(".max-temperature").innerText = maxTempToday;
        document.querySelector(".min-temperature").innerText = minTempToday;
        document.querySelector(".condition").innerText = getWeatherDescription(data.current_weather.weathercode);

        // Оскільки Open-Meteo не дає назву міста (тільки погоду),
        // назву "КИЇВ" поки залишимо або пізніше додамо окремий крок для неї.
        console.log("Дані отримано:", data);
    } catch (err) {
        console.error("Помилка:", err);
        document.getElementById("city-name").innerText = "Помилка зв'язку";
    }
};

function getWeatherDescription(code) {
    if (code === 0) return "Clear sky";

    if ([1, 2, 3].includes(code)) return "Mainly clear, partly cloudy, and overcast";

    if ([45, 48].includes(code)) return "Fog and depositing rime fog";

    if (code >= 51 && code <= 55) return "Freezing Drizzle: Light and dense intensity";

    if (code >= 56 && code <= 57) return "Drizzle: Light, moderate, and dense intensity";

    if (code >= 61 && code <= 65) return "Rain: Slight, moderate and heavy intensity";
    if (code >= 66 && code <= 67) return "Freezing Rain: Light and heavy intensity";

    if (code >= 71 && code <= 75) return "Snow fall: Slight, moderate, and heavy intensity";
    if (code === 77) return "Snow grains";
    if (code >= 80 && code <= 82) return "Rain showers: Slight, moderate, and violent";
    if (code >= 85 && code <= 86) return "Snow showers slight and heavy";
    if (code === 95) return "Thunderstorm: Slight or moderate";
    if (code >= 96 && code <= 99) return "Thunderstorm with slight and heavy hail";

    return "❓";
}

// Запускаємо функцію при завантаженні сторінки
getLocation();
