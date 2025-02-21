const loadingSpinner = document.getElementById("loading-spinner");
const prayerTimesElement = document.getElementById("prayer-times");
const dateElement = document.getElementById("current-date");
const cityElement = document.getElementById("user-city");
const nextPrayerCountdown = document.getElementById("next-prayer-countdown");
const qiblaDirectionText = document.getElementById('qibla-direction-text');
const kaabaNeedle = document.getElementById('kaaba-needle');
const compassElement = document.getElementById('compass');
const surahSelect = document.getElementById('surah-select');
const surahTitle = document.getElementById('surah-title');
const surahContent = document.getElementById('surah-content');
let countdownInterval;
let qiblaAngle = 0;
let deviceHeading = 0;
if (!window.fetch) {
    window.fetch = function (url, options) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url);
            xhr.onload = () => resolve({
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
            });
            xhr.onerror = () => reject(new TypeError('Network request failed'));
            if (options.headers) {
                Object.keys(options.headers).forEach(key => {
                    xhr.setRequestHeader(key, options.headers[key]);
                });
            }
            xhr.send(options.body || null);
        });
    };
}
const fetchSurahs = async () => {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        populateSurahDropdown(data.data);
    } catch (error) {
        console.error('Error fetching Surahs:', error);
    }
};

const populateSurahDropdown = (surahs) => {
    surahs.forEach(surah => {
        const option = document.createElement('option');
        option.value = surah.number;
        option.textContent = `${surah.number}. ${surah.name}`;
        surahSelect.appendChild(option);
    });
};

const fetchSurahContent = async (surahNumber) => {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
        const data = await response.json();
        displaySurah(data.data);
    } catch (error) {
        console.error('Error fetching Surah content:', error);
    }
};

const displaySurah = (surah) => {
    surahTitle.textContent = surah.name;
    surahContent.innerHTML = surah.ayahs
        .map(ayah => `
            <p class="arabic-text" style="font-family: 'Traditional Arabic', serif; font-size: 24px; direction: rtl; text-align: right;">
                ${ayah.text} ﴿${ayah.numberInSurah}﴾
            </p>
        `)
        .join('');
};

surahSelect.addEventListener('change', (event) => {
    const surahNumber = event.target.value;
    if (surahNumber) {
        fetchSurahContent(surahNumber);
    }
});

fetchSurahs();

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
        const method = getCalculationMethod(latitude, longitude);

        const response = await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=${method}&date=${new Date().toISOString().split('T')[0]}`
        );

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        const data = await response.json();
        updatePrayerTimesUI(data.data.timings);
        updateLocationInfo(latitude, longitude, data.data);
        calculateNextPrayer(data.data.timings);
    } catch (error) {
        handlePrayerTimesError(error);
    }
};

const getCalculationMethod = (latitude, longitude) => {
    if (latitude > 20 && latitude < 60 && longitude > -130 && longitude < -60) {
        return 2; 
    } else if (latitude > 35 && latitude < 70 && longitude > -10 && longitude < 40) {
        return 3; 
    } else {
        return 1; 
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

const updateLocationInfo = async (latitude, longitude, data) => {
    if (cityElement) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            const locationData = await response.json();

            const city = locationData.address.city ||
                locationData.address.town ||
                locationData.address.county ||
                'Unknown Location';
            const state = locationData.address.state ||
                locationData.address.county ||
                'Unknown State';
            const country = locationData.address.country || 'Unknown Country';

            cityElement.textContent = `Location: ${city}, ${state}, ${country}`;
        } catch (error) {
            console.warn("Reverse geocoding failed:", error);
            cityElement.textContent = data.meta && data.meta.timezone
                ? `Location: ${data.meta.timezone}`
                : 'Location: Unable to determine';
        }
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

const calculateQiblaDirection = (latitude, longitude) => {
    const kaabaLat = 21.4225;
    const kaabaLon = 39.8262;

    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const toDegrees = (radians) => radians * (180 / Math.PI);

    const lat1 = toRadians(latitude);
    const lon1 = toRadians(longitude);
    const lat2 = toRadians(kaabaLat);
    const lon2 = toRadians(kaabaLon);

    const dLon = lon2 - lon1;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let initialBearing = Math.atan2(y, x);
    initialBearing = toDegrees(initialBearing);
    qiblaAngle = (initialBearing + 360) % 360;

    updateCompass();
};

const updateCompass = () => {
    console.log(`Qibla Angle: ${qiblaAngle}, Device Heading: ${deviceHeading}`);

    const needleRotation = (qiblaAngle - deviceHeading + 360) % 360;
    kaabaNeedle.style.transform = `rotate(${needleRotation}deg)`;
    const directions = [
        { min: 337.5, max: 360, text: 'North-West' },
        { min: 0, max: 22.5, text: 'North' },
        { min: 22.5, max: 67.5, text: 'North-East' },
        { min: 67.5, max: 112.5, text: 'East' },
        { min: 112.5, max: 157.5, text: 'South-East' },
        { min: 157.5, max: 202.5, text: 'South' },
        { min: 202.5, max: 247.5, text: 'South-West' },
        { min: 247.5, max: 337.5, text: 'West' }
    ];

    const directionText = directions.find(d => 
        qiblaAngle >= d.min && qiblaAngle < d.max
    )?.text || 'Unknown';

    qiblaDirectionText.textContent = `Qibla Direction: ${directionText} (${Math.round(qiblaAngle)}°)`;
};

const initializeDeviceOrientation = () => {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (event) => {
            if (event.webkitCompassHeading) {
                deviceHeading = event.webkitCompassHeading;
            } else if (event.alpha) {
                deviceHeading = event.alpha;
            } else {
                deviceHeading = 0;
            }

            console.log(`Device Heading: ${deviceHeading}`);
            updateCompass();
        });
    } else {
        console.warn('Device orientation not supported');
    }
};

const requestPermissionForDeviceOrientation = async () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                initializeDeviceOrientation();
            } else {
                console.warn('Device orientation permission denied');
            }
        } catch (error) {
            console.error('Error requesting device orientation permission:', error);
        }
    } else {
        initializeDeviceOrientation();
    }
};

const getUserLocation = () => {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchPrayerTimes(latitude, longitude);
                calculateQiblaDirection(latitude, longitude);
                requestPermissionForDeviceOrientation();
            },
            (error) => {
                console.warn("Geolocation error:", error.message);
                cityElement.textContent = "Unable to determine your location. Falling back to IP-based location...";

                fetch('https://ipapi.co/json/')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`IP geolocation failed: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        fetchPrayerTimes(data.latitude, data.longitude);
                        calculateQiblaDirection(data.latitude, data.longitude);
                        requestPermissionForDeviceOrientation();
                        cityElement.textContent = `Location: ${data.city}, ${data.region}, ${data.country_name}`;
                    })
                    .catch(ipError => {
                        console.error("IP geolocation failed:", ipError);
                        cityElement.textContent = "Unable to determine your location. Please enable location permissions or enter your location manually.";
                    });
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        console.warn('Geolocation not supported');
        cityElement.textContent = "Geolocation is not supported by your browser. Please enter your location manually.";
    }
};
const init = () => {
    setCurrentDate();
    getUserLocation();

    document.querySelectorAll('.prayer-card').forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flip');
        });
    });
};

document.addEventListener("DOMContentLoaded", () => {
    const prayerCards = document.querySelectorAll(".prayer-card");
    const quotes = [
        "“Indeed, prayer prohibits immorality and wrongdoing.” - Quran 29:45",
        "“So, verily, with hardship comes ease.” - Quran 94:5",
        "“And seek help through patience and prayer.” - Quran 2:45",
        "“So remember Me; I will remember you.” - Quran 2:152",
        "“Do not despair of the mercy of Allah.” - Quran 39:53",
        "“Allah does not burden a soul beyond that it can bear.” - Quran 2:286",
        "“And whoever puts their trust in Allah, then He will suffice him.” - Quran 65:3",
        "“So be patient. Indeed, the promise of Allah is truth.” - Quran 30:60",
        "“Verily, in the remembrance of Allah do hearts find rest.” - Quran 13:28",
        "“Indeed, Allah loves those who rely upon Him.” - Quran 3:159",
        "“Help one another in righteousness and piety.” - Quran 5:2",
        "“And establish prayer and give zakah.” - Quran 2:110",
        "“Do not walk upon the earth arrogantly.” - Quran 17:37",
        "“Indeed, Allah is Forgiving and Merciful.” - Quran 4:96",
        "Do good as Allah has done good to you.” - Quran 28:77",
        "“And let not the hatred of a people prevent you from being just.” - Quran 5:8",
        "“And Allah is the best of planners.” - Quran 3:54",
        "So which of the favors of your Lord would you deny?” - Quran 55:13",
        "“Indeed, Allah is with the patient.” - Quran 2:153",
        "“And He found you lost and guided [you].” - Quran 93:7",
        "“And He is with you wherever you are.” - Quran 57:4",
        "“And He is the Hearing, the Knowing.” - Quran 58:1",
        "“And He is the Forgiving, the Merciful.” - Quran 85:14",
        "“And He is the Subjugator over His servants.” - Quran 6:61",
        "“And He is the Wise, the Acquainted.” - Quran 6:18",
        "“And He is the Exalted in Might, the Wise.” - Quran 6:18",
        "“And He is the Best of Judges.” - Quran 95:8",
        "“And He is the Best of Planners.” - Quran 8:30",
    ];

    const prayerTimes = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const quoteElements = document.querySelectorAll(".prayer-card");

    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();

    quoteElements.forEach((element, index) => {
        const prayerTime = element.querySelector('.front span:first-child').textContent;
        if (prayerTimes.includes(prayerTime)) {
            const quoteIndex = (dayOfMonth + index) % quotes.length;
            element.querySelector(".back p").textContent = quotes[quoteIndex];
        }
    });
});

init();