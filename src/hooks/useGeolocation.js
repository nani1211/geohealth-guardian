import { useState, useEffect, useCallback } from 'react';

/**
 * useGeolocation — detects the user's location via browser Geolocation API.
 *
 * • Requests permission on mount
 * • Falls back to localStorage (last saved) or a default city
 * • Provides a `refresh()` function for manual re-fetch
 *
 * Returns:
 *  • location   — { lat, lon } or null
 *  • loading    — boolean
 *  • error      — string or null
 *  • source     — 'gps' | 'cached' | 'default'
 *  • refresh()  — re-request geolocation
 */

const STORAGE_KEY = 'geohealth-last-location';
const DEFAULT_LOCATION = { lat: 40.7128, lon: -74.006 }; // New York City

function readCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.lat && parsed?.lon) return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveToCache(loc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat: loc.lat, lon: loc.lon }));
  } catch { /* ignore */ }
}

const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const requestPosition = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      console.warn('[Geolocation] API not supported');
      const cached = readCached();
      setLocation(cached || DEFAULT_LOCATION);
      setSource(cached ? 'cached' : 'default');
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        console.trace('[Geolocation] Got position:', loc);
        setLocation(loc);
        setSource('gps');
        saveToCache(loc);
        setLoading(false);
      },
      (err) => {
        console.warn('[Geolocation] Permission denied or error:', err.message);
        const cached = readCached();
        setLocation(cached || DEFAULT_LOCATION);
        setSource(cached ? 'cached' : 'default');
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000, // 5 min cache
      },
    );
  }, []);

  // Request on mount
  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  return { location, loading, error, source, refresh: requestPosition };
};

export default useGeolocation;
