"use strict";

// 1. Функція для отримання локації
function getLocation() {
    if (navigator.geolocation) {
        // Запитуємо дозвіл у користувача
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        document.getElementById("city-name").innerText = "Геолокація не підтримується";
    }
}

const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=50.048344&longitude=14.5125922&localityLanguage=uk`;

const request = fetch(geoUrl);

console.log(request);

const getCityData = function (lng, lat) {
    const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=uk`;
    
    fetch(geoUrl).then(response => response.json()).then(data => {
        console.log(data);
    });

}

getCityData(14.5125922, 50.048344);
/*
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
document.querySelector('.label').innerText = lang.label;

// 2. Коли отримали координати — запитуємо погоду
async function showPosition(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    
    // Передаємо userLang у запит до геокодера, щоб назва міста теж була мовою системи
    const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${userLang}`;

    try {
        const [weatherResponse, geoResponse] = await Promise.all([
            fetch(weatherUrl),
            fetch(geoUrl)
        ]);

        const weatherData = await weatherResponse.json();
        const geoData = await geoResponse.json();

        document.getElementById("temperature").innerText = Math.round(weatherData.current_weather.temperature);
        
        // Назва міста прийде мовою системи завдяки localityLanguage=${userLang}
        const city = geoData.city || geoData.locality || lang.error;
        document.getElementById("city-name").innerText = city;

    } catch (error) {
        document.getElementById("city-name").innerText = lang.error;
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
*/
