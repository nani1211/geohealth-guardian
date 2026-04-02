/**
 * diseaseService.js — Mock CDC/WHO disease outbreak data for the US.
 *
 * Returns realistic outbreak data with varying severities.
 * Each outbreak includes coordinates, disease name, case count,
 * severity level, and region name.
 */

const OUTBREAKS = [
  // ── Influenza ────────────────────────────────────────────────────
  { lat: 40.7128, lon: -74.0060, disease: 'Influenza A (H3N2)',   cases: 4200, severity: 'critical', region: 'New York, NY' },
  { lat: 41.8781, lon: -87.6298, disease: 'Influenza A (H1N1)',   cases: 3100, severity: 'high',     region: 'Chicago, IL' },
  { lat: 47.6062, lon: -122.3321, disease: 'Influenza B',          cases: 1800, severity: 'high',     region: 'Seattle, WA' },
  { lat: 39.7392, lon: -104.9903, disease: 'Influenza A (H3N2)',   cases: 950,  severity: 'medium',   region: 'Denver, CO' },

  // ── COVID-19 ─────────────────────────────────────────────────────
  { lat: 34.0522, lon: -118.2437, disease: 'COVID-19 (JN.1)',      cases: 5800, severity: 'critical', region: 'Los Angeles, CA' },
  { lat: 29.7604, lon: -95.3698,  disease: 'COVID-19 (JN.1)',      cases: 3400, severity: 'high',     region: 'Houston, TX' },
  { lat: 25.7617, lon: -80.1918,  disease: 'COVID-19 (KP.2)',      cases: 2900, severity: 'high',     region: 'Miami, FL' },
  { lat: 33.4484, lon: -112.0740, disease: 'COVID-19 (KP.2)',      cases: 1100, severity: 'medium',   region: 'Phoenix, AZ' },
  { lat: 36.1627, lon: -86.7816,  disease: 'COVID-19 (JN.1)',      cases: 620,  severity: 'low',      region: 'Nashville, TN' },

  // ── RSV ──────────────────────────────────────────────────────────
  { lat: 42.3601, lon: -71.0589,  disease: 'RSV',                  cases: 2200, severity: 'high',     region: 'Boston, MA' },
  { lat: 38.9072, lon: -77.0369,  disease: 'RSV',                  cases: 1500, severity: 'medium',   region: 'Washington, DC' },
  { lat: 35.2271, lon: -80.8431,  disease: 'RSV',                  cases: 780,  severity: 'medium',   region: 'Charlotte, NC' },
  { lat: 44.9778, lon: -93.2650,  disease: 'RSV',                  cases: 420,  severity: 'low',      region: 'Minneapolis, MN' },

  // ── West Nile Virus ──────────────────────────────────────────────
  { lat: 32.7767, lon: -96.7970,  disease: 'West Nile Virus',      cases: 340,  severity: 'medium',   region: 'Dallas, TX' },
  { lat: 36.1699, lon: -115.1398, disease: 'West Nile Virus',      cases: 180,  severity: 'low',      region: 'Las Vegas, NV' },
  { lat: 35.4676, lon: -97.5164,  disease: 'West Nile Virus',      cases: 95,   severity: 'low',      region: 'Oklahoma City, OK' },

  // ── Norovirus ────────────────────────────────────────────────────
  { lat: 37.7749, lon: -122.4194, disease: 'Norovirus GII.4',      cases: 1900, severity: 'high',     region: 'San Francisco, CA' },
  { lat: 39.9526, lon: -75.1652,  disease: 'Norovirus GII.4',      cases: 1200, severity: 'medium',   region: 'Philadelphia, PA' },

  // ── Mpox ─────────────────────────────────────────────────────────
  { lat: 33.7490, lon: -84.3880,  disease: 'Mpox (Clade IIb)',     cases: 280,  severity: 'medium',   region: 'Atlanta, GA' },
  { lat: 30.2672, lon: -97.7431,  disease: 'Mpox (Clade IIb)',     cases: 150,  severity: 'low',      region: 'Austin, TX' },
];

/**
 * Returns all disease outbreak data points.
 * In production, this would call a CDC or WHO API endpoint.
 */
export const getDiseaseOutbreaks = () => {
  console.log(`[DiseaseService] Returning ${OUTBREAKS.length} outbreak records (mock data)`);
  return OUTBREAKS;
};

/**
 * Severity → color mapping used by the graphics layer.
 */
export const SEVERITY_COLORS = {
  low:      [34, 197, 94, 0.8],    // green-500
  medium:   [234, 179, 8, 0.8],    // yellow-500
  high:     [249, 115, 22, 0.8],   // orange-500
  critical: [239, 68, 68, 0.9],    // red-500
};

export const SEVERITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
