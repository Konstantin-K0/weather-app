"use strict";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const date = now.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
});

document.querySelector(".datetime").innerText = date;

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
            // current_weather: "true",

            current: "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,apparent_temperature,wind_speed_10m",

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

        const temp = Math.ceil(data.current.temperature_2m);
        const weatherCode = data.current.weather_code;
        const weatherIcon = getWeatherIcon(weatherCode);
        const maxTempToday = Math.ceil(data.daily.temperature_2m_max[0]);
        const minTempToday = Math.ceil(data.daily.temperature_2m_min[0]);

        // Оновлюємо інтерфейс
        document.body.style.backgroundImage = getWeatherBG(weatherCode);
        document.querySelector(".spacer").innerHTML = `<span class="f-icon-big"><i class="fa-solid ${weatherIcon}"></i></span>`;
        document.querySelector(".main-temperature").innerText = temp;
        document.querySelector(".max-temperature").innerText = maxTempToday;
        document.querySelector(".min-temperature").innerText = minTempToday;
        document.querySelector(".condition").innerText = getWeatherDescription(data.current.weather_code);

        const containerDailyForcast = document.querySelector(".daily-forecast");
        containerDailyForcast.innerHTML = ""; // Очищаємо контейнер перед додаванням нових даних

        data.daily.time.forEach((time, index) => {
            const timeStamp = new Date(time);
            const dayOfWeek = timeStamp.getDay();
            const day = String(timeStamp.getDate()).padStart(2, "0");
            const month = String(timeStamp.getMonth() + 1).padStart(2, "0");
            const dateLabel = `${day}.${month}`;

            const div = document.createElement("div");

            div.className = "daily-forecast-item";
            if (index === 0) div.classList.add("active-day");

            div.innerHTML = `
                <span class="f-day">${daysOfWeek[dayOfWeek]}</span>
                <span class="f-date">${dateLabel}</span>
            `;
            containerDailyForcast.appendChild(div);

            div.addEventListener("click", () => {
                document.querySelectorAll(".daily-forecast-item").forEach((el) => el.classList.remove("active-day"));

                div.classList.add("active-day");

                renderHourly(index, data);
            });
        });

        renderHourly(0, data); // Показуємо погодинний прогноз для сьогоднішнього дня

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

function getWeatherIcon(code) {
    if (code === 0) return "fa-solid fa-sun";

    if ([1, 2, 3].includes(code)) return "fa-solid fa-cloud-sun";

    if ([45, 48].includes(code)) return "fa-solid fa-smog";

    if (code >= 51 && code <= 55) return "fa-solid fa-cloud-rain";
    if (code >= 56 && code <= 57) return "fa-solid fa-cloud-rain";

    if (code >= 61 && code <= 65) return "fa-solid fa-cloud-showers-heavy";
    if (code >= 66 && code <= 67) return "fa-solid fa-snowflake";

    if (code >= 71 && code <= 75) return "fa-solid fa-snowflake";
    if (code === 77) return "fa-solid fa-snowflake";
    if (code >= 80 && code <= 82) return "fa-solid fa-cloud-showers-water";
    if (code >= 85 && code <= 86) return "fa-solid fa-snowflake";
    if (code === 95) return "fa-solid fa-bolt";
    if (code >= 96 && code <= 99) return "fa-solid fa-bolt";

    return "❓";
}

function getWeatherBG(code) {
    if (code === 0) return `linear-gradient(40deg, #40b9ff 0%, #fff1d6 100%`;

    if ([1, 2, 3].includes(code)) return `linear-gradient(40deg, #b3ccff 0%, #ffffff 100%)`;

    if ([45, 48].includes(code)) return `linear-gradient(40deg, #c2c2c2 0%, #fff9ed 100%)`;

    if (code >= 51 && code <= 55) return `linear-gradient(40deg, #6fbdde 0%, #c6d7e5 100%)`;
    if (code >= 56 && code <= 57) return `linear-gradient(40deg, #6fbdde 0%, #c6d7e5 100%)`;

    if (code >= 61 && code <= 65) return `linear-gradient(40deg, #458eae 0%, #a0b1bf 100%)`;
    if (code >= 66 && code <= 67) return `linear-gradient(40deg, #bdd3e8 0%, #f1f9ff 100%)`;

    if (code >= 71 && code <= 75) return `linear-gradient(40deg, #bdd3e8 0%, #f1f9ff 100%)`;
    if (code === 77) return `linear-gradient(40deg, #bdd3e8 0%, #f1f9ff 100%)`;
    if (code >= 80 && code <= 82) return `linear-gradient(40deg, #2489b4 0%, #7fa9cb 100%)`;
    if (code >= 85 && code <= 86) return `linear-gradient(40deg, #bdd3e8 0%, #f1f9ff 100%)`;
    if (code === 95) return `linear-gradient(40deg, #4a637c 0%, #f1f9ff 100%)`;
    if (code >= 96 && code <= 99) return `linear-gradient(40deg, #4a637c 0%, #f1f9ff 100%)`;

    return "❓";
}

function renderHourly(dayIndex, data) {
    const container = document.querySelector(".forecast");
    container.innerHTML = "";

    const now = new Date();
    const currentHour = now.getHours();

    let start = dayIndex * 24;
    let end = start + 24;

    // 🔥 Якщо сьогодні — починаємо з поточної години
    if (dayIndex === 0) {
        start += currentHour;
    }

    for (let i = start; i < end; i++) {
        const temp = Math.ceil(data.hourly.temperature_2m[i]);
        const weatherCode = data.hourly.weather_code[i];

        const hour = new Date(data.hourly.time[i]).getHours();
        const timeLabel = hour.toString().padStart(2, "0") + ":00";

        const div = document.createElement("div");
        
        console.log(data.hourly.precipitation_probability[i], weatherCode);

        
        if (data.hourly.precipitation_probability[i] >= 45) {
            div.className = "forecast-item-rainy";
            div.innerHTML = `
            <span class="f-time">${timeLabel}</span>
            <span class="f-icon"><i class="fa-solid ${getWeatherIcon(weatherCode)}"></i></span>
            <span class="f-proc">${data.hourly.precipitation_probability[i]}%</span>
            <span class="f-temp">${temp}°</span>
            `;
        } else {
            div.className = "forecast-item";
            div.innerHTML = `
                <span class="f-time">${timeLabel}</span>
                <span class="f-icon"><i class="fa-solid ${getWeatherIcon(weatherCode)}"></i></span>
                <span class="f-temp">${temp}°</span>
        `;
        }

        container.appendChild(div);
    }
}

// Запускаємо функцію при завантаженні сторінки
getLocation();
