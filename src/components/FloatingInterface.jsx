import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CloudRain,
  Navigation,
  Search,
  Mic,
  MapPin,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import LayerControls from './LayerControls';
import ForecastPanel from './ForecastPanel';
import RoutePanel from './RoutePanel';
import PreferencesPanel from './PreferencesPanel';
import AutocompleteInput from './AutocompleteInput';
import useAppStore from '../store/useAppStore';

import usePreferences from '../hooks/usePreferences';
import useRouteWeather from '../hooks/useRouteWeather';
import useGeolocation from '../hooks/useGeolocation';
import useVoiceAssistant from '../hooks/useVoiceAssistant';
import useUnits from '../hooks/useUnits';
import LocationRiskCard from './LocationRiskCard';

/**
 * FloatingInterface — Replaces Sidebar to provide modern map-centric floating widgets.
 */
const FloatingInterface = () => {
  const [activeTab, setActiveTab] = useState('route'); // 'location' | 'route'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forecastCollapsed, setForecastCollapsed] = useState(true);

  const {
    locationData, setLocationData,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom,
    placesData,
    placesEnabled, setPlacesEnabled,
    activeLayers: globalActiveLayers, toggleLayer,
    weatherData,
    addressData,
    forecastData,
    nwsAlerts,
    stopFilters, setStopFilters,
    routeData,
    routeLoading,
    routeError,
    currentLocation,
    isShareModalOpen, setIsShareModalOpen,
  } = useAppStore();

  const { calculateRoute, clearRoute } = useRouteWeather();
  const { preferences, updatePreference, addFavoriteFood, removeFavoriteFood, updateMealWindow } = usePreferences();
  const { tempUnit, windUnit } = useUnits();

  const [searchQuery, setSearchQuery] = useState('');
  
  // Voice Assistant
  const voiceHandlers = useMemo(() => ({
    onFilterToggle: (filterType, forceEnable) => {
      if (filterType === 'places') {
        setPlacesEnabled(forceEnable !== undefined ? forceEnable : !placesEnabled);
        return;
      }
      if (forceEnable) {
        if (!stopFilters.includes(filterType)) setStopFilters([...stopFilters, filterType]);
      } else {
        setStopFilters(stopFilters.filter((t) => t !== filterType));
      }
    },
    onSearchLocation: async (locationQuery) => {
      console.log('Voice location query:', locationQuery);
    },
    onNavigate: () => {},
    onEnableLayer: (layerName) => {
      if (!globalActiveLayers[layerName]) toggleLayer(layerName);
    },
    onDisableLayer: (layerName) => {
      if (globalActiveLayers[layerName]) toggleLayer(layerName);
    },
    onSetSearchQuery: setSearchQuery,
  }), [stopFilters, placesEnabled, setStopFilters, setPlacesEnabled, globalActiveLayers, toggleLayer]);

  const { isListening, lastIntent, startListening, clearIntent } = useVoiceAssistant(voiceHandlers);

  useEffect(() => {
    if (lastIntent && !isListening) {
      const timer = setTimeout(clearIntent, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastIntent, isListening, clearIntent]);

  // Macro/Micro Zoom states
  const isMacroView = mapZoom < 6;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-6 flex flex-col justify-between overflow-hidden">
      
      {/* ── TOP SECTION: Routing & Search Left, Weather Right ── */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 h-[70vh]">
        
        {/* TOP-LEFT: Routing & Main Control Panel */}
        <div className="w-full md:w-[360px] flex flex-col gap-3 pointer-events-auto shrink-0 max-h-full">
          <div className="bg-white/95 backdrop-blur-xl shadow-xl border border-gray-100 rounded-3xl p-4 flex flex-col gap-4">
            
            {/* Header & Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
                  <Shield size={16} className="text-white" />
                </div>
                <h1 className="text-sm font-bold text-gray-900 tracking-tight">GeoHealth</h1>
              </div>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('route')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'route' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Route
                </button>
                <button
                  onClick={() => setActiveTab('location')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeTab === 'location' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Explore
                </button>
              </div>
            </div>

            {/* Global Search (only in Exploring Mode) */}
            {activeTab === 'location' && (
              <div className="flex flex-col gap-2">
                <AutocompleteInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSelect={(item) => {
                    setMapCenter([item.lon, item.lat]);
                    setMapZoom(13);
                    setLocationData({ lat: item.lat, lon: item.lon });
                  }}
                  placeholder="Search city, address, or place..."
                  icon={Search}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
                  buttonAction={{
                    icon: Mic,
                    onClick: startListening,
                    title: isListening ? 'Listening...' : 'Voice Command',
                    isActive: isListening,
                    activeClass: 'text-red-500 bg-red-50 ring-2 ring-red-300 ring-offset-1 animate-pulse',
                    inactiveClass: 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                  }}
                />
              </div>
            )}

            {/* Voice Feedback */}
            {lastIntent && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all animate-in slide-in-from-top-2 ${
                  isListening
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                <span className="text-base">{lastIntent.emoji}</span>
                <span className="flex-1">{lastIntent.label}</span>
                {!isListening && (
                  <button onClick={clearIntent} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                )}
              </div>
            )}

            {/* Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-4">
              {activeTab === 'route' ? (
                <RoutePanel
                  currentLocation={currentLocation}
                  onCalculateRoute={calculateRoute}
                  onClearRoute={clearRoute}
                  routeData={routeData}
                  loading={routeLoading}
                  error={routeError}
                  tempUnit={tempUnit}
                  stopFilters={stopFilters}
                  onToggleStopFilter={(type) => setStopFilters(stopFilters.includes(type) ? stopFilters.filter(t => t !== type) : [...stopFilters, type])}
                  onStartTrip={() => setIsShareModalOpen(true)}
                />
              ) : (
                <div className="text-sm text-gray-500 py-4 text-center">
                  Click anywhere on the map to analyze local conditions and weather risks.
                </div>
              )}
            </div>
            
            {/* Quick Settings Bar */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <SlidersHorizontal size={14} /> Preferences
              </button>
              {isSettingsOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 pointer-events-auto">
                  <PreferencesPanel
                    preferences={preferences}
                    onUpdatePreference={updatePreference}
                    onAddFavoriteFood={addFavoriteFood}
                    onRemoveFavoriteFood={removeFavoriteFood}
                    onUpdateMealWindow={updateMealWindow}
                  />
                  <button onClick={() => setIsSettingsOpen(false)} className="mt-3 w-full py-1.5 bg-gray-100 text-xs font-semibold rounded-lg text-gray-600">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TOP-RIGHT: Active Location Weather & Forecast */}
        <div className="w-full md:w-[320px] flex flex-col gap-3 pointer-events-auto shrink-0 max-h-full overflow-y-auto">
          {!isMacroView && weatherData && (
            <div className="bg-white/95 backdrop-blur-xl shadow-xl border border-gray-100 rounded-3xl overflow-hidden">
              <LocationRiskCard
                weatherData={weatherData}
                addressData={addressData}
                nwsAlerts={nwsAlerts}
                tempUnit={tempUnit}
                windUnit={windUnit}
              />
              
              {forecastData?.length > 0 && (
                <div className="border-t border-gray-100">
                  <button 
                    onClick={() => setForecastCollapsed(!forecastCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    5-Day Forecast
                    {forecastCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  {!forecastCollapsed && (
                    <div className="p-4 pt-0">
                      <ForecastPanel forecastData={forecastData} tempUnit={tempUnit} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Layer Controls ── */}
      <div className="flex justify-center w-full pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-xl shadow-xl border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-6">
          <LayerControls 
            activeLayers={globalActiveLayers} 
            onToggleLayer={toggleLayer} 
          />
        </div>
      </div>
    </div>
  );
};

export default FloatingInterface;
