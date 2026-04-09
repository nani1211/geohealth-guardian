import config from '@arcgis/core/config';

const ARCGIS_FORWARD_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';


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

// ── Photon (Komoot) Free Open-Source Autocomplete Search ────────────────────────

export const suggestAddresses = async (query) => {
  if (!query || query.length < 3) return [];
  
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    const data = await res.json();
    return data.features.map((f, index) => {
      const p = f.properties;
      const context = [p.city, p.state, p.country].filter(Boolean).join(', ');
      const name = p.name || p.street || p.city || 'Unknown place';
      return {
        id: p.osm_id || index,
        name: name,
        context: context,
        label: context ? `${name}, ${context}` : name,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
    });
  } catch (error) {
    console.error('[Photon] Suggestion failed:', error);
    return [];
  }
};

/**
 * Perform a zero-cost geocode lookup using Photon or return cached lat/lon.
 * Falls back to ArcGIS World Geocoder when Photon returns 0 results (e.g. precise street addresses).
 */
export const photonGeocode = async (address) => {
  const key = `geo_${address.toLowerCase().trim()}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    console.log('[Photon] Cache hit for address:', address);
    return JSON.parse(cached);
  }

  // ── Photon first ────────────────────────────────────────────────
  try {
    console.log('[Photon] Fetching geocode for address:', address);
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const f = data.features[0];
      const result = {
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      };
      localStorage.setItem(key, JSON.stringify(result));
      return result;
    }
    console.warn('[Photon] No results, falling back to ArcGIS geocoder for:', address);
  } catch (error) {
    console.warn('[Photon] Request failed, falling back to ArcGIS geocoder:', error);
  }

  // ── ArcGIS World Geocoder fallback ───────────────────────────────
  try {
    const url = new URL(ARCGIS_FORWARD_URL);
    url.searchParams.append('SingleLine', address);
    url.searchParams.append('outFields', 'Match_addr,StAddr,City,Region,Postal');
    url.searchParams.append('maxLocations', '1');
    url.searchParams.append('f', 'json');
    if (config.apiKey) url.searchParams.append('token', config.apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();
    const top = data.candidates?.[0];
    if (top && top.score >= 60 && top.location) {
      const result = {
        lat: top.location.y,
        lon: top.location.x,
      };
      localStorage.setItem(key, JSON.stringify(result));
      console.log('[ArcGIS Geocoder] Fallback resolved:', top.address);
      return result;
    }
    console.error('[ArcGIS Geocoder] Fallback also returned no results for:', address);
    return null;
  } catch (err) {
    console.error('[ArcGIS Geocoder] Fallback failed:', err);
    return null;
  }
};
