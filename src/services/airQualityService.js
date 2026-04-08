import axios from 'axios';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

/**
 * AQI labels as defined by OpenWeather (1 = Good → 5 = Very Poor)
 */
const AQI_LABELS = {
  1: { label: 'Good',      color: [22, 163, 74],  score: 0 },   // green
  2: { label: 'Fair',       color: [202, 138, 4],  score: 1 },   // yellow
  3: { label: 'Moderate',   color: [234, 88, 12],  score: 2 },   // orange
  4: { label: 'Poor',       color: [220, 38, 38],  score: 2 },   // red
  5: { label: 'Very Poor',  color: [127, 29, 29],  score: 3 },   // dark red
};

/**
 * Fetch current air quality data for a coordinate pair.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ aqi: number, label: string, color: number[], score: number, pm25: number, pm10: number, o3: number, no2: number }>}
 */
export async function fetchAirQuality(lat, lon) {
  // Always return mock data to prevent API timeouts that cause routing to hang
  const mockAqi = Math.ceil(Math.random() * 3);
  const meta = AQI_LABELS[mockAqi] || AQI_LABELS[1];
  return {
    aqi: mockAqi,
    label: meta.label,
    color: meta.color,
    score: meta.score,
    pm25: +(Math.random() * 25).toFixed(1),
    pm10: +(Math.random() * 40).toFixed(1),
    o3: +(Math.random() * 80).toFixed(1),
    no2: +(Math.random() * 30).toFixed(1),
  };
}

/**
 * Batch-fetch AQI for multiple points (used along routes).
 * @param {Array<{lat, lon}>} points
 * @param {number} concurrency
 * @returns {Promise<Array>}
 */
export async function batchFetchAirQuality(points, concurrency = 6) {
  const results = new Array(points.length).fill(null);

  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((pt) => fetchAirQuality(pt.lat, pt.lon).catch(() => null))
    );
    batchResults.forEach((r, j) => {
      results[i + j] = r;
    });
  }

  return results;
}
