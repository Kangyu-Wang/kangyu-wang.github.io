// Beijing is fixed: no geolocation or API key is needed on GitHub Pages.
(() => {
  const reading = document.getElementById("weather-reading");
  const icon = document.getElementById("weather-icon");
  const status = document.getElementById("weather-status");
  const source = document.getElementById("weather-source");
  const error = document.getElementById("weather-error");
  const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=39.90&longitude=116.40&current=temperature_2m,weather_code,is_day&timeformat=unixtime";
  const cacheKey = "kw.beijing.weather.v1";
  const maxAge = 30 * 60 * 1000;
  const descriptions = {
    0: "clear", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "rime fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    56: "light freezing drizzle", 57: "heavy freezing drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    66: "light freezing rain", 67: "heavy freezing rain",
    71: "light snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
    80: "light rain showers", 81: "rain showers", 82: "heavy rain showers",
    85: "light snow showers", 86: "heavy snow showers",
    95: "thunderstorms", 96: "thunderstorms with hail", 99: "thunderstorms with heavy hail"
  };

  function isCurrent(observation) {
    if (!observation || !Number.isFinite(observation.temperature_2m) || !Number.isFinite(observation.time)) return false;
    const age = Date.now() - observation.time * 1000;
    return age >= -5 * 60 * 1000 && age < maxAge;
  }

  function weatherIcon(code, isDay) {
    if (code === 0 || code === 1) return isDay ? "☀︎" : "☾";
    if (code <= 3) return "☁︎";
    if (code === 45 || code === 48) return "≋";
    if (code >= 95) return "ϟ";
    if ((code >= 71 && code <= 77) || code >= 85) return "❄︎";
    return "☂︎";
  }

  function show(observation) {
    const code = observation.weather_code;
    const condition = descriptions[code];
    const degrees = Math.round(observation.temperature_2m);
    const text = condition ? degrees + "°C, " + condition : degrees + "°C";
    icon.textContent = condition ? weatherIcon(code, observation.is_day) + " " : "";
    reading.textContent = text;
    const observedAt = new Date(observation.time * 1000).toLocaleString("en-GB", {
      timeZone: "Asia/Shanghai", dateStyle: "medium", timeStyle: "short"
    });
    source.title = "Weather data by Open-Meteo · CC BY 4.0 · " + observedAt + " (Beijing)";
    error.hidden = true;
    source.hidden = false;
    status.hidden = false;
  }

  async function update() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey));
      if (isCurrent(cached)) {
        show(cached);
        return;
      }
    } catch {
      // Weather still works when the browser disables session storage.
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(endpoint, { signal: controller.signal });
      if (!response.ok) throw new Error("Weather unavailable");
      const { current } = await response.json();
      if (!isCurrent(current)) throw new Error("No current reading");
      show(current);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(current));
      } catch {
        // Saving the reading is optional.
      }
    } catch {
      source.hidden = true;
      error.hidden = false;
      status.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  update();
  // Recheck an open tab and a page restored from the browser's back cache.
  setInterval(() => { if (!document.hidden) update(); }, maxAge);
  window.addEventListener("pageshow", event => { if (event.persisted) update(); });
})();
