import React, { useState } from 'react';
import {
  Activity,
  CloudRain,
  Droplets,
  ThermometerSun,
  Wind,
  MapPin,
  ChevronLeft,
  Menu,
  Shield,
  Navigation,
  Star,
  Gauge,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import LayerControls from './LayerControls';
import ForecastPanel from './ForecastPanel';
import RoutePanel from './RoutePanel';

/**
 * Sidebar — left-side panel with two tabs: Location (click weather) | Route (A→B weather).
 * Collapsible on mobile via a hamburger toggle.
 */
const Sidebar = ({
  addressData,
  locationData,
  weatherData,
  forecastData,
  nearbyPlaces,
  airQualityData,
  nwsAlerts,
  routeData,
  routeLoading,
  routeError,
  onCalculateRoute,
  onClearRoute,
  tempUnit,
  windUnit,
  weatherLayerOn,
  diseaseLayerOn,
  trafficLayerOn,
  onToggleLayer,
  currentLocation,
  stopFilters,
  onToggleStopFilter,
  searchRadiusMiles,
  onRadiusChange,
  onPlaceClick,
  preferencesPanel,
  onStartTrip,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('location'); // 'location' | 'route'

  const RADIUS_PILLS = [1, 3, 5, 10];

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }, (_, i) => (
          <Star key={i} size={8} className="text-amber-400 fill-amber-400" />
        ))}
        {half && <Star size={8} className="text-amber-400 fill-amber-200" />}
        <span className="text-[10px] text-amber-600 font-semibold ml-0.5">{rating}</span>
      </span>
    );
  };

  return (
    <>
      {/* ── Mobile toggle overlay is no longer needed with Bottom Sheet ────── */}

      {/* ── Sidebar / Bottom Sheet panel ─────────────────────────────── */}
      <aside
        className={`
          fixed md:relative z-40 
          bottom-0 md:top-0 left-0 
          w-full md:w-[380px] 
          h-[80vh] md:h-full
          bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl md:border-r border-gray-200
          rounded-t-[32px] md:rounded-none
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${collapsed ? 'translate-y-[calc(100%-80px)] md:translate-y-0 md:!w-16 overflow-hidden' : 'translate-y-0 overflow-y-auto md:overflow-hidden'}
        `}
      >
        {/* Mobile Drag Handle / Notch */}
        <div 
          className="w-full flex justify-center pt-3 pb-1 md:hidden cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">GeoHealth</h1>
                <p className="text-[11px] text-gray-400 uppercase tracking-wider">Guardian</p>
              </div>
            </div>
            {/* Arrow logic for Desktop vs Mobile */}
            <div className="flex items-center gap-1">
              {preferencesPanel}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <ChevronLeft size={20} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Click the map or plan a route to assess weather conditions.
          </p>
          <div id="sidebar-search-container" className="mt-4 rounded-xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex-shrink-0"></div>
        </div>

        {/* ── Tab pills ────────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('location')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer
                ${activeTab === 'location'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MapPin size={13} />
              Location
            </button>
            <button
              onClick={() => setActiveTab('route')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer
                ${activeTab === 'route'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Navigation size={13} />
              Route
            </button>
          </div>
        </div>

        {/* ── Content area ─────────────────────────────────────────── */}
        <div className="flex-1 p-5 pt-2 overflow-y-auto overflow-x-hidden custom-scrollbar pb-24">
          {/* Layer toggles (always visible) */}
          <div className="mb-4">
            <LayerControls
              weatherOn={weatherLayerOn}
              diseaseOn={diseaseLayerOn}
              trafficOn={trafficLayerOn}
              onToggle={onToggleLayer}
            />
          </div>

          {/* ── LOCATION TAB ─────────────────────────────────────── */}
          {activeTab === 'location' && (
            <>
              {locationData ? (
                <div className="space-y-5">
                  {/* Location card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin size={14} className="text-blue-600" />
                      <h2 className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                        Selected Location
                      </h2>
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-snug">
                      {addressData?.formatted || 'Resolving address…'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      📍 {locationData.lat.toFixed(4)}, {locationData.lon.toFixed(4)}
                    </p>
                  </div>

                  {/* Weather data */}
                  {weatherData ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Current Conditions
                      </h3>

                      {/* Temperature */}
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 rounded-2xl border border-orange-100 text-center">
                        <ThermometerSun className="mx-auto text-orange-500 mb-2" size={28} />
                        <p className="text-3xl font-extrabold text-orange-600">{weatherData.temp}{tempUnit || '°C'}</p>
                        <p className="text-xs text-orange-400 mt-1 uppercase tracking-wider">Temperature</p>
                      </div>

                      {/* Condition */}
                      <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-xl border border-sky-100 flex items-center gap-3">
                        <CloudRain className="text-sky-500 flex-shrink-0" size={22} />
                        <div>
                          <p className="text-[10px] text-sky-600 uppercase tracking-wider">Condition</p>
                          <p className="text-base font-bold text-gray-900 capitalize">
                            {weatherData.description || weatherData.condition}
                          </p>
                        </div>
                      </div>

                      {/* Humidity + Wind */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-100 text-center">
                          <Droplets className="mx-auto text-teal-500 mb-1" size={20} />
                          <p className="text-xl font-bold text-teal-700">{weatherData.humidity}%</p>
                          <p className="text-[10px] text-teal-500 uppercase tracking-wider mt-0.5">Humidity</p>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                          <Wind className="mx-auto text-slate-500 mb-1" size={20} />
                          <p className="text-xl font-bold text-slate-700">{weatherData.windSpeed} {windUnit || 'm/s'}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Wind</p>
                        </div>
                      </div>

                      {/* ── Air Quality Card ─────────────────────────── */}
                      {airQualityData && (
                        <div className={`p-4 rounded-xl border ${
                          airQualityData.aqi >= 4 ? 'bg-red-50 border-red-200' :
                          airQualityData.aqi >= 3 ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Gauge size={16} className={
                              airQualityData.aqi >= 4 ? 'text-red-500' :
                              airQualityData.aqi >= 3 ? 'text-yellow-500' :
                              'text-green-500'
                            } />
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-600">Air Quality</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-lg font-extrabold ${
                                airQualityData.aqi >= 4 ? 'text-red-600' :
                                airQualityData.aqi >= 3 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>{airQualityData.label}</p>
                              <p className="text-[10px] text-gray-400">AQI Level {airQualityData.aqi}/5</p>
                            </div>
                            <div className="text-right space-y-0.5">
                              {airQualityData.pm25 != null && (
                                <p className="text-[10px] text-gray-500">PM2.5: <span className="font-semibold">{airQualityData.pm25}</span> μg/m³</p>
                              )}
                              {airQualityData.pm10 != null && (
                                <p className="text-[10px] text-gray-500">PM10: <span className="font-semibold">{airQualityData.pm10}</span> μg/m³</p>
                              )}
                              {airQualityData.o3 != null && (
                                <p className="text-[10px] text-gray-500">O₃: <span className="font-semibold">{airQualityData.o3}</span> μg/m³</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── NWS Active Alerts ─────────────────────── */}
                      {nwsAlerts && nwsAlerts.length > 0 && (
                        <div className="bg-red-50 p-3.5 rounded-xl border border-red-200">
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle size={14} className="text-red-500" />
                            <p className="text-[10px] text-red-700 uppercase tracking-wider font-bold">Active Alerts ({nwsAlerts.length})</p>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {nwsAlerts.map((alert, i) => (
                              <div key={alert.id || i} className="bg-white/80 p-2.5 rounded-lg border border-red-100">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{alert.icon}</span>
                                  <p className="text-[11px] font-bold text-red-800">{alert.event}</p>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-1 leading-snug line-clamp-2">{alert.headline}</p>
                                {alert.instruction && (
                                  <p className="text-[9px] text-red-600 mt-1 font-semibold">⚡ {alert.instruction.slice(0, 120)}…</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Forecast */}
                      {forecastData && forecastData.length > 0 && (
                        <ForecastPanel forecast={forecastData} />
                      )}

                      {/* ── Nearby Places Section ─────────────────────── */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                            Nearby Stops
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onToggleStopFilter('gas')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('gas') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              ⛽ Gas
                            </button>
                            <button
                              onClick={() => onToggleStopFilter('food')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('food') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              🍔 Food
                            </button>
                            <button
                              onClick={() => onToggleStopFilter('rest')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('rest') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              🛑 Rest
                            </button>
                            <button
                              onClick={() => onToggleStopFilter('emergency')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('emergency') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              🚨 Policy/Emerg
                            </button>
                            <button
                              onClick={() => onToggleStopFilter('hospital')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('hospital') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              🏥 Hospital
                            </button>
                            <button
                              onClick={() => onToggleStopFilter('mechanic')}
                              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                                stopFilters?.includes('mechanic') ? 'bg-slate-200 text-slate-700' : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              🔧 Mechanic
                            </button>
                          </div>
                        </div>

                        {/* Radius pills */}
                        <div className="flex gap-1.5 mb-3">
                          {RADIUS_PILLS.map((r) => (
                            <button
                              key={r}
                              onClick={() => onRadiusChange?.(r)}
                              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all cursor-pointer ${
                                searchRadiusMiles === r
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500'
                              }`}
                            >
                              {r} mi
                            </button>
                          ))}
                        </div>

                        {nearbyPlaces && nearbyPlaces.length > 0 ? (
                          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {nearbyPlaces.filter(stop => stopFilters?.includes(stop.type)).map((stop, i) => (
                              <div
                                key={stop.id || i}
                                onClick={() => onPlaceClick?.(stop)}
                                className="flex items-start gap-2 p-2.5 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow cursor-pointer transition-all"
                              >
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 text-sm flex-shrink-0 mt-0.5">
                                  {stop.type === 'gas' ? '⛽' : stop.type === 'food' ? '🍔' : stop.type === 'hospital' ? '🏥' : stop.type === 'mechanic' ? '🔧' : stop.type === 'emergency' ? '🚨' : '🛑'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{stop.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {stop.rating && renderStars(stop.rating)}
                                    {stop.reviewCount > 0 && (
                                      <span className="text-[9px] text-gray-400">({stop.reviewCount})</span>
                                    )}
                                    {stop.priceLevel && (
                                      <span className="text-[10px] text-green-600 font-semibold">{stop.priceLevel}</span>
                                    )}
                                    {stop.openNow !== null && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        stop.openNow ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                      }`}>
                                        {stop.openNow ? 'Open' : 'Closed'}
                                      </span>
                                    )}
                                  </div>
                                  {stop.address && (
                                    <p className="text-[9px] text-gray-400 truncate mt-0.5">{stop.address}</p>
                                  )}
                                  {stop.phone && (
                                    <p className="text-[9px] text-gray-400 truncate mt-0.5 font-medium">📞 {stop.phone}</p>
                                  )}
                                  {/* Navigate button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const dest = encodeURIComponent(stop.address || `${stop.lat},${stop.lon}`);
                                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                                    }}
                                    className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                                  >
                                    <ExternalLink size={10} />
                                    Navigate
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic text-center py-3">No stops found in this radius</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-10 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="text-blue-500 animate-pulse" size={28} />
                        <p className="text-gray-500 text-xs">Fetching environmental data…</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center h-full px-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <Activity className="text-blue-500" size={30} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">No Location Selected</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Select a point on the interactive map to begin environmental risk analysis.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── ROUTE TAB ────────────────────────────────────────── */}
          {activeTab === 'route' && (
            <RoutePanel
              onCalculateRoute={onCalculateRoute}
              onClearRoute={onClearRoute}
              routeData={routeData}
              loading={routeLoading}
              error={routeError}
              tempUnit={tempUnit}
              currentLocation={currentLocation}
              stopFilters={stopFilters}
              onToggleStopFilter={onToggleStopFilter}
              onStartTrip={onStartTrip}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            Powered by ArcGIS, Google Places &amp; OpenWeather
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
