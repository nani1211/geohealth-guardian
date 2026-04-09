import axios from 'axios';

/**
 * Validates and normalizes coordinates.
 */
function normalizeCoord(val) {
  return typeof val === 'number' ? val.toFixed(4) : parseFloat(val).toFixed(4);
}

/**
 * Fetch elevation data for an array of coordinate points.
 * Uses the free Open-Meteo Elevation API.
 * 
 * @param {Array<{lat: number, lon: number}>} points 
 * @returns {Promise<Array<number | null>>} Array of elevation in meters
 */
export async function batchFetchElevation(points) {
  if (!points || points.length === 0) return [];
  
  // Open-Meteo supports comma-separated lats & lons up to 100 points
  // Divide into chunks of maximum 100 points to be safe
  const chunkSize = 100;
  let allElevations = [];

  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize);
    const lats = chunk.map(p => normalizeCoord(p.lat)).join(',');
    const lons = chunk.map(p => normalizeCoord(p.lon)).join(',');

    try {
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
      const response = await axios.get(url);
      
      if (response.data && Array.isArray(response.data.elevation)) {
        allElevations = allElevations.concat(response.data.elevation);
      } else {
        allElevations = allElevations.concat(new Array(chunk.length).fill(null));
      }
    } catch (error) {
      console.error('[TravelMetrics] Failed to fetch elevations:', error);
      allElevations = allElevations.concat(new Array(chunk.length).fill(null));
    }
  }

  return allElevations;
}

/**
 * Fetches the sunset and sunrise times for a specific destination.
 * Uses the free sunrise-sunset.org API.
 * 
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<{sunrise: string, sunset: string, solar_noon: string} | null>}
 */
export async function fetchDestinationSunset(lat, lon) {
  try {
    // formatted=0 returns dates in ISO 8601 format (UTC)
    const url = `https://api.sunrise-sunset.org/json?lat=${normalizeCoord(lat)}&lng=${normalizeCoord(lon)}&formatted=0`;
    const response = await axios.get(url);
    
    if (response.data && response.data.status === 'OK') {
      return {
        sunrise: new Date(response.data.results.sunrise),
        sunset: new Date(response.data.results.sunset),
        solarNoon: new Date(response.data.results.solar_noon),
      };
    }
    return null;
  } catch (error) {
    console.error('[TravelMetrics] Failed to fetch sunset data:', error);
    return null;
  }
}
