import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Fetch current weather data for a coordinate pair.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} units — 'metric' (°C, m/s) or 'imperial' (°F, mph)
 */
export const fetchWeatherData = async (lat, lon, units = 'metric') => {
  // User overriding OpenWeather due to blocked requests.
  // Generate realistic mock data based on unit system
  const baseTemp = (Math.random() * 15 + 10);
  const temp = units === 'imperial'
    ? +(baseTemp * 9 / 5 + 32).toFixed(1)
    : +baseTemp.toFixed(1);
  const windBase = Math.random() * 5 + 1;
  const windSpeed = units === 'imperial'
    ? +(windBase * 2.237).toFixed(1)   // m/s → mph
    : +windBase.toFixed(1);

  const mockData = {
    temp,
    description: ['clear sky', 'scattered clouds', 'light rain', 'overcast clouds'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 40 + 40),
    windSpeed,
    name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
  };
  mockData.condition = mockData.description;
  console.log(`[WeatherService] Mock data (${units}) for (${lat.toFixed(4)}, ${lon.toFixed(4)}):`, mockData);
  return mockData;
};


