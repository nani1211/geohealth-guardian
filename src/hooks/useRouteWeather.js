import { useCallback } from 'react';
import * as turf from '@turf/turf';
import useAppStore from '../store/useAppStore';
import { forwardGeocode, getRoute } from '../services/routeService';
import { fetchWeatherData } from '../services/weatherService';
import { batchFetchRouteStops } from '../services/placesService';
import { batchFetchAirQuality } from '../services/airQualityService';
import { generateMealRecommendations } from '../services/mealAdvisor';

// ─── 3-tier severity classification ───────────────────────────────
// severe  → storm, heavy rain, snow, tornado, hurricane, blizzard
// moderate → rain, wind, fog, drizzle, mist, overcast
// low     → clear, partly cloudy, sunny, fair
function classifySeverity(description = '') {
  const d = description.toLowerCase();

  // Severe — dangerous conditions
  if (/thunderstorm|tornado|hurricane|blizzard|heavy\s*rain|heavy\s*snow|ice\s*storm|hail/.test(d))
    return { tier: 'severe', score: 3, color: [220, 38, 38], label: 'Severe' };

  if (/snow|sleet|ice|freezing/.test(d))
    return { tier: 'severe', score: 3, color: [220, 38, 38], label: 'Severe' };

  // Moderate — suboptimal but manageable
  if (/rain|shower|drizzle/.test(d))
    return { tier: 'moderate', score: 2, color: [234, 88, 12], label: 'Moderate' };

  if (/wind|fog|mist|haze|overcast|cloud/.test(d))
    return { tier: 'moderate', score: 2, color: [234, 88, 12], label: 'Moderate' };

  // Low — clear/fair
  return { tier: 'low', score: 0, color: [22, 163, 74], label: 'Clear' };
}

// ─── Compute route risk level from severity array ─────────────────
function computeRiskLevel(weatherPoints) {
  if (!weatherPoints || weatherPoints.length === 0) return 'low';

  const severeCount = weatherPoints.filter(p => p.severity?.tier === 'severe').length;
  const moderateCount = weatherPoints.filter(p => p.severity?.tier === 'moderate').length;
  const total = weatherPoints.length;

  // High risk:  > 30% severe OR > 50% moderate+severe
  if (severeCount > total * 0.3) return 'high';
  if ((severeCount + moderateCount) > total * 0.5) return 'high';

  // Medium risk: any severe OR > 30% moderate
  if (severeCount > 0) return 'medium';
  if (moderateCount > total * 0.3) return 'medium';

  return 'low';
}

// ─── Turf-based route sampling ────────────────────────────────────
// Samples a point every `intervalKm` kilometers along the route polyline.
function sampleRouteWithTurf(paths, intervalKm = 8) {
  // Flatten ArcGIS paths [[[lon,lat], ...]] → [[lon,lat], ...]
  const coords = [];
  for (const part of paths) {
    if (Array.isArray(part) && Array.isArray(part[0])) {
      for (const pt of part) coords.push(pt.slice(0, 2)); // [lon, lat]
    }
  }

  if (coords.length < 2) return [];

  const line = turf.lineString(coords);
  const totalKm = turf.length(line, { units: 'kilometers' });
  const totalMiles = turf.length(line, { units: 'miles' });

  const points = [];

  // Always include route start
  points.push({
    lon: coords[0][0],
    lat: coords[0][1],
    mileMarker: 0,
    kmMarker: 0,
  });

  // Walk along the line at `intervalKm` steps
  for (let km = intervalKm; km < totalKm; km += intervalKm) {
    const pt = turf.along(line, km, { units: 'kilometers' });
    const [lon, lat] = pt.geometry.coordinates;
    const mileMarker = +(km * 0.621371).toFixed(1);
    points.push({ lon, lat, mileMarker, kmMarker: +km.toFixed(1) });
  }

  // Always include route end
  const last = coords[coords.length - 1];
  const lastExisting = points[points.length - 1];
  const distFromLast = turf.distance(
    turf.point([lastExisting.lon, lastExisting.lat]),
    turf.point([last[0], last[1]]),
    { units: 'kilometers' }
  );

  // Only add if end is > 1km from last sampled point
  if (distFromLast > 1 || points.length < 2) {
    points.push({
      lon: last[0],
      lat: last[1],
      mileMarker: +totalMiles.toFixed(1),
      kmMarker: +totalKm.toFixed(1),
    });
  }

  console.log(`[RouteWeather] Turf sampled ${points.length} points along ${totalKm.toFixed(1)} km route (interval: ${intervalKm} km)`);
  return points;
}

// ─── Hook ─────────────────────────────────────────────────────────
const useRouteWeather = () => {
  const {
    setRouteData, setRouteWeatherData, routeData,
    setRouteLoading, setRouteError, routeError, routeLoading,
    setRouteRiskLevel,
  } = useAppStore();

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteWeatherData([]);
    setRouteRiskLevel(null);
    setRouteError(null);
  }, [setRouteData, setRouteWeatherData, setRouteRiskLevel, setRouteError]);

  const calculateRoute = useCallback(async (startAddr, endAddr, units = 'metric', travelMode = 'driving', preferences = {}) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setRouteWeatherData([]);
    setRouteRiskLevel(null);

    try {
      // 1. Geocode start/end
      const [startCoord, endCoord] = await Promise.all([
        forwardGeocode(startAddr),
        forwardGeocode(endAddr),
      ]);

      // 2. Get route geometry
      let routeResult;
      try {
        routeResult = await getRoute(startCoord, endCoord, travelMode);
      } catch (routeErr) {
        console.warn('[RouteWeather] Routing API failed, using straight-line fallback');
        routeResult = createMockRoute(startCoord, endCoord);
      }
      const { paths, totalMiles, totalMinutes, dirtRoadSegments = [], directions } = routeResult;

      // 3. Turf-based sampling every 8 km (≈5 miles)
      const samplePts = sampleRouteWithTurf(paths, 8);

      if (samplePts.length === 0) {
        throw new Error('Could not sample route — no valid geometry');
      }

      // 4. Parallel fetch: weather + AQI for sampled points
      const [weatherResults, aqiResults] = await Promise.all([
        batchFetchWeather(samplePts, units),
        preferences.showAirQuality !== false
          ? batchFetchAirQuality(samplePts).catch(() => new Array(samplePts.length).fill(null))
          : Promise.resolve(new Array(samplePts.length).fill(null)),
      ]);

      // 5. Build enriched weather points with 3-tier classification
      const routeWeatherPoints = samplePts.map((pt, i) => ({
        ...pt,
        temperature: weatherResults[i]?.temp,
        condition: weatherResults[i]?.description,
        weather: weatherResults[i],
        severity: classifySeverity(weatherResults[i]?.description),
        airQuality: aqiResults[i],
      }));

      // 6. Compute aggregates
      const validWeather = routeWeatherPoints.filter(p => p.weather);
      const avgTemp = validWeather.length
        ? +(validWeather.reduce((s, p) => s + p.weather.temp, 0) / validWeather.length).toFixed(1)
        : null;
      const worstPoint = routeWeatherPoints.reduce(
        (worst, p) => (p.severity.score > worst.severity.score ? p : worst),
        routeWeatherPoints[0]
      );

      // 7. Route risk level
      const riskLevel = computeRiskLevel(routeWeatherPoints);

      const summary = {
        avgTemp,
        worstCondition: worstPoint?.weather?.description || 'N/A',
        worstSeverity: worstPoint?.severity?.label || 'Clear',
        riskLevel,
        startLabel: startCoord.label,
        endLabel: endCoord.label,
        totalMiles,
        totalMinutes,
        travelMode,
        sampledPoints: routeWeatherPoints.length,
      };

      // 8. Fetch stops along route
      const stops = await batchFetchRouteStops(samplePts, 3);
      const foodStops = stops.filter(s => s.type === 'food');
      const mealRecommendations = generateMealRecommendations({
        foodStops, totalMiles, totalMinutes,
        mealWindows: preferences.mealWindows || {},
        favoriteFoods: preferences.favoriteFoods || [],
        departureTime: new Date(),
      });

      // 9. Commit to store
      setRouteData({
        paths,
        stops,
        mealRecommendations,
        dirtRoadSegments,
        directions,
        summary,
      });
      setRouteWeatherData(routeWeatherPoints);
      setRouteRiskLevel(riskLevel);

      console.log('[RouteWeather] Route computed successfully:', {
        distance: `${totalMiles} mi`,
        duration: `${totalMinutes} min`,
        samples: routeWeatherPoints.length,
        riskLevel,
      });

    } catch (err) {
      console.error('[RouteWeather] Error:', err);
      setRouteError(err.message || 'Failed to calculate route');
    } finally {
      setRouteLoading(false);
    }
  }, [setRouteData, setRouteWeatherData, setRouteLoading, setRouteError, setRouteRiskLevel]);

  return { routeData, calculateRoute, clearRoute };
};

// ─── Helpers ──────────────────────────────────────────────────────

async function batchFetchWeather(points, units, concurrency = 6) {
  const results = new Array(points.length).fill(null);

  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(pt => fetchWeatherData(pt.lat, pt.lon, units).catch(() => null)),
    );
    batchResults.forEach((r, j) => {
      results[i + j] = r;
    });
  }

  return results;
}

function createMockRoute(start, end) {
  const steps = 20;
  const path = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push([
      start.lon + t * (end.lon - start.lon),
      start.lat + t * (end.lat - start.lat),
    ]);
  }

  const line = turf.lineString(path.map(p => [p[0], p[1]]));
  const totalMiles = +turf.length(line, { units: 'miles' }).toFixed(1);
  const totalMinutes = Math.round(totalMiles); // rough 1 min/mile

  return { paths: [path], totalMiles, totalMinutes, dirtRoadSegments: [], directions: [] };
}

export default useRouteWeather;
