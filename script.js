const loadingSpinner = document.getElementById("loading-spinner");
const prayerTimesElement = document.getElementById("prayer-times");
const dateElement = document.getElementById("current-date");
const cityElement = document.getElementById("user-city");
const nextPrayerCountdown = document.getElementById("next-prayer-countdown");
let countdownInterval;

const formatTimeTo12Hour = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

const parseTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

const calculateNextPrayer = (timings) => {
    const now = new Date();
    const prayerTimes = [
        { name: 'Fajr', time: parseTime(timings.Fajr) },
        { name: 'Dhuhr', time: parseTime(timings.Dhuhr) },
        { name: 'Asr', time: parseTime(timings.Asr) },
        { name: 'Maghrib', time: parseTime(timings.Maghrib) },
        { name: 'Isha', time: parseTime(timings.Isha) }
    ];

    let nextPrayer = prayerTimes.find(prayer => prayer.time > now) || prayerTimes[0];
    startCountdown(nextPrayer);
};

const startCountdown = (nextPrayer) => {
    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const now = new Date();
        const timeDiff = nextPrayer.time - now;

        if (timeDiff <= 0) {
            nextPrayer.time.setDate(nextPrayer.time.getDate() + 1);
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        nextPrayerCountdown.textContent = `Next Prayer: ${nextPrayer.name} in ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
};

const fetchPrayerTimes = async (latitude, longitude) => {
    try {
        const response = await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2&date=${new Date().toISOString().split('T')[0]}`
        );
        
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        updatePrayerTimesUI(data.data.timings);
        updateLocationInfo(data.data);
        calculateNextPrayer(data.data.timings);
    } catch (error) {
        handlePrayerTimesError(error);
    }
};

const updatePrayerTimesUI = (timings) => {
    const prayerIds = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    prayerIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatTimeTo12Hour(timings[id.charAt(0).toUpperCase() + id.slice(1)]);
        }
    });
    
    loadingSpinner.style.display = "none";
    prayerTimesElement.style.display = "block";
};

const updateLocationInfo = (data) => {
    if (cityElement && data.meta && data.meta.timezone) {
        cityElement.textContent = `Location: ${data.meta.timezone}`;
    }
};

const handlePrayerTimesError = (error) => {
    console.error("Error fetching prayer times:", error.message);
    const errorContainer = document.createElement('div');
    errorContainer.classList.add('error-message');
    errorContainer.innerHTML = `
        <p>Unable to load prayer times</p>
        <small>${error.message}</small>
    `;
    document.body.innerHTML = '';
    document.body.appendChild(errorContainer);
};

const setCurrentDate = () => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    dateElement.textContent = `Date: ${formattedDate}`;
};

const getUserLocation = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchPrayerTimes(latitude, longitude);  
            },
            (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                    alert("You denied location access. Some features may not work.");
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    alert("Location information is unavailable.");
                } else if (error.code === error.TIMEOUT) {
                    alert("The request to get your location timed out.");
                } else {
                    alert("An unknown error occurred.");
                }

                handlePrayerTimesError(error);  // Call your existing error handler
            }
        );
    } else {
        handlePrayerTimesError(new Error("Geolocation not supported"));
    }
};


const init = () => {
    setCurrentDate();
    getUserLocation();
};

init();
