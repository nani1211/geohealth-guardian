import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Mic,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Map,
  Route,
  X,
  Compass
} from 'lucide-react';
import LayerControls from './LayerControls';
import ForecastPanel from './ForecastPanel';
import RoutePanel from './RoutePanel';
import PreferencesPanel from './PreferencesPanel';
import AutocompleteInput from './AutocompleteInput';
import NearbyPlacesPanel from './NearbyPlacesPanel';
import useAppStore from '../store/useAppStore';

import usePreferences from '../hooks/usePreferences';
import useRouteWeather from '../hooks/useRouteWeather';
import useVoiceAssistant from '../hooks/useVoiceAssistant';
import useUnits from '../hooks/useUnits';
import LocationRiskCard from './LocationRiskCard';

/**
 * FloatingInterface — Google/Apple Maps-style sidebar.
 * Desktop: fixed left panel.
 * Mobile: bottom sheet with drag handle (collapsed / peek / expanded).
 */
const FloatingInterface = () => {
  const [activeTab, setActiveTab] = useState('route');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [forecastCollapsed, setForecastCollapsed] = useState(true);

  // Mobile bottom sheet: 'collapsed' | 'peek' | 'expanded'
  const [sheetState, setSheetState] = useState('peek');
  const dragStartY = useRef(null);
  const sheetRef = useRef(null);

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
    airQualityData,
    stopFilters, setStopFilters,
    routeData,
    routeLoading,
    routeError,
    currentLocation,
    isShareModalOpen, setIsShareModalOpen,
    setPlacePopupData,
    isSidebarOpen, setIsSidebarOpen,
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
    onSearchLocation: async (locationQuery) => console.log('Voice location query:', locationQuery),
    onNavigate: () => {},
    onEnableLayer: (layerName) => { if (!globalActiveLayers[layerName]) toggleLayer(layerName); },
    onDisableLayer: (layerName) => { if (globalActiveLayers[layerName]) toggleLayer(layerName); },
    onSetSearchQuery: setSearchQuery,
  }), [stopFilters, placesEnabled, setStopFilters, setPlacesEnabled, globalActiveLayers, toggleLayer]);

  const { isListening, lastIntent, startListening, clearIntent } = useVoiceAssistant(voiceHandlers);

  useEffect(() => {
    if (lastIntent && !isListening) {
      const timer = setTimeout(clearIntent, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastIntent, isListening, clearIntent]);

  // ── Mobile drag gestures ────────────────────────────────────────
  const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (dragStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - dragStartY.current;
    if (dy < -60) setSheetState(s => s === 'collapsed' ? 'peek' : 'expanded');
    else if (dy > 60) setSheetState(s => s === 'expanded' ? 'peek' : 'collapsed');
    dragStartY.current = null;
  };

  const sheetHeights = { collapsed: '60px', peek: '44vh', expanded: '90vh' };

  const tabs = [
    { id: 'route',    label: 'Route',   icon: Route },
    { id: 'location', label: 'Explore', icon: Compass },
    { id: 'layers',   label: 'Layers',  icon: Layers },
  ];

  // ── Handlers ───────────────────────────────────────────────────
  const handleWaypointClick = useCallback((pt) => {
    if (pt?.lat && pt?.lon) setMapCenter([pt.lon, pt.lat]);
  }, [setMapCenter]);

  const handlePlaceClick = useCallback((place) => {
    if (place?.lat && place?.lon) {
      setMapCenter([place.lon, place.lat]);
    }
    setPlacePopupData({ place, screenPoint: null });
  }, [setMapCenter, setPlacePopupData]);

  const handleClearRoute = useCallback(() => {
    clearRoute();
    // Reset waypoints to initial two-slot state
    useAppStore.getState().setRouteWaypoints([
      { id: 'wp-start', address: '', lat: null, lon: null, label: '' },
      { id: 'wp-end',   address: '', lat: null, lon: null, label: '' },
    ]);
  }, [clearRoute]);

  // ── Shared panel content renders ───────────────────────────────
  const renderRouteTab = () => (
    <RoutePanel
      currentLocation={currentLocation}
      onCalculateRoute={(wps, mode) => calculateRoute(wps, tempUnit === '°F' ? 'imperial' : 'metric', mode, preferences)}
      onClearRoute={handleClearRoute}
      routeData={routeData}
      loading={routeLoading}
      error={routeError}
      tempUnit={tempUnit}
      stopFilters={stopFilters}
      onToggleStopFilter={(type) =>
        setStopFilters(stopFilters.includes(type)
          ? stopFilters.filter(t => t !== type)
          : [...stopFilters, type])
      }
      onStartTrip={() => setIsShareModalOpen(true)}
      onWaypointClick={handleWaypointClick}
    />
  );

  const renderExploreTab = (isMobile = false) => (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <AutocompleteInput
        value={searchQuery}
        onChange={setSearchQuery}
        onSelect={(item) => {
          setMapCenter([item.lon, item.lat]);
          setMapZoom(13);
          setLocationData({ lat: item.lat, lon: item.lon });
          if (isMobile) setSheetState('peek');
        }}
        placeholder="Search city, address, or place..."
        icon={Search}
        buttonAction={{
          icon: Mic,
          onClick: startListening,
          title: isListening ? 'Listening...' : 'Voice Search',
          isActive: isListening,
          activeClass: 'text-red-500 bg-red-50 ring-2 ring-red-300 animate-pulse',
          inactiveClass: 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50',
        }}
      />

      {/* Weather card for selected location */}
      {weatherData ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <LocationRiskCard
            weatherData={weatherData}
            addressData={addressData}
            nwsAlerts={nwsAlerts}
            airQualityData={airQualityData}
            tempUnit={tempUnit}
            windUnit={windUnit}
          />
          {forecastData?.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => setForecastCollapsed(!forecastCollapsed)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
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
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-8 px-6">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
            <Map className="text-blue-400" size={24} />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {isMobile ? 'Tap the map to explore' : 'Click anywhere on the map'}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Get instant weather, air quality, and health insights for any location.
          </p>
        </div>
      )}

      {/* Section divider */}
      <div className="border-t border-gray-100" />

      {/* Nearby Places */}
      <NearbyPlacesPanel onPlaceClick={handlePlaceClick} />
    </div>
  );

  const renderLayersTab = () => (
    <>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Map Layers</p>
      <LayerControls activeLayers={globalActiveLayers} onToggleLayer={toggleLayer} vertical />
    </>
  );

  const VoiceFeedback = () => lastIntent ? (
    <div className={`flex-shrink-0 mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
      isListening
        ? 'bg-red-50 text-red-700 border border-red-200'
        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    }`}>
      <span className="text-base">{lastIntent.emoji}</span>
      <span className="flex-1">{lastIntent.label}</span>
      {!isListening && <button onClick={clearIntent} className="text-gray-400">✕</button>}
    </div>
  ) : null;

  return (
    <>
      {/* ══════════════════════════════════════════════
          DESKTOP SIDEBAR (md+)
      ══════════════════════════════════════════════ */}
      <div className={`hidden md:flex absolute left-0 top-0 h-full z-20 pointer-events-none transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-[360px] h-full bg-white/97 backdrop-blur-2xl shadow-2xl border-r border-gray-100 flex flex-col pointer-events-auto relative">

          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white flex items-center justify-center rounded-r-lg shadow-[4px_0_10px_rgba(0,0,0,0.1)] border border-l-0 border-gray-200 text-gray-500 hover:text-gray-800 transition-colors pointer-events-auto z-50 cursor-pointer"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">GeoHealth</h1>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">Guardian</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-xl transition-all ${isSettingsOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title="Preferences"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex bg-gray-100 p-1 rounded-2xl gap-0.5">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences Panel */}
          {isSettingsOpen && (
            <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50">
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Preferences</span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={14} />
                </button>
              </div>
              <div className="px-4 pb-4 max-h-72 overflow-y-auto">
                <PreferencesPanel
                  preferences={preferences}
                  onUpdatePreference={updatePreference}
                  onAddFavoriteFood={addFavoriteFood}
                  onRemoveFavoriteFood={removeFavoriteFood}
                  onUpdateMealWindow={updateMealWindow}
                />
              </div>
            </div>
          )}

          {/* Voice Feedback */}
          {lastIntent && (
            <div className={`flex-shrink-0 mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isListening ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              <span className="text-base">{lastIntent.emoji}</span>
              <span className="flex-1">{lastIntent.label}</span>
              {!isListening && <button onClick={clearIntent} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {activeTab === 'route' && <div className="p-4">{renderRouteTab()}</div>}
            {activeTab === 'location' && <div className="p-4">{renderExploreTab(false)}</div>}
            {activeTab === 'layers' && <div className="p-4">{renderLayersTab()}</div>}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span className="font-medium">GeoHealth Guardian</span>
              <span>Tap map to analyze</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MOBILE BOTTOM SHEET (< md)
      ══════════════════════════════════════════════ */}
      <div
        ref={sheetRef}
        className="md:hidden absolute bottom-0 left-0 right-0 z-20 pointer-events-auto"
        style={{ height: sheetHeights[sheetState], transition: 'height 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full h-full bg-white/98 backdrop-blur-2xl rounded-t-3xl shadow-[0_-4px_40px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden border-t border-gray-100">

          {/* Drag Handle + Header */}
          <div
            className="flex-shrink-0 flex flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onClick={() => setSheetState(s => s === 'collapsed' ? 'peek' : s === 'peek' ? 'expanded' : 'peek')}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mb-2" />
            <div className="flex items-center justify-between w-full px-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                  <Shield size={14} className="text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900">GeoHealth</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}
                className={`p-1.5 rounded-xl transition-all ${isSettingsOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex-shrink-0 px-4 py-2">
            <div className="flex bg-gray-100 p-1 rounded-2xl gap-0.5">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveTab(id); if (sheetState === 'collapsed') setSheetState('peek'); }}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences overlay */}
          {isSettingsOpen && (
            <div className="flex-shrink-0 mx-4 mb-2 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Preferences</span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 p-1"><X size={14} /></button>
              </div>
              <div className="px-4 pb-4 max-h-56 overflow-y-auto">
                <PreferencesPanel
                  preferences={preferences}
                  onUpdatePreference={updatePreference}
                  onAddFavoriteFood={addFavoriteFood}
                  onRemoveFavoriteFood={removeFavoriteFood}
                  onUpdateMealWindow={updateMealWindow}
                />
              </div>
            </div>
          )}

          {/* Voice Feedback */}
          <VoiceFeedback />

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {activeTab === 'route' && <div className="px-4 pb-8">{renderRouteTab()}</div>}
            {activeTab === 'location' && <div className="px-4 pb-8">{renderExploreTab(true)}</div>}
            {activeTab === 'layers' && <div className="px-4 pb-8">{renderLayersTab()}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

export default FloatingInterface;
