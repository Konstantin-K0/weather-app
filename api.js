// api.js

export async function fetchCityName(lat, lon, locale) {

    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${locale}`;

    const response = await fetch(url);
    const data = await response.json();

    // Вибираємо найбільш логічну назву (місто або район)
    const cityName = data.city || data.locality || "Невідомо";

    return cityName
}

export async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,apparent_temperature,wind_speed_10m,is_day",
        // Погодинний прогноз
        hourly: "temperature_2m,precipitation_probability,wind_speed_10m,weather_code,is_day",
        // Денний прогноз (14 днів)
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
        forecast_days: "14",
        timezone: "auto",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

    if (!res.ok) throw new Error("Помилка сервісу Open-Meteo");

    return res.json();
}