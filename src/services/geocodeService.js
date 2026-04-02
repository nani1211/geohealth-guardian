import config from '@arcgis/core/config';



/**
 * geocodeService.js — Reverse geocoding via ArcGIS World Geocoding Service.
 *
 * Converts lat/lon coordinates to a human-readable address using the ArcGIS JS API locator.
 * Includes a simple cache to avoid duplicate API calls for the same location.
 */

const GEOCODE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';

// ── Simple LRU-style cache (last N results) ────────────────────────
const CACHE_SIZE = 50;
const cache = new Map();

/**
 * Build a cache key from coordinates (rounded to 4 decimal places
 * to catch "close enough" duplicate clicks).
 */
const cacheKey = (lat, lon) =>
  `${lat.toFixed(4)},${lon.toFixed(4)}`;

/**
 * Reverse-geocode a coordinate pair.
 *
 * @param {number} lat  Latitude
 * @param {number} lon  Longitude
 * @returns {Promise<Object>} Parsed address object
 */
export const reverseGeocode = async (lat, lon) => {
  const key = cacheKey(lat, lon);

  // Return cached result if available
  if (cache.has(key)) {
    console.log(`[GeocodeService] Cache hit for (${key})`);
    return cache.get(key);
  }

  try {
    const url = new URL(GEOCODE_URL);
    url.searchParams.append('location', `${lon},${lat}`);
    url.searchParams.append('f', 'json');
    if (config.apiKey) {
      url.searchParams.append('token', config.apiKey);
    }

    const res = await fetch(url.toString());
    const data = await res.json();
    
    console.log("Geocode response:", data);

    const addr = data.address || {};

    const result = {
      street: addr.Address || '',
      city: addr.City || '',
      region: addr.Region || '',
      postal: addr.Postal || '',
      country: addr.CountryCode || addr.CntryName || '',
      formatted: formatAddress(addr),
    };

    console.log(`[GeocodeService] Resolved (${key}):`, result.formatted);

    // Store in cache, evict oldest if full
    if (cache.size >= CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    cache.set(key, result);

    return result;
  } catch (error) {
    console.error('[GeocodeService] Reverse geocode failed:', error);
    return {
      street: '',
      city: '',
      region: '',
      postal: '',
      country: '',
      formatted: 'Location not identified',
    };
  }
};

/**
 * Build a clean, single-line address string from raw ArcGIS address fields.
 * Filters out empty/undefined values automatically.
 */
function formatAddress(addr) {
  if (!addr || Object.keys(addr).length === 0) return 'Location not identified';

  const parts = [
    addr.Address,
    addr.City,
    addr.Region ? `${addr.Region}${addr.Postal ? ' ' + addr.Postal : ''}` : addr.Postal,
    addr.CountryCode || addr.CntryName,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Location not identified';
}
