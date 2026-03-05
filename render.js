// render.js
import { getWeatherIcon, getWeatherBG, getWeatherDescription } from "./weather.js";

// export function renderCity(name) { ... }
export function renderCurrent(data, lang) {
    const temp = Math.ceil(data.current.temperature_2m);
    const weatherCode = data.current.weather_code;
    const weatherIcon = getWeatherIcon(weatherCode);
    const maxTempToday = Math.ceil(data.daily.temperature_2m_max[0]);
    const minTempToday = Math.ceil(data.daily.temperature_2m_min[0]);

    // Оновлюємо інтерфейс

    document.body.style.backgroundImage = getWeatherBG(weatherCode);

    const spacer = document.querySelector(".spacer");
    spacer.innerHTML = ""; // очищаємо

    const img = document.createElement("img");
    img.className = "f-icon-img-big";
    img.src = ""; // спочатку пусто
    requestAnimationFrame(() => {
        img.src = getWeatherIcon(weatherCode); // встановлюємо після рендеру
    });

    spacer.appendChild(img);

    // document.querySelector(".spacer").innerHTML = `<span class="f-icon-big"><img class="f-icon-img-big" src="${getWeatherIcon(weatherCode)}" /></span>`;
    document.querySelector(".main-temperature").innerText = temp;
    document.querySelector(".max-temperature").innerText = maxTempToday;
    document.querySelector(".min-temperature").innerText = minTempToday;
    document.querySelector(".condition").innerText = getWeatherDescription(data.current.weather_code, lang);
}

export function renderDaily(data, days) {
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
                <span class="f-day">${days[dayOfWeek]}</span>
                <span class="f-date">${dateLabel}</span>
            `;
        containerDailyForcast.appendChild(div);

        div.addEventListener("click", () => {
            document.querySelectorAll(".daily-forecast-item").forEach((el) => el.classList.remove("active-day"));

            div.classList.add("active-day");

            renderHourly(index, data);
        });
    });
}

export function renderHourly(dayIndex, data) {
    const container = document.querySelector(".forecast");
    container.innerHTML = "";
    container.scrollLeft = 0;

    const wrapper = document.querySelector(".forecast-wrapper");
    if (wrapper) wrapper.scrollLeft = 0;

    const now = new Date();
    const currentHour = now.getHours();

    let start = dayIndex * 24;
    let end = start + 24;

    // 🔥 Якщо сьогодні — починаємо з поточної години
    if (dayIndex === 0) {
        start += currentHour;
    }

    for (let i = start; i < end; i++) {
        const weatherCode = data.hourly.weather_code[i];

        const hour = new Date(data.hourly.time[i]).getHours();
        const timeLabel = hour.toString().padStart(2, "0") + ":00";

        const div = document.createElement("div");

        if (data.hourly.precipitation_probability[i] >= 45) {
            div.className = "forecast-item-rainy";
            div.innerHTML = `
            <span class="f-icon"><img class="f-icon-img" src="${getWeatherIcon(weatherCode)}" /></span>
            <span class="f-proc">${data.hourly.precipitation_probability[i]}%</span>
            <span class="f-time">${timeLabel}</span>
            `;
        } else {
            div.className = "forecast-item";
            div.innerHTML = `
            <span class="f-icon"><img class="f-icon-img" src="${getWeatherIcon(weatherCode)}" /></span>
            <span class="f-time">${timeLabel}</span>
        `;
        }

        container.appendChild(div);
    }

    const temps = [];
    for (let i = start; i < end; i++) {
        temps.push(Math.ceil(data.hourly.temperature_2m[i]));
    }
    renderTempChart(temps);
}

export function renderTempChart(temps) {
    const svg = document.getElementById("temp-chart");
    svg.innerHTML = "";

    const container = document.querySelector(".forecast");
    const firstItem = container.querySelector(".forecast-item, .forecast-item-rainy");
    const itemWidth = firstItem ? firstItem.getBoundingClientRect().width : 64; // +10 це gap

    const totalWidth = temps.length * itemWidth;
    const height = 60;
    const padding = 10;

    svg.setAttribute("width", totalWidth);
    svg.setAttribute("height", height);
    svg.style.width = totalWidth + "px";

    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;

    const points = temps.map((t, i) => {
        const x = i * itemWidth + itemWidth / 2;
        const y = height - padding - ((t - min) / range) * (height - padding * 2);
        return { x, y, t };
    });

    // Плавна лінія
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpX = (prev.x + curr.x) / 2;
        d += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Шлях для заливки: лінія + замикаємо донизу
    const first = points[0];
    const last = points[points.length - 1];
    const dFill = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`;

    // --- Визначення градієнта ---
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

    const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    gradient.setAttribute("id", "tempGradient");
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y2", "1"); // вертикальний градієнт

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "rgba(57, 156, 255, 0.19)");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "rgba(255, 255, 255, 0)");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // --- Заливка під лінією ---
    const fillPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    fillPath.setAttribute("d", dFill);
    fillPath.setAttribute("fill", "url(#tempGradient)");
    fillPath.setAttribute("stroke", "none");
    svg.appendChild(fillPath);

    // --- Основна лінія ---
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(78, 114, 136, 0.9)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    // --- Підписи температур ---
    points.forEach(({ x, y, t }) => {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y - 10);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "#000000");
        text.setAttribute("font-size", "18");
        text.setAttribute("font-family", "Roboto, sans-serif");
        text.setAttribute("font-weight", "800");
        text.textContent = `${t}°`;
        svg.appendChild(text);
    });
}

export function renderDate(locale) {
    const now = new Date();

    const date = now.toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
    });

    document.querySelector(".datetime").innerText = date;
}

export function renderCity(city) {
    document.getElementById("city-name").innerText = city.toUpperCase();
}
