// weather.js
export const daysOfWeek = {
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    uk: ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    cs: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],
};

const weatherDescriptions = {
    en: {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        56: "Light freezing drizzle",
        57: "Heavy freezing drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        66: "Light freezing rain",
        67: "Heavy freezing rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        77: "Snow grains",
        80: "Slight showers",
        81: "Moderate showers",
        82: "Violent showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with heavy hail",
    },
    uk: {
        0: "Ясне небо",
        1: "Переважно ясно",
        2: "Мінлива хмарність",
        3: "Хмарно",
        45: "Туман",
        48: "Паморозний туман",
        51: "Легка мряка",
        53: "Помірна мряка",
        55: "Густа мряка",
        56: "Легка крижана мряка",
        57: "Сильна крижана мряка",
        61: "Невеликий дощ",
        63: "Помірний дощ",
        65: "Сильний дощ",
        66: "Легкий крижаний дощ",
        67: "Сильний крижаний дощ",
        71: "Невеликий сніг",
        73: "Помірний сніг",
        75: "Сильний сніг",
        77: "Снігові зерна",
        80: "Невеликі зливи",
        81: "Помірні зливи",
        82: "Сильні зливи",
        85: "Невеликий сніговий шквал",
        86: "Сильний сніговий шквал",
        95: "Гроза",
        96: "Гроза з градом",
        99: "Гроза з сильним градом",
    },
    cs: {
        0: "Jasno",
        1: "Převážně jasno",
        2: "Polojasno",
        3: "Zataženo",
        45: "Mlha",
        48: "Námrazová mlha",
        51: "Slabé mrholení",
        53: "Mírné mrholení",
        55: "Husté mrholení",
        56: "Slabé mrznoucí mrholení",
        57: "Silné mrznoucí mrholení",
        61: "Slabý déšť",
        63: "Mírný déšť",
        65: "Silný déšť",
        66: "Slabý mrznoucí déšť",
        67: "Silný mrznoucí déšť",
        71: "Slabé sněžení",
        73: "Mírné sněžení",
        75: "Silné sněžení",
        77: "Sněhová zrna",
        80: "Slabé přeháňky",
        81: "Mírné přeháňky",
        82: "Prudké přeháňky",
        85: "Slabé sněhové přeháňky",
        86: "Silné sněhové přeháňky",
        95: "Bouřka",
        96: "Bouřka s krupobitím",
        99: "Bouřka se silným krupobitím",
    },
};

export function getWeatherDescription(code, lang = "en") {
    const dict = weatherDescriptions[lang] ?? weatherDescriptions.en;

    // Для кодів які йдуть діапазонами — шукаємо найближчий
    if (dict[code]) return dict[code];

    if (code >= 51 && code <= 55) return dict[51];
    if (code >= 56 && code <= 57) return dict[56];
    if (code >= 61 && code <= 65) return dict[61];
    if (code >= 66 && code <= 67) return dict[66];
    if (code >= 71 && code <= 75) return dict[71];
    if (code >= 80 && code <= 82) return dict[80];
    if (code >= 85 && code <= 86) return dict[85];
    if (code >= 96 && code <= 99) return dict[96];

    return "❓";
}

export function getWeatherIcon(code, isDay) {
    if (code === 0) return isDay ? "./icons/clear-day.svg" : "./icons/clear-night.svg";

    if ([1, 2, 3].includes(code)) return isDay ? "./icons/overcast-day.svg" : "./icons/overcast-night.svg";

    if ([45, 48].includes(code)) return isDay ? "./icons/overcast-day-fog.svg" : "./icons/overcast-night-fog.svg";

    if (code >= 51 && code <= 55) return isDay ? "./icons/overcast-day-drizzle.svg" : "./icons/overcast-night-drizzle.svg";

    if (code >= 56 && code <= 57) return isDay ? "./icons/overcast-day-sleet.svg" : "./icons/overcast-night-sleet.svg"; 

    if (code >= 61 && code <= 65) return isDay ? "./icons/overcast-day-rain.svg" : "./icons/overcast-night-rain.svg";
    
    if (code >= 66 && code <= 67) return isDay ? "./icons/overcast-day-sleet.svg" : "./icons/overcast-night-sleet.svg";

    if (code >= 71 && code <= 76) return isDay ? "./icons/overcast-day-snow.svg" : "./icons/overcast-night-snow.svg";

     if (code === 77) return isDay ? "./icons/overcast-day-hail.svg" : "./icons/overcast-night-hail.svg";

    if (code >= 80 && code <= 82) return "./icons/rain.svg";
    if (code >= 85 && code <= 86) return "./icons/snow.svg";
    if (code === 95) return isDay ? "./icons/thunderstorms-day-rain.svg" : "./icons/thunderstorms-night-rain.svg";  
    if (code >= 96 && code <= 99) return isDay ? "./icons/thunderstorms-day-snow.svg" : "./icons/thunderstorms-night-snow.svg";

    return "./icons/clear-day.svg";
}

const weatherGradients = {
    0:  "linear-gradient(160deg, #ffe2a7 0%, #ffffff 60%)",  // ясно — золотисто-помаранчевий захід
    1:  "linear-gradient(160deg, #89c4e1 0%, #ffffff 60%)",  // переважно ясно — м'яке блакитне небо
    2:  "linear-gradient(160deg, #a8c0d6 0%, #ffffff 60%)",  // мінлива хмарність — сіро-блакитний
    3:  "linear-gradient(160deg, #8e9eab 0%, #ffffff 60%)",  // хмарно — сталевий

    45: "linear-gradient(160deg, #b8bec7 0%, #ffffff 60%)",  // туман — розмитий сірий
    48: "linear-gradient(160deg, #a0aab4 0%, #ffffff 60%)",  // паморозний туман

    51: "linear-gradient(160deg, #5b8fa8 0%, #ffffff 60%)",  // легка мряка
    53: "linear-gradient(160deg, #4a7a96 0%, #ffffff 60%)",  // помірна мряка
    55: "linear-gradient(160deg, #3a6880 0%, #ffffff 60%)",  // густа мряка

    56: "linear-gradient(160deg, #7ea8c4 0%, #ffffff 60%)",  // крижана мряка
    57: "linear-gradient(160deg, #6a96b5 0%, #ffffff 60%)",

    61: "linear-gradient(160deg, #3a7bd5 0%, #ffffff 60%)",  // невеликий дощ — яскраво-синій
    63: "linear-gradient(160deg, #2c6fad 0%, #ffffff 60%)",  // помірний дощ
    65: "linear-gradient(160deg, #1a4f8a 0%, #ffffff 60%)",  // сильний дощ — темно-синій

    66: "linear-gradient(160deg, #89afc9 0%, #ffffff 60%)",  // крижаний дощ
    67: "linear-gradient(160deg, #7098b5 0%, #ffffff 60%)",

    71: "linear-gradient(160deg, #a8c8e8 0%, #ffffff 60%)",  // слабий сніг — крижано-білий
    73: "linear-gradient(160deg, #90b8d8 0%, #ffffff 60%)",  // помірний сніг
    75: "linear-gradient(160deg, #78a8cc 0%, #ffffff 60%)",  // сильний сніг
    77: "linear-gradient(160deg, #b0cce0 0%, #ffffff 60%)",  // снігові зерна

    80: "linear-gradient(160deg, #2980b9 0%, #ffffff 60%)",  // зливи — насичений синій
    81: "linear-gradient(160deg, #1c6ea4 0%, #ffffff 60%)",
    82: "linear-gradient(160deg, #0f4c81 0%, #ffffff 60%)",  // сильні зливи — майже нічний

    85: "linear-gradient(160deg, #98c0d8 0%, #ffffff 60%)",  // снігові шквали
    86: "linear-gradient(160deg, #80adc8 0%, #ffffff 60%)",

    95: "linear-gradient(160deg, #2c3e50 0%, #ffffff 60%)",  // гроза — темно-синьо-сірий
    96: "linear-gradient(160deg, #1a2a3a 0%, #ffffff 60%)",  // гроза з градом
    99: "linear-gradient(160deg, #0f1c2a 0%, #ffffff 60%)",  // сильна гроза — майже чорний
};

export function getWeatherBG(code) {
    if (weatherGradients[code]) return weatherGradients[code];

    if (code >= 51 && code <= 55) return weatherGradients[51];
    if (code >= 56 && code <= 57) return weatherGradients[56];
    if (code >= 61 && code <= 65) return weatherGradients[61];
    if (code >= 66 && code <= 67) return weatherGradients[66];
    if (code >= 71 && code <= 75) return weatherGradients[71];
    if (code >= 80 && code <= 82) return weatherGradients[80];
    if (code >= 85 && code <= 86) return weatherGradients[85];
    if (code >= 96 && code <= 99) return weatherGradients[96];

    return weatherGradients[0];
}
