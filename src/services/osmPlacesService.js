/**
 * osmPlacesService.js — Fetches relevant rest stops, gas stations, hospitals, and restaurants
 * using the OpenStreetMap Overpass API as a free and highly detailed fallback.
 */

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

const OSM_TO_APP_TYPE = {
  'fuel': 'gas',
  'restaurant': 'food',
  'fast_food': 'food',
  'cafe': 'food',
  'hospital': 'hospital',
  'pharmacy': 'hospital',
  'car_repair': 'mechanic',
  'police': 'emergency',
  'rest_area': 'rest',
  'toilets': 'rest',
  'doctors': 'hospital',
  'clinic': 'hospital'
};

/**
 * Builds the Overpass QL query string
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius Radius in meters
 */
function buildOverpassQuery(lat, lon, radius) {
  // We search for nodes and ways matching specific amenities within the radius
  const amenities = "fuel|restaurant|fast_food|cafe|hospital|pharmacy|car_repair|police|rest_area|toilets|doctors|clinic";
  
  return `
    [out:json][timeout:15];
    (
      node["amenity"~"^(${amenities})$"](around:${radius},${lat},${lon});
      way["amenity"~"^(${amenities})$"](around:${radius},${lat},${lon});
      node["highway"~"^(rest_area|services)$"](around:${radius},${lat},${lon});
      way["highway"~"^(rest_area|services)$"](around:${radius},${lat},${lon});
    );
    out center;
  `;
}

/**
 * Queries practical stops for a given geographic point using OpenStreetMap.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius Radius in meters (default 5000)
 * @returns {Promise<Array>} Normalized places array
 */
export async function fetchOsmPlaces(lat, lon, radius = 5000) {
  try {
    const query = buildOverpassQuery(lat, lon, radius);
    
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[osmPlacesService] Overpass API Error:', response.status, errorText);
      return [];
    }

    const data = await response.json();
    if (!data || !data.elements) return [];

    // Map to our uniform app structure (matching Google Places payload)
    const mapped = data.elements.map(place => {
      // Determine app type mapping
      let rawType = place.tags?.amenity || place.tags?.highway || 'rest_area';
      const appType = OSM_TO_APP_TYPE[rawType] || 'rest';

      // Coordinate extraction depending on whether it's a node or a way(center)
      const latitude = place.lat || place.center?.lat;
      const longitude = place.lon || place.center?.lon;

      if (!latitude || !longitude) return null;

      // Format address if available
      let address = null;
      if (place.tags?.['addr:street']) {
        const num = place.tags['addr:housenumber'] || '';
        address = `${num} ${place.tags['addr:street']}`.trim();
        if (place.tags['addr:city']) {
          address += `, ${place.tags['addr:city']}`;
        }
      }

      return {
        id: `osm_${place.id}`, // prefix to ensure uniqueness from google
        name: place.tags?.name || 'Local Facility',
        type: appType,
        lat: latitude,
        lon: longitude,
        rating: null, // OSM generally doesn't have ratings
        reviewCount: 0,
        openNow: place.tags?.opening_hours ? (place.tags.opening_hours.includes("24/7") ? true : null) : null,
        priceLevel: null,
        address: address,
        phone: place.tags?.phone || place.tags?.['contact:phone'] || null,
        source: 'osm'
      };
    }).filter(Boolean); // remove invalid entries

    return mapped;
  } catch (err) {
    console.warn('[osmPlacesService] Failed to fetch nearby places from OSM:', err.message);
    return [];
  }
}
