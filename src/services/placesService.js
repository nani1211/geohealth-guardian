/**
 * placesService.js — Fetches relevant rest stops, gas stations, and restaurants
 * along a route or near a user using Google Places API.
 *
 * Includes a geohash-based localStorage cache to minimize redundant API calls.
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const CATEGORY_MAP = {
  'gas_station': 'gas',
  'restaurant': 'food',
  'rest_stop': 'rest',
  'convenience_store': 'rest',
  'food': 'food',
  'hospital': 'hospital',
  'pharmacy': 'hospital',
  'car_repair': 'mechanic',
  'police': 'emergency'
};

// ─── Cache Configuration ──────────────────────────────────────────
const CACHE_KEY_PREFIX = 'gh_places_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const COORD_PRECISION = 3;            // ~110m grid cells

/**
 * Generate a cache key by rounding coords to a grid cell.
 * Nearby queries within ~110m of each other will hit the same cache.
 */
function makeCacheKey(lat, lon, radius) {
  const rLat = lat.toFixed(COORD_PRECISION);
  const rLon = lon.toFixed(COORD_PRECISION);
  return `${CACHE_KEY_PREFIX}${rLat}_${rLon}_${radius}`;
}

function getCachedPlaces(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null; // expired
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedPlaces(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // localStorage full — evict oldest cache entries
    evictOldestCache();
    try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })); } catch { /* give up */ }
  }
}

function evictOldestCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const { timestamp } = JSON.parse(localStorage.getItem(k));
        keys.push({ key: k, timestamp });
      } catch { keys.push({ key: k, timestamp: 0 }); }
    }
  }
  // Remove the 10 oldest entries
  keys.sort((a, b) => a.timestamp - b.timestamp);
  keys.slice(0, 10).forEach((e) => localStorage.removeItem(e.key));
}

import { fetchOsmPlaces } from './osmPlacesService.js';

/**
 * Queries practical stops for a given geographic point.
 * Uses OpenStreetMap Overpass as primary, falls back to Google Places API.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius Radius in meters (max 50,000)
 * @returns {Promise<Array>}
 */
export async function fetchNearbyPlaces(lat, lon, radius = 5000) {
  // ── Check cache first ─────────────────────────────────────────
  const cacheKey = makeCacheKey(lat, lon, radius);
  const cached = getCachedPlaces(cacheKey);
  if (cached) {
    console.log(`[PlacesService] Cache HIT for (${lat.toFixed(3)}, ${lon.toFixed(3)}) r=${radius}`);
    return cached;
  }

  // 1. Try OpenStreetMap (Primary)
  let mapped = await fetchOsmPlaces(lat, lon, radius);
  
  // 2. Fallback to Google Places if OSM returns empty (rural areas) and key exists
  if (mapped.length === 0 && GOOGLE_API_KEY) {
    console.log(`[PlacesService] OSM returned 0 results. Falling back to Google Places...`);
    const payload = {
      includedTypes: ['gas_station', 'restaurant', 'rest_stop', 'convenience_store', 'hospital', 'pharmacy', 'car_repair', 'police'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lon },
          radius: radius,
        }
      }
    };

    try {
      const response = await fetch(PLACES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.primaryType,places.rating,places.userRatingCount,places.regularOpeningHours,places.priceLevel,places.formattedAddress,places.nationalPhoneNumber'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const places = data.places || [];

        mapped = places.map(place => {
          const appType = CATEGORY_MAP[place.primaryType] || 'rest';
          const openNow = place.regularOpeningHours?.openNow ?? null;
          const PRICE_MAP = {
            'PRICE_LEVEL_FREE': 'Free',
            'PRICE_LEVEL_INEXPENSIVE': '$',
            'PRICE_LEVEL_MODERATE': '$$',
            'PRICE_LEVEL_EXPENSIVE': '$$$',
            'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$',
          };

          return {
            id: place.id,
            name: place.displayName?.text || 'Unknown Place',
            type: appType,
            lat: place.location?.latitude,
            lon: place.location?.longitude,
            rating: place.rating ?? null,
            reviewCount: place.userRatingCount ?? 0,
            openNow,
            priceLevel: PRICE_MAP[place.priceLevel] || null,
            address: place.formattedAddress || null,
            phone: place.nationalPhoneNumber || null,
            source: 'google'
          };
        });
      }
    } catch (err) {
      console.warn('[PlacesService] Google fallback failed:', err.message);
    }
  }

  // ── Store in cache ──────────────────────────────────────────
  if (mapped.length > 0) {
    setCachedPlaces(cacheKey, mapped);
    console.log(`[PlacesService] Cache STORED for (${lat.toFixed(3)}, ${lon.toFixed(3)}) r=${radius} — ${mapped.length} places (source: ${mapped[0]?.source || 'osm'})`);
  }

  return mapped;
}

/**
 * Batch-fetches stops across an array of route points, controlling concurrency.
 * @param {Array<{lat, lon, mileMarker}>} points
 * @param {number} concurrency
 * @returns {Promise<Array>} A single continuous array of unique stops.
 */
export async function batchFetchRouteStops(points, concurrency = 3) {
  const allStops = [];
  
  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency);
    
    // Fetch stops for each point in the batch
    const batchResults = await Promise.all(
      batch.map(async (pt) => {
        const stops = await fetchNearbyPlaces(pt.lat, pt.lon, 4000); // 4km search radius per mile marker
        
        // Limit stops per type at this specific mile marker to prioritize the closest/best few.
        const filteredStops = [];
        const counts = { gas: 0, food: 0, rest: 0, emergency: 0, hospital: 0, mechanic: 0 };
        
        for (const s of stops) {
          if (counts[s.type] < 2) {
            counts[s.type]++;
            filteredStops.push({ ...s, mileMarker: pt.mileMarker });
          }
        }
        return filteredStops;
      })
    );
    
    // Flatten the batch results
    batchResults.forEach(stops => allStops.push(...stops));
  }
  
  // Deduplicate stops by unique Place ID, keeping the earliest occurrence
  const uniqueStops = [];
  const seenIds = new Set();
  
  for (const stop of allStops) {
    if (!seenIds.has(stop.id)) {
      seenIds.add(stop.id);
      uniqueStops.push(stop);
    }
  }

  // Sort them loosely by mile marker
  uniqueStops.sort((a, b) => a.mileMarker - b.mileMarker);

  return uniqueStops;
}
