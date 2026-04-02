import { useState, useCallback } from 'react';
import useAppStore from '../store/useAppStore';
import { forwardGeocode, getRoute, sampleRoutePoints } from '../services/routeService';
import { fetchWeatherData } from '../services/weatherService';
import { batchFetchRouteStops } from '../services/placesService';
import { batchFetchAirQuality } from '../services/airQualityService';
import { generateMealRecommendations } from '../services/mealAdvisor';

/**
 * Weather severity classification for route coloring.
 */
function classifyWeather(description = '') {
  const d = description.toLowerCase();
  if (/thunderstorm|tornado|hurricane/.test(d)) return { score: 3, color: [220, 38, 38], label: 'Dangerous' }; 
  if (/snow|sleet|blizzard|ice|freezing/.test(d)) return { score: 3, color: [220, 38, 38], label: 'Dangerous' };
  if (/rain(?!.*light)|heavy|shower/.test(d)) return { score: 2, color: [234, 88, 12], label: 'Poor' }; 
  if (/drizzle|light rain|mist|fog/.test(d)) return { score: 2, color: [234, 88, 12], label: 'Poor' };
  if (/cloud|overcast|haze/.test(d)) return { score: 1, color: [202, 138, 4], label: 'Moderate' };
  return { score: 0, color: [22, 163, 74], label: 'Good' };
}

const useRouteWeather = () => {
  const { 
    setRouteData, setRouteWeatherData, routeData,
    setRouteLoading, setRouteError, routeError, routeLoading
  } = useAppStore();

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteWeatherData([]);
    setRouteError(null);
  }, [setRouteData, setRouteWeatherData, setRouteError]);

  const calculateRoute = useCallback(async (startAddr, endAddr, units = 'metric', travelMode = 'driving', preferences = {}) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteData(null);
    setRouteWeatherData([]);

    try {
      const [startCoord, endCoord] = await Promise.all([
        forwardGeocode(startAddr),
        forwardGeocode(endAddr),
      ]);

      let routeResult;
      try {
        routeResult = await getRoute(startCoord, endCoord, travelMode);
      } catch (routeErr) {
        console.warn('[RouteWeather] Routing API failed, using straight-line fallback');
        routeResult = createMockRoute(startCoord, endCoord);
      }
      const { paths, totalMiles, totalMinutes, dirtRoadSegments = [] } = routeResult;

      // Sample points every 10 points
      const samplePts = sampleRoutePoints(paths, 10);

      const [weatherResults, aqiResults] = await Promise.all([
        batchFetchWeather(samplePts, units),
        preferences.showAirQuality !== false
          ? batchFetchAirQuality(samplePts).catch(() => new Array(samplePts.length).fill(null))
          : Promise.resolve(new Array(samplePts.length).fill(null)),
      ]);

      const routeWeatherPoints = samplePts.map((pt, i) => ({
        ...pt,
        temperature: weatherResults[i]?.temp,
        condition: weatherResults[i]?.description,
        weather: weatherResults[i],
        severity: classifyWeather(weatherResults[i]?.description),
        airQuality: aqiResults[i],
      }));

      const validWeather = routeWeatherPoints.filter((p) => p.weather);
      const avgTemp = validWeather.length ? +(validWeather.reduce((s, p) => s + p.weather.temp, 0) / validWeather.length).toFixed(1) : null;
      const worstPoint = routeWeatherPoints.reduce((worst, p) => (p.severity.score > worst.severity.score ? p : worst), routeWeatherPoints[0]);

      // Compute route risk score based on severity frequency
      const highRiskCount = routeWeatherPoints.filter(p => p.severity.score >= 2).length;
      const riskScore = highRiskCount > (routeWeatherPoints.length * 0.3) ? 'High Risk' : (highRiskCount > 0 ? 'Medium Risk' : 'Low Risk');

      const summary = {
        avgTemp,
        worstCondition: worstPoint?.weather?.description || 'N/A',
        worstSeverity: worstPoint?.severity?.label || 'Good',
        riskScore,
        startLabel: startCoord.label,
        endLabel: endCoord.label,
        totalMiles,
        totalMinutes,
        travelMode,
      };

      const stops = await batchFetchRouteStops(samplePts, 3);
      const foodStops = stops.filter((s) => s.type === 'food');
      const mealRecommendations = generateMealRecommendations({
        foodStops, totalMiles, totalMinutes, mealWindows: preferences.mealWindows || {}, favoriteFoods: preferences.favoriteFoods || [], departureTime: new Date(),
      });

      // Split states to global Zustand store
      setRouteData({
        paths,
        stops,
        mealRecommendations,
        dirtRoadSegments,
        summary,
      });
      setRouteWeatherData(routeWeatherPoints);

      console.error('[RouteWeather] Error:', err);
      setRouteError(err.message || 'Failed to calculate route');
    } finally {
      setRouteLoading(false);
    }
  }, [setRouteData, setRouteWeatherData, setRouteLoading, setRouteError]);

  return { routeData, calculateRoute, clearRoute };
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
