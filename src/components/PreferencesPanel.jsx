import React, { useState } from 'react';
import { Settings, X, Plus, Star, Clock, Gauge, MapPin, Shield } from 'lucide-react';

/**
 * PreferencesPanel — A slide-in settings panel for configuring travel preferences.
 *
 * Props:
 *  • preferences — the current preferences object
 *  • onUpdatePreference(key, value) — callback to update a pref
 *  • onAddFavoriteFood(food) — callback to add a favorite
 *  • onRemoveFavoriteFood(food) — callback to remove a favorite
 *  • onUpdateMealWindow(meal, field, value) — callback to update meal windows
 */
const PreferencesPanel = ({
  preferences,
  onUpdatePreference,
  onAddFavoriteFood,
  onRemoveFavoriteFood,
  onUpdateMealWindow,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newFood, setNewFood] = useState('');

  const handleAddFood = (e) => {
    e.preventDefault();
    if (newFood.trim()) {
      onAddFavoriteFood(newFood.trim());
      setNewFood('');
    }
  };

  const RADIUS_PRESETS = [1, 3, 5, 10, 25];

  const FOOD_SUGGESTIONS = ['Mexican', 'Italian', 'Burger', 'Pizza', 'Chinese', 'Indian', 'Sushi', 'BBQ', 'Chicken', 'Coffee', 'Sandwich'];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Travel preferences"
        title="Travel Preferences"
      >
        <Settings size={16} className="text-gray-500 hover:text-indigo-600 transition-colors" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 z-[60] backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      {/* Panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-indigo-600" />
              <h2 className="text-base font-bold text-gray-900">Travel Preferences</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-100 cursor-pointer">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Personalize your on-the-go experience</p>
        </div>

        <div className="p-5 space-y-6">
          {/* ── Favorite Foods ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Star size={14} className="text-amber-500" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Favorite Foods</h3>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">We'll highlight matching restaurants along your route</p>

            {/* Current tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {preferences.favoriteFoods.map((food) => (
                <span key={food} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-semibold capitalize">
                  {food}
                  <button onClick={() => onRemoveFavoriteFood(food)} className="hover:text-red-500 cursor-pointer">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {preferences.favoriteFoods.length === 0 && (
                <span className="text-[10px] text-gray-400 italic">No favorites set — add some below!</span>
              )}
            </div>

            {/* Add input */}
            <form onSubmit={handleAddFood} className="flex gap-1.5 mb-2">
              <input
                type="text"
                value={newFood}
                onChange={(e) => setNewFood(e.target.value)}
                placeholder="Add a cuisine…"
                className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button type="submit" className="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors cursor-pointer">
                <Plus size={14} />
              </button>
            </form>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1 mt-1">
              {FOOD_SUGGESTIONS.filter((s) => !preferences.favoriteFoods.includes(s.toLowerCase())).slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => onAddFavoriteFood(s)}
                  className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* ── Search Radius ──────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin size={14} className="text-blue-500" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Search Radius</h3>
            </div>

            <div className="flex gap-1.5 mb-2">
              {RADIUS_PRESETS.map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdatePreference('searchRadiusMiles', r)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    preferences.searchRadiusMiles === r
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {r} mi
                </button>
              ))}
            </div>

            <input
              type="range"
              min="1"
              max="25"
              value={preferences.searchRadiusMiles}
              onChange={(e) => onUpdatePreference('searchRadiusMiles', parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-gray-400 text-center mt-1">
              Currently: <span className="font-semibold text-blue-600">{preferences.searchRadiusMiles} miles</span> (~{(preferences.searchRadiusMiles * 1.609).toFixed(1)} km)
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* ── Meal Time Windows ──────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Clock size={14} className="text-teal-500" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Meal Time Windows</h3>
            </div>
            <p className="text-[10px] text-gray-400 mb-3">We'll recommend stops when you arrive during these times</p>

            {['lunch', 'dinner'].map((meal) => (
              <div key={meal} className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-600 capitalize w-14">{meal}</span>
                <input
                  type="time"
                  value={preferences.mealWindows[meal]?.start || ''}
                  onChange={(e) => onUpdateMealWindow(meal, 'start', e.target.value)}
                  className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <span className="text-[10px] text-gray-400">to</span>
                <input
                  type="time"
                  value={preferences.mealWindows[meal]?.end || ''}
                  onChange={(e) => onUpdateMealWindow(meal, 'end', e.target.value)}
                  className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>
            ))}
          </section>

          <hr className="border-gray-100" />

          {/* ── Toggles ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={14} className="text-purple-500" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Safety & Display</h3>
            </div>

            {/* Air Quality toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-gray-700">Air Quality Index</p>
                <p className="text-[10px] text-gray-400">Show AQI data at locations & routes</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={preferences.showAirQuality}
                  onChange={(e) => onUpdatePreference('showAirQuality', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </div>
            </label>

            {/* Dirt road toggle */}
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-gray-700">Dirt Road Warnings</p>
                <p className="text-[10px] text-gray-400">Alert when route includes unpaved roads</p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={preferences.avoidDirtRoads}
                  onChange={(e) => onUpdatePreference('avoidDirtRoads', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </div>
            </label>
          </section>
        </div>
      </div>
    </>
  );
};

export default PreferencesPanel;
