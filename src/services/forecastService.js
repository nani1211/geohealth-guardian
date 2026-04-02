import axios from 'axios';

/**
 * forecastService.js — 14-day weather forecast.
 *
 * Uses OpenWeather One Call API when an API key is present,
 * otherwise falls back to realistic mock data.
 */

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const ONE_CALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

const CONDITIONS = [
  { desc: 'Clear Sky',         icon: '☀️' },
  { desc: 'Partly Cloudy',    icon: '⛅' },
  { desc: 'Scattered Clouds', icon: '🌤️' },
  { desc: 'Overcast Clouds',  icon: '☁️' },
  { desc: 'Light Rain',       icon: '🌦️' },
  { desc: 'Rain',             icon: '🌧️' },
  { desc: 'Thunderstorm',     icon: '⛈️' },
  { desc: 'Snow',             icon: '❄️' },
];

/**
 * Generate mock 14-day forecast seeded from a base temperature.
 * @param {string} units — 'metric' or 'imperial'
 */
function generateMockForecast(lat, lon, units = 'metric') {
  const baseTemp = 12 + Math.sin(lat * 0.05) * 10; // varies by latitude
  const days = [];
  const now = new Date();

  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    const highC = +(baseTemp + drift + 4 + Math.random() * 2).toFixed(1);
    const lowC = +(baseTemp + drift - 3 - Math.random() * 2).toFixed(1);
    const high = units === 'imperial' ? +(highC * 9 / 5 + 32).toFixed(1) : highC;
    const low = units === 'imperial' ? +(lowC * 9 / 5 + 32).toFixed(1) : lowC;
    const cond = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];

    days.push({
      date: date.toISOString().slice(0, 10),              // "2026-03-27"
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }), // "Thu"
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), // "Mar 27"
      high,
      low,
      condition: cond.desc,
      icon: cond.icon,
      humidity: Math.floor(40 + Math.random() * 40),
    });
  }

  console.log(`[ForecastService] Generated 14-day mock forecast for (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  return days;
}

/**
 * Fetch a 14-day forecast for a location.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Array>} Array of daily forecast objects
 */
export const fetchForecast = async (lat, lon, units = 'metric') => {
  if (!API_KEY) {
    return generateMockForecast(lat, lon, units);
  }

  try {
    const response = await axios.get(ONE_CALL_URL, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        units,
        exclude: 'minutely,hourly,alerts',
      },
    });

    const dailyData = response.data.daily || [];
    return dailyData.slice(0, 14).map((d) => {
      const date = new Date(d.dt * 1000);
      return {
        date: date.toISOString().slice(0, 10),
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        high: +d.temp.max.toFixed(1),
        low: +d.temp.min.toFixed(1),
        condition: d.weather[0]?.description || 'N/A',
        icon: mapWeatherIcon(d.weather[0]?.main),
        humidity: d.humidity,
      };
    });
  } catch (error) {
    console.warn('[ForecastService] API failed, falling back to mock data:', error.message);
    return generateMockForecast(lat, lon);
  }
};

/**
 * Map OpenWeather main condition to an emoji icon.
 */
function mapWeatherIcon(main) {
  const map = {
    Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
    Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
  };
  return map[main] || '🌤️';
}
