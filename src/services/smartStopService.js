/**
 * smartStopService.js — Intelligent stop planning for long routes.
 *
 * Segments a journey into 2–3 hour driving chunks, then for each segment
 * selects the best stops by category (food, gas, rest, hospital) ranked by:
 *   - proximity to the segment's ideal stop point
 *   - meal-timing relevance (lunch/dinner windows)
 *   - rating / review quality
 *
 * Returns results grouped as "upcoming" (first segment) and "later" (rest).
 */

// ─── Meal windows (24h clock) ─────────────────────────────────────
const MEAL_WINDOWS = {
  breakfast: { start: 6, end: 10 },
  lunch:     { start: 11, end: 14 },
  dinner:    { start: 17, end: 20.5 },
  lateNight: { start: 21, end: 23.5 },
};

/**
 * Determine which meal window an arrival hour falls in.
 * @param {number} hourOfDay — fractional hour (e.g. 12.5 = 12:30 PM)
 * @returns {string|null}
 */
function getMealWindow(hourOfDay) {
  for (const [meal, w] of Object.entries(MEAL_WINDOWS)) {
    if (hourOfDay >= w.start && hourOfDay <= w.end) return meal;
  }
  return null;
}

/**
 * Format a fractional hour into a readable time string.
 * @param {number} hour — e.g. 14.5 → "2:30 PM"
 */
function formatHour(hour) {
  const wrapped = ((hour % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.round((wrapped - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

const TYPE_EMOJI = {
  gas: '⛽',
  food: '🍔',
  rest: '🛑',
  hospital: '🏥',
  mechanic: '🔧',
  emergency: '🚨',
};

/**
 * Score a stop for a given segment.
 *
 * Higher is better. Factors:
 *   - How close the stop's mileMarker is to the segment's ideal stop point
 *   - Whether this stop type is relevant at this time (food→meal window)
 *   - Rating quality
 */
function scoreStop(stop, idealMileMarker, totalMiles, arrivalHour) {
  let score = 0;

  // 1. Proximity to ideal stop point (max 40 points)
  const distFromIdeal = Math.abs(stop.mileMarker - idealMileMarker);
  const maxDrift = totalMiles * 0.15; // 15% of total route
  const proxScore = Math.max(0, 1 - distFromIdeal / maxDrift);
  score += proxScore * 40;

  // 2. Timing relevance (max 30 points)
  const mealWindow = getMealWindow(arrivalHour);
  if (stop.type === 'food' && mealWindow) {
    score += 30;
    stop._mealSuggestion = mealWindow;
  } else if (stop.type === 'gas') {
    score += 15; // gas is always useful
  } else if (stop.type === 'rest') {
    score += 10;
  } else if (stop.type === 'hospital' || stop.type === 'emergency') {
    score += 5; // always good to know
  }

  // 3. Rating quality (max 20 points)
  if (stop.rating) {
    score += (stop.rating / 5) * 15;
    if (stop.reviewCount > 50) score += 3;
    if (stop.reviewCount > 200) score += 2;
  }

  // 4. Open-now bonus (max 10 points)
  if (stop.openNow === true) score += 10;
  if (stop.openNow === false) score -= 15; // penalize closed

  return score;
}

/**
 * Generate smart stop suggestions for a route.
 *
 * @param {Object} params
 * @param {Array} params.stops — all stops fetched along route, each with { name, type, mileMarker, lat, lon, rating, ... }
 * @param {number} params.totalMiles
 * @param {number} params.totalMinutes
 * @param {Date} [params.departureTime]
 * @returns {{ upcoming: Array, later: Array, segments: Array }}
 */
export function generateSmartStops({
  stops = [],
  totalMiles = 0,
  totalMinutes = 0,
  departureTime = new Date(),
}) {
  if (!stops.length || !totalMiles || !totalMinutes) {
    return { upcoming: [], later: [], segments: [] };
  }

  const departureHour = departureTime.getHours() + departureTime.getMinutes() / 60;
  const speedMph = totalMiles / (totalMinutes / 60); // average mph

  // ─── 1. Segment the journey every 2-3 hours ──────────────────
  const SEGMENT_HOURS = 2.5; // ideal stop every 2.5 hours
  const totalHours = totalMinutes / 60;
  const segmentCount = Math.max(1, Math.round(totalHours / SEGMENT_HOURS));
  const segmentMiles = totalMiles / segmentCount;

  const segments = [];
  for (let i = 0; i < segmentCount; i++) {
    const startMile = i * segmentMiles;
    const endMile = (i + 1) * segmentMiles;
    const idealStopMile = startMile + segmentMiles * 0.6; // stop ~60% through each segment
    const etaHours = idealStopMile / speedMph;
    const arrivalHour = departureHour + etaHours;

    segments.push({
      index: i,
      startMile: +startMile.toFixed(1),
      endMile: +endMile.toFixed(1),
      idealStopMile: +idealStopMile.toFixed(1),
      arrivalHour,
      arrivalTime: formatHour(arrivalHour),
      label: i === 0 ? 'First Leg' : i === segmentCount - 1 ? 'Final Leg' : `Leg ${i + 1}`,
    });
  }

  // ─── 2. For each segment, find & rank best stops ─────────────
  const allSuggestions = [];

  for (const seg of segments) {
    // Get stops within this segment's mile range (with 20% buffer on each side)
    const buffer = segmentMiles * 0.2;
    const segStops = stops.filter(
      s => s.mileMarker >= seg.startMile - buffer && s.mileMarker <= seg.endMile + buffer
    );

    // Score each stop
    const scored = segStops.map(stop => ({
      ...stop,
      _score: scoreStop(stop, seg.idealStopMile, totalMiles, seg.arrivalHour),
      _segment: seg.index,
      _segLabel: seg.label,
      _arrivalTime: seg.arrivalTime,
      _emoji: TYPE_EMOJI[stop.type] || '📍',
    }));

    // Sort by score descending
    scored.sort((a, b) => b._score - a._score);

    // Pick best per category in this segment (at most 1 gas, 2 food, 1 rest, 1 hospital)
    const limits = { gas: 1, food: 2, rest: 1, hospital: 1, mechanic: 1, emergency: 1 };
    const counts = {};
    const segBest = [];

    for (const s of scored) {
      const cat = s.type;
      counts[cat] = (counts[cat] || 0) + 1;
      if (counts[cat] <= (limits[cat] || 1)) {
        // Build a human-readable reason
        let reason = '';
        if (s._mealSuggestion) {
          reason = `Great for ${s._mealSuggestion} — arriving ~${s._arrivalTime}`;
        } else if (s.type === 'gas') {
          reason = `Refuel point — mile ${s.mileMarker}`;
        } else if (s.type === 'rest') {
          reason = `Rest stop — stretch break at mile ${s.mileMarker}`;
        } else if (s.type === 'hospital' || s.type === 'emergency') {
          reason = `Emergency services nearby — mile ${s.mileMarker}`;
        } else {
          reason = `Suggested at mile ${s.mileMarker}`;
        }

        segBest.push({ ...s, _reason: reason });
      }
    }

    allSuggestions.push(...segBest);
  }

  // ─── 3. Deduplicate by stop id ───────────────────────────────
  const seen = new Set();
  const unique = [];
  for (const s of allSuggestions) {
    const key = s.id || `${s.name}_${s.mileMarker}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  // ─── 4. Group into upcoming / later ──────────────────────────
  const upcoming = unique.filter(s => s._segment === 0);
  const later = unique.filter(s => s._segment > 0);

  console.log(`[SmartStops] Generated ${unique.length} suggestions across ${segments.length} segments (${upcoming.length} upcoming, ${later.length} later)`);

  return { upcoming, later, segments };
}
