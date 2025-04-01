document.addEventListener('DOMContentLoaded', function() {
    // Elemente DOM
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const quickCities = document.querySelectorAll('.quick-city');
    const currentCity = document.getElementById('current-city');
    const currentDate = document.getElementById('current-date');
    const currentTemp = document.getElementById('current-temp');
    const currentIcon = document.getElementById('current-icon');
    const windSpeed = document.getElementById('wind-speed');
    const humidity = document.getElementById('humidity');
    const clouds = document.getElementById('clouds');
    const forecastContainer = document.getElementById('forecast');
    
    // API URL-uri
    const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
    
    // Inițializare cu un oraș implicit
    fetchWeatherData('București');
    
    // Evenimente
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeatherData(city);
            cityInput.value = '';
        }
    });
    
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                fetchWeatherData(city);
                cityInput.value = '';
            }
        }
    });
    
    quickCities.forEach(btn => {
        btn.addEventListener('click', () => {
            const city = btn.getAttribute('data-city');
            fetchWeatherData(city);
        });
    });
    
    // Funcții
    async function fetchWeatherData(cityName) {
        try {
            // Obține coordonatele pentru oraș
            const geoResponse = await fetch(`${GEO_API_URL}?name=${encodeURIComponent(cityName)}&count=1&language=ro&format=json`);
            const geoData = await geoResponse.json();
            
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('Orașul nu a fost găsit');
            }
            
            const { latitude, longitude, timezone, name, admin1 } = geoData.results[0];
            const locationName = `${name}, ${admin1 || ''}`.trim();
            
            // Obține datele meteo
            const weatherResponse = await fetch(
                `${WEATHER_API_URL}?latitude=${latitude}&longitude=${longitude}` +
                `&hourly=temperature_2m,relativehumidity_2m,weathercode` +
                `&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
                `&current_weather=true&timezone=${timezone}&forecast_days=5`
            );
            
            const weatherData = await weatherResponse.json();
            
            // Actualizează UI
            updateCurrentWeather(locationName, weatherData);
            updateForecast(weatherData);
            
            // Animație
            document.querySelector('.current-weather').classList.add('fade-in');
            setTimeout(() => {
                document.querySelector('.current-weather').classList.remove('fade-in');
            }, 500);
            
        } catch (error) {
            console.error('Eroare la obținerea datelor meteo:', error);
            alert('Nu am putut obține datele meteo. Te rugăm să încerci alt oraș.');
        }
    }
    
    function updateCurrentWeather(locationName, data) {
        const current = data.current_weather;
        const hourly = data.hourly;
        const currentHour = new Date(current.time).getHours();
        
        // Actualizează locația și data
        currentCity.textContent = locationName;
        currentDate.textContent = new Date(current.time).toLocaleDateString('ro-RO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Actualizează temperatura
        currentTemp.textContent = Math.round(current.temperature);
        
        // Actualizează iconița
        const weatherCode = current.weathercode;
        updateWeatherIcon(currentIcon, weatherCode);
        
        // Actualizează detalii
        windSpeed.textContent = `${Math.round(current.windspeed)} km/h`;
        
        // Găsește umiditatea curentă în datele hourly
        const humidityIndex = hourly.time.findIndex(time => 
            new Date(time).getHours() === currentHour
        );
        if (humidityIndex !== -1) {
            humidity.textContent = `${hourly.relativehumidity_2m[humidityIndex]}%`;
        }
        
        // Pentru nori, folosim un procentaj aproximativ bazat pe weathercode
        const cloudiness = getCloudinessFromWeatherCode(weatherCode);
        clouds.textContent = `${cloudiness}%`;
    }
    
    function updateForecast(data) {
        const daily = data.daily;
        forecastContainer.innerHTML = '';
        
        for (let i = 0; i < daily.time.length; i++) {
            const day = new Date(daily.time[i]);
            const dayName = day.toLocaleDateString('ro-RO', { weekday: 'short' });
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);
            const weatherCode = daily.weathercode[i];
            
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card fade-in';
            forecastCard.style.animationDelay = `${i * 0.1}s`;
            
            forecastCard.innerHTML = `
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon"></div>
                <div class="forecast-temp">
                    <span class="max-temp">${maxTemp}°</span>
                    <span class="min-temp">${minTemp}°</span>
                </div>
            `;
            
            const iconElement = forecastCard.querySelector('.forecast-icon');
            updateWeatherIcon(iconElement, weatherCode);
            
            forecastContainer.appendChild(forecastCard);
            
            setTimeout(() => {
                forecastCard.classList.remove('fade-in');
            }, 500 + i * 100);
        }
    }
    
    function updateWeatherIcon(element, weatherCode) {
        // Clear previous classes
        element.className = 'weather-icon';
        
        // Adaugă clasa de bază
        element.classList.add('fas');
        
        // Determină iconița bazată pe weather code (WMO)
        // https://open-meteo.com/en/docs#api-documentation
        if (weatherCode === 0) {
            // Cer senin
            element.classList.add('fa-sun');
        } else if (weatherCode >= 1 && weatherCode <= 3) {
            // Parțial noros
            element.classList.add('fa-cloud-sun');
        } else if (weatherCode >= 45 && weatherCode <= 48) {
            // Ceață
            element.classList.add('fa-smog');
        } else if (weatherCode >= 51 && weatherCode <= 67) {
            // Ploaie
            element.classList.add('fa-cloud-rain');
        } else if (weatherCode >= 71 && weatherCode <= 77) {
            // Zăpadă
            element.classList.add('fa-snowflake');
        } else if (weatherCode >= 80 && weatherCode <= 82) {
            // Averse de ploaie
            element.classList.add('fa-cloud-showers-heavy');
        } else if (weatherCode >= 85 && weatherCode <= 86) {
            // Averse de zăpadă
            element.classList.add('fa-snowflake');
        } else if (weatherCode >= 95 && weatherCode <= 99) {
            // Furtună
            element.classList.add('fa-bolt');
        } else {
            // Default
            element.classList.add('fa-cloud');
        }
    }
    
    function getCloudinessFromWeatherCode(code) {
        if (code === 0) return 0;       // Cer senin
        if (code <= 3) return 30;      // Parțial noros
        if (code <= 48) return 80;     // Noros/ceață
        return 50;                     // Default
    }
    
    // Efect particule simple (fără bibliotecă externă)
    function initParticles() {
        const particlesContainer = document.getElementById('particles-js');
        const particleCount = window.innerWidth < 768 ? 30 : 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Poziție aleatoare
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            
            // Dimensiune aleatoare
            const size = Math.random() * 5 + 1;
            
            // Opacitate aleatoare
            const opacity = Math.random() * 0.5 + 0.1;
            
            // Viteză aleatoare
            const duration = Math.random() * 20 + 10;
            const delay = Math.random() * -20;
            
            // Culori portocalii
            const hue = Math.random() * 20 + 20; // 20-40 pe scala de hue (portocaliu)
            const color = `hsla(${hue}, 100%, 70%, ${opacity})`;
            
            particle.style.cssText = `
                position: absolute;
                top: ${posY}%;
                left: ${posX}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                animation: float ${duration}s ${delay}s infinite linear;
            `;
            
            particlesContainer.appendChild(particle);
        }
        
        // Adaugă animația CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0% {
                    transform: translate(0, 0);
                    opacity: ${Math.random() * 0.5 + 0.1};
                }
                50% {
                    transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
                    opacity: ${Math.random() * 0.7 + 0.3};
                }
                100% {
                    transform: translate(0, 0);
                    opacity: ${Math.random() * 0.5 + 0.1};
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Inițializează particulele
    initParticles();
});