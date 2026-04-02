import { useState, useCallback } from 'react';
import { forwardGeocode, getRoute, sampleRoutePoints } from '../services/routeService';
import { fetchWeatherData } from '../services/weatherService';
import { batchFetchRouteStops } from '../services/placesService';
import { batchFetchAirQuality } from '../services/airQualityService';
import { generateMealRecommendations } from '../services/mealAdvisor';

/**
 * Weather severity classification for route coloring.
 * Returns a score 0 (good) to 3 (dangerous) and a color.
 */
function classifyWeather(description = '') {
  const d = description.toLowerCase();
  if (/thunderstorm|tornado|hurricane/.test(d))
    return { score: 3, color: [220, 38, 38], label: 'Dangerous' };   // red
  if (/snow|sleet|blizzard|ice|freezing/.test(d))
    return { score: 3, color: [220, 38, 38], label: 'Dangerous' };
  if (/rain(?!.*light)|heavy|shower/.test(d))
    return { score: 2, color: [234, 88, 12], label: 'Poor' };        // orange
  if (/drizzle|light rain|mist|fog/.test(d))
    return { score: 2, color: [234, 88, 12], label: 'Poor' };
  if (/cloud|overcast|haze/.test(d))
    return { score: 1, color: [202, 138, 4], label: 'Moderate' };    // yellow
  return { score: 0, color: [22, 163, 74], label: 'Good' };          // green
}

/**
 * useRouteWeather — orchestrates the full route weather flow.
 *
 * Returns:
 *  • routeData — { paths, routeWeatherPoints[], stops[], mealRecommendations[], dirtRoadSegments[], summary } or null
 *  • loading   — boolean
 *  • error     — string or null
 *  • calculateRoute(startAddr, endAddr, units, travelMode, preferences) — trigger function
 *  • clearRoute() — reset state
 */
const useRouteWeather = () => {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setError(null);
  }, []);

  const calculateRoute = useCallback(async (startAddr, endAddr, units = 'metric', travelMode = 'driving', preferences = {}) => {
    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      // 1. Forward-geocode both addresses in parallel
      const [startCoord, endCoord] = await Promise.all([
        forwardGeocode(startAddr),
        forwardGeocode(endAddr),
      ]);

      console.log('[RouteWeather] Geocoded:', startCoord.label, '→', endCoord.label);

      // 2. Get driving/walking route (now includes dirtRoadSegments)
      let routeResult;
      try {
        routeResult = await getRoute(startCoord, endCoord, travelMode);
      } catch (routeErr) {
        console.warn('[RouteWeather] Routing API failed, using straight-line fallback:', routeErr.message);
        routeResult = createMockRoute(startCoord, endCoord);
      }
      const { paths, totalMiles, totalMinutes, dirtRoadSegments = [] } = routeResult;

      console.log('[RouteWeather] Route:', totalMiles, 'miles,', totalMinutes, 'mins');

      // 3. Sample points along the route
      const samplePts = sampleRoutePoints(paths, 10);
      console.log('[RouteWeather] Sampled', samplePts.length, 'points');

      // 4. Fetch weather + AQI for all sample points in parallel
      const [weatherResults, aqiResults] = await Promise.all([
        batchFetchWeather(samplePts, units),
        preferences.showAirQuality !== false
          ? batchFetchAirQuality(samplePts).catch(() => new Array(samplePts.length).fill(null))
          : Promise.resolve(new Array(samplePts.length).fill(null)),
      ]);

      // 5. Merge weather + AQI into sample points + classify
      const routeWeatherPoints = samplePts.map((pt, i) => ({
        ...pt,
        temperature: weatherResults[i]?.temp,
        condition: weatherResults[i]?.description,
        weather: weatherResults[i],
        severity: classifyWeather(weatherResults[i]?.description),
        airQuality: aqiResults[i],
      }));

      // 6. Compute route summary
      const validWeather = routeWeatherPoints.filter((p) => p.weather);
      const avgTemp = validWeather.length
        ? +(validWeather.reduce((s, p) => s + p.weather.temp, 0) / validWeather.length).toFixed(1)
        : null;

      const worstPoint = routeWeatherPoints.reduce(
        (worst, p) => (p.severity.score > worst.severity.score ? p : worst),
        routeWeatherPoints[0],
      );

      // AQI summary
      const validAqi = routeWeatherPoints.filter((p) => p.airQuality);
      const worstAqi = validAqi.length
        ? validAqi.reduce((worst, p) => (p.airQuality.aqi > worst.airQuality.aqi ? p : worst), validAqi[0])
        : null;
      const avgAqi = validAqi.length
        ? +(validAqi.reduce((s, p) => s + p.airQuality.aqi, 0) / validAqi.length).toFixed(1)
        : null;

      const summary = {
        avgTemp,
        worstCondition: worstPoint?.weather?.description || 'N/A',
        worstSeverity: worstPoint?.severity?.label || 'Good',
        startLabel: startCoord.label,
        endLabel: endCoord.label,
        totalMiles,
        totalMinutes,
        travelMode,
        avgAqi,
        worstAqi: worstAqi?.airQuality?.label || null,
      };

      // 7. Fetch practical stops along route
      const stops = await batchFetchRouteStops(samplePts, 3);

      // 8. Generate meal recommendations
      const foodStops = stops.filter((s) => s.type === 'food');
      const mealRecommendations = generateMealRecommendations({
        foodStops,
        totalMiles,
        totalMinutes,
        mealWindows: preferences.mealWindows || {},
        favoriteFoods: preferences.favoriteFoods || [],
        departureTime: new Date(),
      });

      setRouteData({
        paths,
        routeWeatherPoints,
        stops,
        mealRecommendations,
        dirtRoadSegments,
        summary,
      });
    } catch (err) {
      console.error('[RouteWeather] Error:', err);
      setError(err.message || 'Failed to calculate route weather');
    } finally {
      setLoading(false);
    }
  }, []);

  return { routeData, loading, error, calculateRoute, clearRoute };
};

// ─── Helpers ──────────────────────────────────────────────────────

async function batchFetchWeather(points, units, concurrency = 6) {
  const results = new Array(points.length).fill(null);

  for (let i = 0; i < points.length; i += concurrency) {
    const batch = points.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((pt) => fetchWeatherData(pt.lat, pt.lon, units).catch(() => null)),
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

  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(end.lat - start.lat);
  const dLon = toRad(end.lon - start.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLon / 2) ** 2;
  const totalMiles = +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  const totalMinutes = Math.round(totalMiles);

  return { paths: [path], totalMiles, totalMinutes, dirtRoadSegments: [] };
}

export default useRouteWeather;
