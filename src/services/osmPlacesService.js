/**
 * osmPlacesService.js — Primary places data source using OpenStreetMap Overpass API.
 *
 * Fetches restaurants, fuel stations, hospitals, rest areas, and other
 * practical stops. Results are normalized to the app's uniform schema:
 * { id, name, lat, lon, type, rating, reviewCount, openNow, priceLevel, address, phone, source }
 *
 * If the primary Overpass endpoint fails, a mirror is tried automatically.
 */

// ─── Endpoints (primary + fallback mirror) ────────────────────────
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// ─── OSM tag → app category mapping ──────────────────────────────
const OSM_TO_APP_TYPE = {
  fuel:        'gas',
  restaurant:  'food',
  fast_food:   'food',
  cafe:        'food',
  food_court:  'food',
  hospital:    'hospital',
  pharmacy:    'hospital',
  doctors:     'hospital',
  clinic:      'hospital',
  dentist:     'hospital',
  car_repair:  'mechanic',
  car_wash:    'mechanic',
  police:      'emergency',
  fire_station:'emergency',
  rest_area:   'rest',
  toilets:     'rest',
  services:    'rest',       // highway=services
};

// ─── Human-readable fallback names per type ───────────────────────
const TYPE_FALLBACK_NAMES = {
  fuel:        'Gas Station',
  restaurant:  'Restaurant',
  fast_food:   'Fast Food',
  cafe:        'Café',
  food_court:  'Food Court',
  hospital:    'Hospital',
  pharmacy:    'Pharmacy',
  doctors:     'Doctor\'s Office',
  clinic:      'Clinic',
  dentist:     'Dentist',
  car_repair:  'Auto Repair',
  car_wash:    'Car Wash',
  police:      'Police Station',
  fire_station:'Fire Station',
  rest_area:   'Rest Area',
  toilets:     'Restroom',
  services:    'Service Area',
};

// ─── Build Overpass QL query ──────────────────────────────────────
const AMENITY_LIST = Object.keys(OSM_TO_APP_TYPE)
  .filter(k => !['rest_area', 'services'].includes(k))
  .join('|');

function buildOverpassQuery(lat, lon, radius) {
  return `
    [out:json][timeout:15];
    (
      node["amenity"~"^(${AMENITY_LIST})$"](around:${radius},${lat},${lon});
      way["amenity"~"^(${AMENITY_LIST})$"](around:${radius},${lat},${lon});
      node["highway"~"^(rest_area|services)$"](around:${radius},${lat},${lon});
      way["highway"~"^(rest_area|services)$"](around:${radius},${lat},${lon});
    );
    out center;
  `;
}

// ─── Parse opening_hours tag ─────────────────────────────────────
function parseOpenNow(openingHoursTag) {
  if (!openingHoursTag) return null;

  const raw = openingHoursTag.trim();

  // Definite cases
  if (raw === '24/7') return true;
  if (/^off$/i.test(raw)) return false;

  // Try basic time-range parsing for common formats like "Mo-Fr 08:00-18:00"
  try {
    const now = new Date();
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const todayAbbr = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Split rules by semicolon
    const rules = raw.split(';').map(r => r.trim());

    for (const rule of rules) {
      // Match patterns like "Mo-Fr 09:00-17:00" or "Sa 10:00-14:00"
      const match = rule.match(/^([A-Za-z, -]+)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!match) continue;

      const [, dayPart, startH, startM, endH, endM] = match;

      // Check if today is in the day range
      const dayRanges = dayPart.split(',').map(d => d.trim());
      let todayMatches = false;

      for (const dr of dayRanges) {
        if (dr.includes('-')) {
          const [from, to] = dr.split('-').map(d => d.trim());
          const fromIdx = dayNames.indexOf(from);
          const toIdx = dayNames.indexOf(to);
          const todayIdx = dayNames.indexOf(todayAbbr);
          if (fromIdx >= 0 && toIdx >= 0 && todayIdx >= 0) {
            if (fromIdx <= toIdx) {
              todayMatches = todayIdx >= fromIdx && todayIdx <= toIdx;
            } else {
              // wraps around (e.g., Fr-Mo)
              todayMatches = todayIdx >= fromIdx || todayIdx <= toIdx;
            }
          }
        } else if (dr === todayAbbr) {
          todayMatches = true;
        }
        if (todayMatches) break;
      }

      if (todayMatches) {
        const openMin = parseInt(startH) * 60 + parseInt(startM);
        const closeMin = parseInt(endH) * 60 + parseInt(endM);
        return currentMinutes >= openMin && currentMinutes <= closeMin;
      }
    }
  } catch {
    // Parsing failed — return null (unknown)
  }

  return null;
}

// ─── Format address from OSM tags ────────────────────────────────
function formatAddress(tags) {
  if (!tags) return null;

  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street'])      parts.push(tags['addr:street']);

  const line1 = parts.join(' ');

  const cityParts = [];
  if (tags['addr:city'])     cityParts.push(tags['addr:city']);
  if (tags['addr:state'])    cityParts.push(tags['addr:state']);
  if (tags['addr:postcode']) cityParts.push(tags['addr:postcode']);

  const line2 = cityParts.join(', ');

  if (line1 && line2) return `${line1}, ${line2}`;
  if (line1) return line1;
  if (line2) return line2;
  return null;
}

// ─── Normalize a single OSM element ──────────────────────────────
function normalizeElement(el) {
  const tags = el.tags || {};

  // Determine raw OSM type from amenity or highway tag
  const rawType = tags.amenity || tags.highway || 'rest_area';
  const appType = OSM_TO_APP_TYPE[rawType] || 'rest';

  // Coordinates: nodes have lat/lon directly; ways use center
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  if (lat == null || lon == null) return null;

  // Name with smart fallback
  let name = tags.name || tags['name:en'];
  if (!name) {
    // Use brand name if available (common for chains like Shell, McDonald's)
    name = tags.brand || tags.operator;
  }
  if (!name) {
    // Final fallback: descriptive type label
    name = TYPE_FALLBACK_NAMES[rawType] || 'Local Stop';
  }

  return {
    id: `osm_${el.type || 'node'}_${el.id}`,
    name,
    type: appType,
    lat,
    lon,
    rating: null,
    reviewCount: 0,
    openNow: parseOpenNow(tags.opening_hours),
    priceLevel: null,
    address: formatAddress(tags),
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    cuisine: tags.cuisine || null,
    source: 'osm',
  };
}

// ─── Main fetch function ─────────────────────────────────────────
/**
 * Fetch nearby places from OpenStreetMap via Overpass API.
 *
 * Tries the primary endpoint first, falls back to a mirror if it fails.
 * Returns a normalized array matching the app's place schema.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius — search radius in meters (default 5000)
 * @returns {Promise<Array>} normalized places
 */
export async function fetchOsmPlaces(lat, lon, radius = 5000) {
  const query = buildOverpassQuery(lat, lon, radius);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.warn(`[OSM] ${endpoint} returned ${response.status}, trying next...`);
        continue;
      }

      const data = await response.json();
      if (!data?.elements?.length) {
        console.log(`[OSM] ${endpoint} returned 0 elements for (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
        return [];
      }

      // Normalize and filter
      const places = data.elements
        .map(normalizeElement)
        .filter(Boolean);

      // Deduplicate by name+type within ~100m
      const deduped = deduplicatePlaces(places);

      console.log(`[OSM] Fetched ${deduped.length} places near (${lat.toFixed(3)}, ${lon.toFixed(3)}) r=${radius}m`);
      return deduped;

    } catch (err) {
      console.warn(`[OSM] ${endpoint} failed:`, err.message);
      continue;
    }
  }

  // All endpoints failed
  console.warn('[OSM] All Overpass endpoints failed');
  return [];
}

// ─── Deduplication ───────────────────────────────────────────────
/**
 * Remove near-duplicates: same name+type within ~150m of each other.
 * Keeps the first occurrence (which is typically from a node, more precise).
 */
function deduplicatePlaces(places) {
  const kept = [];
  const seen = new Map(); // key: "name|type" → array of coords

  for (const p of places) {
    const key = `${p.name.toLowerCase()}|${p.type}`;
    const existing = seen.get(key);

    if (existing) {
      // Check if any existing entry is within ~150m
      const tooClose = existing.some(([eLat, eLon]) => {
        const dLat = Math.abs(p.lat - eLat);
        const dLon = Math.abs(p.lon - eLon);
        return dLat < 0.0015 && dLon < 0.0015; // ~150m
      });
      if (tooClose) continue;
      existing.push([p.lat, p.lon]);
    } else {
      seen.set(key, [[p.lat, p.lon]]);
    }

    kept.push(p);
  }

  return kept;
}
