/**
 * nwsAlertService.js — National Weather Service active alerts.
 *
 * Completely free, no API key required.
 * Covers: tornadoes, floods, road closures, winter storms, heat/cold advisories,
 * severe thunderstorms, fire weather, and all other NWS alert types.
 */

const NWS_BASE = 'https://api.weather.gov';
const APP_AGENT = '(GeoHealthGuardian, contact@geohealth.dev)';

// Severity mapping to our internal score system
const SEVERITY_MAP = {
  'Extreme':  { score: 3, color: [127, 29, 29],  label: 'Extreme' },
  'Severe':   { score: 3, color: [220, 38, 38],  label: 'Severe' },
  'Moderate': { score: 2, color: [234, 88, 12],  label: 'Moderate' },
  'Minor':    { score: 1, color: [202, 138, 4],   label: 'Minor' },
  'Unknown':  { score: 0, color: [100, 100, 100], label: 'Unknown' },
};

// Icons for common alert event types
const EVENT_ICONS = {
  'Tornado': '🌪️',
  'Flood': '🌊',
  'Flash Flood': '🌊',
  'Severe Thunderstorm': '⛈️',
  'Winter Storm': '❄️',
  'Blizzard': '❄️',
  'Ice Storm': '🧊',
  'Heat': '🔥',
  'Excessive Heat': '🔥',
  'Wind': '💨',
  'High Wind': '💨',
  'Hurricane': '🌀',
  'Tropical Storm': '🌀',
  'Fire Weather': '🔥',
  'Red Flag': '🚩',
  'Dense Fog': '🌫️',
  'Dust Storm': '🌫️',
};

function getEventIcon(event = '') {
  for (const [key, icon] of Object.entries(EVENT_ICONS)) {
    if (event.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '⚠️';
}

/**
 * Fetch active NWS alerts for a single lat/lon point.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Array<{ id, event, severity, headline, description, instruction, icon, areaDesc, onset, expires }>>}
 */
export async function fetchNWSAlerts(lat, lon) {
  try {
    const url = `${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}&status=actual`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': APP_AGENT,
        'Accept': 'application/geo+json',
      },
    });

    if (!response.ok) {
      console.warn(`[NWS] API returned ${response.status} for (${lat}, ${lon})`);
      return [];
    }

    const data = await response.json();
    const features = data.features || [];

    return features.map((f) => {
      const props = f.properties || {};
      const severity = SEVERITY_MAP[props.severity] || SEVERITY_MAP['Unknown'];

      return {
        id: props.id || f.id,
        event: props.event || 'Unknown Alert',
        severity: severity,
        headline: props.headline || props.event || '',
        description: props.description || '',
        instruction: props.instruction || '',
        icon: getEventIcon(props.event),
        areaDesc: props.areaDesc || '',
        onset: props.onset,
        expires: props.expires,
        urgency: props.urgency,
        certainty: props.certainty,
      };
    });
  } catch (err) {
    console.warn('[NWS] Alert fetch failed:', err.message);
    return [];
  }
}

/**
 * Batch-fetch NWS alerts for multiple route sample points.
 * Deduplicates alerts by ID (same alert covers large zones).
 *
 * @param {Array<{lat, lon, mileMarker}>} points
 * @param {number} concurrency
 * @returns {Promise<Array>} Unique alerts with mileMarker attached
 */
export async function batchFetchRouteAlerts(points, concurrency = 3) {
  const allAlerts = [];
  const seenIds = new Set();

  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (pt) => {
        const alerts = await fetchNWSAlerts(pt.lat, pt.lon);
        return alerts.map((a) => ({ ...a, mileMarker: pt.mileMarker }));
      })
    );

    for (const alertSet of batchResults) {
      for (const alert of alertSet) {
        if (!seenIds.has(alert.id)) {
          seenIds.add(alert.id);
          allAlerts.push(alert);
        }
      }
    }
  }

  // Sort by severity (worst first)
  allAlerts.sort((a, b) => b.severity.score - a.severity.score);

  return allAlerts;
}
