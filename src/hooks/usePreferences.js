import { useState, useCallback } from 'react';

const STORAGE_KEY = 'geohealth_preferences';

const DEFAULT_PREFERENCES = {
  favoriteFoods: [],              // e.g. ["mexican", "italian", "burger", "pizza"]
  searchRadiusMiles: 3,           // 1–25 miles
  mealWindows: {
    lunch:  { start: '11:00', end: '14:00' },
    dinner: { start: '17:00', end: '20:00' },
  },
  avoidDirtRoads: true,
  showAirQuality: true,
};

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle new fields added after first save
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * usePreferences — manages persistent travel preferences.
 *
 * Returns:
 *  • preferences — the current preferences object
 *  • updatePreference(key, value) — update a single preference
 *  • addFavoriteFood(food) — add a food tag
 *  • removeFavoriteFood(food) — remove a food tag
 *  • searchRadiusMeters — convenience getter (miles → meters)
 */
const usePreferences = () => {
  const [preferences, setPreferences] = useState(loadPreferences);

  const updatePreference = useCallback((key, value) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      savePreferences(next);
      return next;
    });
  }, []);

  const addFavoriteFood = useCallback((food) => {
    const normalized = food.trim().toLowerCase();
    if (!normalized) return;
    setPreferences((prev) => {
      if (prev.favoriteFoods.includes(normalized)) return prev;
      const next = { ...prev, favoriteFoods: [...prev.favoriteFoods, normalized] };
      savePreferences(next);
      return next;
    });
  }, []);

  const removeFavoriteFood = useCallback((food) => {
    setPreferences((prev) => {
      const next = { ...prev, favoriteFoods: prev.favoriteFoods.filter((f) => f !== food) };
      savePreferences(next);
      return next;
    });
  }, []);

  const updateMealWindow = useCallback((meal, field, value) => {
    setPreferences((prev) => {
      const next = {
        ...prev,
        mealWindows: {
          ...prev.mealWindows,
          [meal]: { ...prev.mealWindows[meal], [field]: value },
        },
      };
      savePreferences(next);
      return next;
    });
  }, []);

  // Convert miles → meters for API calls
  const searchRadiusMeters = Math.round(preferences.searchRadiusMiles * 1609.34);

  return {
    preferences,
    updatePreference,
    addFavoriteFood,
    removeFavoriteFood,
    updateMealWindow,
    searchRadiusMeters,
  };
};

export default usePreferences;
