import { useCallback } from 'react';
import * as turf from '@turf/turf';
import useAppStore from '../store/useAppStore';
import { forwardGeocode, getRoute } from '../services/routeService';
import { fetchWeatherData } from '../services/weatherService';
import { batchFetchRouteStops } from '../services/placesService';
import { batchFetchAirQuality } from '../services/airQualityService';
import { generateMealRecommendations } from '../services/mealAdvisor';
import { generateSmartStops } from '../services/smartStopService';
import { batchFetchRouteAlerts } from '../services/nwsAlertService';
import { batchFetchElevation, fetchDestinationSunset } from '../services/travelMetricsService';


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

  // Dynamically scale interval to keep points count reasonable (max ~30 points)
  let scaledInterval = intervalKm;
  if (totalKm > 200) scaledInterval = Math.max(intervalKm, totalKm / 20);

  const points = [];

  // Always include route start
  points.push({
    lon: coords[0][0],
    lat: coords[0][1],
    mileMarker: 0,
    kmMarker: 0,
  });

  // Walk along the line at `scaledInterval` steps
  for (let km = scaledInterval; km < totalKm; km += scaledInterval) {
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
    setRouteRiskLevel, setRouteAlerts,
    setIsRouteDetailsLoading, patchRouteWeatherPoints
  } = useAppStore();

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteWeatherData([]);
    setRouteRiskLevel(null);
    setRouteError(null);
    setRouteAlerts([]);
  }, [setRouteData, setRouteWeatherData, setRouteRiskLevel, setRouteError, setRouteAlerts]);


  // calculateRoute now accepts an array of waypoint objects {id, address} or legacy (startAddr, endAddr)
  const calculateRoute = useCallback(async (waypointsOrStart, endAddrOrUnits = 'metric', unitsOrMode = 'metric', travelMode = 'driving', preferences = {}) => {
    // Handle both legacy (startAddr, endAddr, units, mode, prefs) and new (waypoints[], units, mode, prefs)
    let wpList, units, mode, prefs;
    if (Array.isArray(waypointsOrStart)) {
      wpList   = waypointsOrStart;   // [{id, address}, ...]
      units    = endAddrOrUnits;     // second arg = units
      mode     = unitsOrMode;        // third arg = mode
      prefs    = travelMode;         // fourth arg = prefs
      if (typeof prefs !== 'object') prefs = {};
      if (typeof mode !== 'string') mode = 'driving';
    } else {
      // legacy two-string form
      wpList = [
        { id: 'wp-start', address: waypointsOrStart },
        { id: 'wp-end',   address: endAddrOrUnits },
      ];
      units  = unitsOrMode;
      mode   = travelMode;
      prefs  = preferences;
    }

    // Filter out blank stops
    const activeWps = wpList.filter(wp => wp.address?.trim());
    if (activeWps.length < 2) {
      setRouteError('Please enter at least a start and a destination.');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setRouteWeatherData([]);
    setRouteRiskLevel(null);
    setRouteAlerts([]);

    try {
      // 1. Geocode all active waypoints in parallel
      const geocoded = await Promise.all(
        activeWps.map(wp =>
          wp.lat && wp.lon
            ? Promise.resolve({ lat: wp.lat, lon: wp.lon, label: wp.address })
            : forwardGeocode(wp.address)
        )
      );

      const startCoord = geocoded[0];
      const endCoord   = geocoded[geocoded.length - 1];

      // 2. Get route geometry (multi-waypoint)
      let routeResult;
      try {
        routeResult = await getRoute(geocoded, mode);
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

      // 4. Parallel fetch FACT APIs: weather, AQI, elevation, sunset
      const [weatherResults, aqiResults, elevations, sunsetData] = await Promise.all([
        batchFetchWeather(samplePts, units),
        prefs.showAirQuality !== false
          ? batchFetchAirQuality(samplePts).catch(() => new Array(samplePts.length).fill(null))
          : Promise.resolve(new Array(samplePts.length).fill(null)),

        batchFetchElevation(samplePts).catch(() => new Array(samplePts.length).fill(null)),
        fetchDestinationSunset(endCoord.lat, endCoord.lon)
      ]);

      // 5. Build enriched weather points with 3-tier classification & elevation
      let routeWeatherPoints = samplePts.map((pt, i) => ({
        ...pt,
        temperature: weatherResults[i]?.temp,
        condition: weatherResults[i]?.description,
        weather: weatherResults[i],
        severity: classifySeverity(weatherResults[i]?.description),
        airQuality: aqiResults[i],
        elevation: elevations[i] ?? null,
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
        travelMode: mode,
        stopLabels: activeWps.map(wp => wp.address),
        sampledPoints: routeWeatherPoints.length,
        sunsetData: sunsetData
      };

      // 8. Commit BASE details to store instantly!
      setRouteData({
        paths,
        dirtRoadSegments,
        directions,
        summary,
        routeAlerts: [],
        stops: [],
        mealRecommendations: [],
        smartStops: []
      });
      setRouteWeatherData(routeWeatherPoints);
      setRouteRiskLevel(riskLevel);
      setRouteLoading(false); 

      // 9. 🏎️ LAZY LOAD: Fetch heavy stops & alerts asynchronously in the background
      setIsRouteDetailsLoading(true);

      const step = Math.max(1, Math.floor(samplePts.length / 5));
      const stopSamplePts = samplePts.filter((_, i) => i % step === 0).slice(0, 5);

      Promise.all([
        batchFetchRouteStops(stopSamplePts, 5),
        batchFetchRouteAlerts(stopSamplePts, 3).catch(() => []),
      ]).then(([stops, routeAlerts]) => {
        
        const foodStops = stops.filter(s => s.type === 'food');
        const mealRecommendations = generateMealRecommendations({
          foodStops, totalMiles, totalMinutes,
          mealWindows: prefs.mealWindows || {},
          favoriteFoods: prefs.favoriteFoods || [],

          departureTime: new Date(),
        });

        const smartStops = generateSmartStops({
          stops, totalMiles, totalMinutes, departureTime: new Date(),
        });

        // Patch background data into live waypoints
        const enrichedWeatherPoints = routeWeatherPoints.map((pt) => {
          const nearbyAlerts = routeAlerts.filter(a => Math.abs((a.mileMarker ?? 0) - pt.mileMarker) <= 10);
          const nearbyStops = stops.filter(s => Math.abs((s.mileMarker ?? 0) - pt.mileMarker) <= 5);
          return { ...pt, nearbyAlerts, nearbyStops };
        });

        setRouteData({
          paths, dirtRoadSegments, directions, summary,
          stops, routeAlerts, mealRecommendations, smartStops
        });
        patchRouteWeatherPoints(enrichedWeatherPoints);
        setRouteAlerts(routeAlerts);
        
        console.log('[RouteWeather] Lazy loading complete.', { stops: stops.length, alerts: routeAlerts.length });
      }).catch(err => {
        console.error('[RouteWeather] Background load failed:', err);
      }).finally(() => {
        setIsRouteDetailsLoading(false);
      });

      console.log('[RouteWeather] Route initial paths computed instantly.');

    } catch (err) {
      console.error('[RouteWeather] Error:', err);
      setRouteError(err.message || 'Failed to calculate route');
      setRouteLoading(false);
    }
  }, [setRouteData, setRouteWeatherData, setRouteLoading, setRouteError, setRouteRiskLevel, patchRouteWeatherPoints, setIsRouteDetailsLoading, setRouteAlerts]);


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
