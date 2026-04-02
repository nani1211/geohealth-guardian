import { useState, useCallback } from 'react';

/**
 * useUnits — manages measurement unit preferences (F/C, mph/kmh).
 *
 * Persists to localStorage so preferences survive page refreshes.
 *
 * Returns:
 *  • units        — 'metric' | 'imperial'
 *  • tempUnit     — '°C' | '°F'
 *  • windUnit     — 'm/s' | 'mph'
 *  • toggleUnits  — function to flip between metric ↔ imperial
 */
const STORAGE_KEY = 'geohealth-units';

function readStored() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'imperial' || val === 'metric') return val;
  } catch { /* SSR / private browsing */ }
  return 'metric'; // default
}

const useUnits = () => {
  const [units, setUnits] = useState(readStored);

  const toggleUnits = useCallback(() => {
    setUnits((prev) => {
      const next = prev === 'metric' ? 'imperial' : 'metric';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      return next;
    });
  }, []);

  return {
    units,
    tempUnit: units === 'metric' ? '°C' : '°F',
    windUnit: units === 'metric' ? 'm/s' : 'mph',
    isMetric: units === 'metric',
    toggleUnits,
  };
};

export default useUnits;
