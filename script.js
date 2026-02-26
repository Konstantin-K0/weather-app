const btn = document.getElementById('colorBtn');

btn.addEventListener('click', () => {
    // 1. Логіка зміни кольору
    const randomColor = `hsl(${Math.random() * 360}, 70%, 60%)`;
    document.body.style.backgroundColor = randomColor;

    // 2. Логіка сповіщення
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("Колір змінено!", {
                body: "Новий колір уже на екрані",
                icon: "icon.png" // якщо є іконка
            });
        }
    });
});

window.navigator.vibrate(50); // спрацює на Android, на iOS в PWA іноді обмежено, але варто спробувати