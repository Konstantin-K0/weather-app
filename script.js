"use strict";

const translations = {
    uk: { label: "ВАША ЛОКАЦІЯ", loading: "Завантаження...", error: "Помилка" },
    en: { label: "YOUR LOCATION", loading: "Loading...", error: "Error" },
    pl: { label: "TWOJA LOKALIZACJA", loading: "Ładowanie...", error: "Błąd" },
    cz: { label: "VAŠE LOKACE", loading: "Stahování...", error: "Chyba" },
};

// Визначаємо мову користувача (беремо перші дві літери, наприклад "uk" з "uk-UA")
const userLang = navigator.language.substring(0, 2);

console.log(userLang);

// Вибираємо мову зі словника, або англійську за замовчуванням
const lang = translations[userLang] || translations.en;

console.log(lang);

// 1. Функція для отримання локації
function getLocation() {
    if (navigator.geolocation) {
        // Запитуємо дозвіл у користувача
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        document.getElementById("city-name").innerText = "Геолокація не підтримується";
    }
}

// Встановлюємо початковий текст мітки згідно з мовою системи
document.querySelector(".label").innerText = lang.label;

// 2. Коли отримали координати — запитуємо погоду
async function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const cityEl = document.getElementById("city-name");
    const tempEl = document.querySelector(".temp-container");

    try {
        // 1. Отримуємо місто
        const geoResponse = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${userLang}`,
        );
        const geoData = await geoResponse.json();

        // Вставляємо назву міста і показуємо його
        cityEl.innerText = geoData.city || geoData.locality || lang.error;
        cityEl.classList.add("visible");

        // Чекаємо 300мс для ефекту черговості (пауза між появою міста і температури)
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 2. Отримуємо погоду
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherResponse.json();

        // Вставляємо температуру і показуємо її
        document.getElementById("temperature").innerText = Math.round(weatherData.current_weather.temperature);
        tempEl.classList.add("visible");
    } catch (error) {
        cityEl.innerText = lang.error;
        cityEl.classList.add("visible");
    }
}

// Обробка помилок геолокації
function showError(error) {
    const cityLabel = document.getElementById("city-name");
    switch (error.code) {
        case error.PERMISSION_DENIED:
            cityLabel.innerText = "Доступ до локації заборонено";
            break;
        case error.POSITION_UNAVAILABLE:
            cityLabel.innerText = "Локація недоступна";
            break;
        default:
            cityLabel.innerText = "Помилка геолокації";
    }
}

// Запускаємо все при завантаженні сторінки
getLocation();
