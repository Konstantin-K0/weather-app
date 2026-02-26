"use strict";

const getLocation = () => {
    // Перевіряємо, чи підтримує браузер геолокацію
    if (!navigator.geolocation) {
        alert("Геолокація не підтримується вашим браузером");
        return;
    }

    // Параметри: висока точність, таймаут 10 секунд
    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
    };

    // Викликаємо вбудований метод
    navigator.geolocation.getCurrentPosition(success, error, options);
};

// Функція, яка спрацює при успішному отриманні координат
const success = (position) => {
    const { latitude, longitude } = position.coords;

    console.log(`Широта: ${latitude}, Довгота: ${longitude}`);

    getWeather(latitude, longitude);

    // Тимчасово виведемо в заголовок міста, щоб перевірити роботу
    // document.getElementById("city-name").innerText = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
};

// Функція для обробки помилок (наприклад, користувач заборонив доступ)
const error = (err) => {
    console.warn(`Помилка геолокації (${err.code}): ${err.message}`);
    document.getElementById("city-name").innerText = "Доступ заборонено";
};

const getWeather = async (lat, lon) => {
    try {
        // 1. Поточні дані (Current)
        const currentParams = [
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation",
            "wind_speed_10m",
            "uv_index",
            "cloud_cover",
        ].join(",");

        // 2. Погодинні дані (Hourly) — додаємо те, що зникло
        const hourlyParams = ["temperature_2m", "precipitation_probability"].join(",");

        // 3. Щоденні дані (Daily)
        const dailyParams = ["temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "uv_index_max"].join(",");

        // 4. Формуємо повний URL
        const url = `https://api.open-meteo.com/v1/forecast?latitude=50.06&longitude=14.52&current=${currentParams}&hourly=${hourlyParams}&daily=${dailyParams}&timezone=auto&forecast_days=10`;

        const response = await fetch(url);

        if (!response.ok) throw new Error("Помилка сервісу Open-Meteo");

        const data = await response.json();

        // Open-Meteo повертає дані у структурі data.current.temperature_2m
        const temp = Math.round(data.current.temperature_2m);

        // Оновлюємо інтерфейс
        document.getElementById("temperature").innerText = temp;

        // Оскільки Open-Meteo не дає назву міста (тільки погоду),
        // назву "КИЇВ" поки залишимо або пізніше додамо окремий крок для неї.
        console.log("Дані отримано:", data);
    } catch (err) {
        console.error("Помилка:", err);
        document.getElementById("city-name").innerText = "Помилка зв'язку";
    }
};

// Запускаємо функцію при завантаженні сторінки
getLocation();
