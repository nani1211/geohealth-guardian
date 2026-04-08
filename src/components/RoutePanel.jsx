import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Loader2,
  AlertTriangle,
  Thermometer,
  Wind,
  X,
  Car,
  Footprints,
  Clock,
  Star,
  Utensils,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  Shield
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import AutocompleteInput from './AutocompleteInput';

/**
 * RoutePanel — Start/Destination inputs, calculate button, route summary,
 * waypoint list, recommended stops with ratings, and meal recommendations.
 */
const RoutePanel = ({ currentLocation, onCalculateRoute, onClearRoute, routeData, loading, error, tempUnit, stopFilters, onToggleStopFilter, onStartTrip }) => {
  // Pull routing inputs and map picking mode from global store
  const { 
    routeStart: startAddr, setRouteStart: setStartAddr,
    routeEnd: endAddr, setRouteEnd: setEndAddr,
    mapPickingMode, setMapPickingMode 
  } = useAppStore();

  const [travelMode, setTravelMode] = useState('driving');
  const [showDirections, setShowDirections] = useState(false);

  // Pull weather points and risk level from global store
  const routeWeatherData = useAppStore(s => s.routeWeatherData);
  const routeRiskLevel = useAppStore(s => s.routeRiskLevel);

  const handleSubmit = (e) => {
    e.preventDefault();
    const actualStart = startAddr.trim() || currentLocation?.address;
    if (!actualStart || !endAddr.trim()) return;
    onCalculateRoute(actualStart, endAddr.trim(), travelMode);
  };

  const severityBg = {
    Good: 'bg-green-100 text-green-700 border-green-200',
    Moderate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Poor: 'bg-orange-100 text-orange-700 border-orange-200',
    Dangerous: 'bg-red-100 text-red-700 border-red-200',
  };

  const severityDot = {
    Good: 'bg-green-500',
    Moderate: 'bg-yellow-500',
    Poor: 'bg-orange-500',
    Dangerous: 'bg-red-500',
  };

  const formatTime = (mins) => {
    if (!mins) return '–';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: full }, (_, i) => (
          <Star key={i} size={9} className="text-amber-400 fill-amber-400" />
        ))}
        {half && <Star size={9} className="text-amber-400 fill-amber-200" />}
        <span className="text-[10px] text-amber-600 font-semibold ml-0.5">{rating}</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Travel Mode Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTravelMode('driving')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              travelMode === 'driving' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Car size={14} /> Driving
          </button>
          <button
            type="button"
            onClick={() => setTravelMode('walking')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              travelMode === 'walking' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Footprints size={14} /> Walking
          </button>
        </div>

        {/* Start Input */}
        <AutocompleteInput
          value={startAddr}
          onChange={setStartAddr}
          icon={MapPin}
          iconColorClass="text-green-500"
          placeholder={currentLocation?.address ? `Current Location (${currentLocation.address})` : 'Start location (e.g. Chicago, IL)'}
          buttonAction={{
            icon: Navigation,
            onClick: () => setMapPickingMode(mapPickingMode === 'start' ? null : 'start'),
            title: 'Tap point on map',
            isActive: mapPickingMode === 'start',
            activeClass: 'bg-indigo-100 text-indigo-700 shadow-sm',
            inactiveClass: 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200/50'
          }}
        />

        {/* Destination Input */}
        <AutocompleteInput
          value={endAddr}
          onChange={setEndAddr}
          icon={Navigation}
          iconColorClass="text-red-500"
          placeholder="Destination (e.g. New York, NY)"
          buttonAction={{
            icon: MapPin,
            onClick: () => setMapPickingMode(mapPickingMode === 'end' ? null : 'end'),
            title: 'Tap point on map',
            isActive: mapPickingMode === 'end',
            activeClass: 'bg-emerald-100 text-emerald-700 shadow-sm',
            inactiveClass: 'text-gray-400 hover:text-emerald-600 hover:bg-gray-200/50'
          }}
        />

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || (!startAddr.trim() && !currentLocation?.address) || !endAddr.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold
                       text-white bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl
                       hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50
                       transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analyzing route...
              </>
            ) : (
              <>
                <Navigation size={14} />
                Calculate Route
              </>
            )}
          </button>
          {routeData && (
            <button
              type="button"
              onClick={onClearRoute}
              className="px-3 py-2.5 text-sm text-gray-500 bg-gray-100 rounded-xl
                         hover:bg-gray-200 transition-colors cursor-pointer"
              title="Clear route"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Route summary */}
      {routeData && (
        <div className="space-y-3">
          {/* Summary header */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider font-semibold mb-1">
              Route Summary
            </p>
            <p className="text-sm font-medium text-gray-800 leading-snug">
              {routeData.summary.startLabel}
            </p>
            <p className="text-[10px] text-gray-400 my-0.5">→</p>
            <p className="text-sm font-medium text-gray-800 leading-snug">
              {routeData.summary.endLabel}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                {routeData.summary.travelMode === 'walking' ? <Footprints size={12} className="text-emerald-500" /> : <Car size={12} className="text-blue-500" />}
                {routeData.summary.totalMiles} mi
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {formatTime(routeData.summary.totalMinutes)}
              </span>
              {routeData.summary.avgAqi && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Wind size={12} className="text-purple-400" />
                    AQI {routeData.summary.avgAqi}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Route Risk Level Card */}
          {routeRiskLevel && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              routeRiskLevel === 'high' ? 'bg-red-50 border-red-200' :
              routeRiskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                routeRiskLevel === 'high' ? 'bg-red-100' :
                routeRiskLevel === 'medium' ? 'bg-amber-100' :
                'bg-emerald-100'
              }`}>
                <Shield size={20} className={`${
                  routeRiskLevel === 'high' ? 'text-red-600' :
                  routeRiskLevel === 'medium' ? 'text-amber-600' :
                  'text-emerald-600'
                }`} />
              </div>
              <div>
                <p className={`text-sm font-bold capitalize ${
                  routeRiskLevel === 'high' ? 'text-red-700' :
                  routeRiskLevel === 'medium' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {routeRiskLevel} Risk Route
                </p>
                <p className="text-[10px] text-gray-500">
                  {routeRiskLevel === 'high' ? 'Severe weather conditions detected. Consider delaying.' :
                   routeRiskLevel === 'medium' ? 'Moderate conditions along parts of the route.' :
                   'Weather conditions look favorable for travel.'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onStartTrip}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Play size={16} className="fill-current" />
            Start Trip
          </button>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
              <Thermometer className="mx-auto text-orange-500 mb-1" size={16} />
              <p className="text-base font-bold text-orange-600">
                {routeData.summary.avgTemp}{tempUnit}
              </p>
              <p className="text-[9px] text-orange-400 uppercase tracking-wider">Avg Temp</p>
            </div>
            <div className={`p-3 rounded-xl border text-center ${severityBg[routeData.summary.worstSeverity] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              <AlertTriangle className="mx-auto mb-1" size={16} />
              <p className="text-[11px] font-bold capitalize">
                {routeData.summary.worstCondition}
              </p>
              <p className="text-[9px] uppercase tracking-wider opacity-70">Worst</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
              <MapPin className="mx-auto text-blue-500 mb-1" size={16} />
              <p className="text-base font-bold text-blue-600">
                {routeData.summary.sampledPoints || '–'}
              </p>
              <p className="text-[9px] text-blue-400 uppercase tracking-wider">Samples</p>
            </div>
          </div>

          {/* Waypoint list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Route Weather Points
              </p>
              <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"/> Normal</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"/> Mod</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"/> Severe</span>
              </div>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(routeWeatherData || []).map((pt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${severityDot[pt.severity?.label] || 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400">Mile {pt.mileMarker}</p>
                  </div>
                  <p className="text-xs font-bold text-gray-700 flex-shrink-0">
                    {pt.weather?.temp ?? '–'}{tempUnit}
                  </p>
                  <p className="text-[10px] text-gray-500 capitalize truncate max-w-[80px]">
                    {pt.weather?.description || '–'}
                  </p>
                  {pt.airQuality && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      pt.airQuality.aqi >= 4 ? 'bg-purple-100 text-purple-700' :
                      pt.airQuality.aqi >= 3 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      AQI {pt.airQuality.aqi}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-Step Directions */}
          {routeData.directions && routeData.directions.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDirections(!showDirections)}
                className="w-full flex items-center justify-between p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                type="button"
              >
                <div className="flex items-center gap-2">
                  <Navigation size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-gray-700">Step-by-Step Directions</span>
                </div>
                {showDirections ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              
              {showDirections && (
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {routeData.directions.map((dir, i) => (
                    <div key={i} className="flex gap-3 items-start p-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                      <div className="bg-blue-100 text-blue-700 font-mono text-[10px] px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                        {dir.attributes.length > 0 ? `${dir.attributes.length.toFixed(1)} mi` : '•'}
                      </div>
                      <p className="text-xs text-gray-700 leading-snug">{dir.attributes.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Meal Recommendations ─────────────────────────────── */}
          {routeData.mealRecommendations?.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Utensils size={12} className="text-teal-500" />
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                  Meal Recommendations
                </p>
              </div>
              <div className="space-y-1.5">
                {routeData.mealRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{rec.isFavorite ? '⭐' : '🍽️'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{rec.stop.name}</p>
                        <p className="text-[10px] text-teal-600">{rec.suggestion}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {rec.stop.rating && renderStars(rec.stop.rating)}
                          {rec.stop.priceLevel && (
                            <span className="text-[10px] text-gray-400 font-semibold">{rec.stop.priceLevel}</span>
                          )}
                          <span className="text-[10px] text-gray-400">Mile {rec.stop.mileMarker}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Smart Stop Suggestions ────────────────────────── */}
          {routeData.smartStops && (routeData.smartStops.upcoming?.length > 0 || routeData.smartStops.later?.length > 0) && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-indigo-500" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Smart Stop Suggestions
                  </p>
                </div>
                <div className="flex gap-1">
                  {['gas', 'food', 'rest', 'emergency'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => onToggleStopFilter(filter)}
                      className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors cursor-pointer ${
                        stopFilters?.includes(filter)
                          ? filter === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {filter === 'gas' ? '⛽' : filter === 'food' ? '🍔' : filter === 'rest' ? '🛑' : '🚨'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upcoming stops */}
              {routeData.smartStops.upcoming?.filter(s => stopFilters?.includes(s.type)).length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    Upcoming
                  </p>
                  <div className="space-y-1.5">
                    {routeData.smartStops.upcoming.filter(s => stopFilters?.includes(s.type)).map((stop, i) => (
                      <SmartStopCard key={stop.id || i} stop={stop} renderStars={renderStars} />
                    ))}
                  </div>
                </div>
              )}

              {/* Later stops */}
              {routeData.smartStops.later?.filter(s => stopFilters?.includes(s.type)).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                    Later
                  </p>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {routeData.smartStops.later.filter(s => stopFilters?.includes(s.type)).map((stop, i) => (
                      <SmartStopCard key={stop.id || i} stop={stop} renderStars={renderStars} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!routeData && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-12 px-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Shield className="text-blue-500" size={30} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No Route Selected</h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">
            Enter a start and destination above to compute route weather and safety risks.
          </p>
        </div>
      )}
    </div>
  );
};

// ─── SmartStopCard — individual stop suggestion ───────────────────
const SmartStopCard = ({ stop, renderStars }) => {
  const emoji = stop._emoji || (
    stop.type === 'gas' ? '⛽' :
    stop.type === 'food' ? '🍔' :
    stop.type === 'hospital' ? '🏥' :
    stop.type === 'mechanic' ? '🔧' :
    stop.type === 'emergency' ? '🚨' : '🛑'
  );

  return (
    <div className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow transition-all">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-base flex-shrink-0 mt-0.5">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{stop.name}</p>

        {/* Contextual reason */}
        {stop._reason && (
          <p className="text-[10px] text-indigo-500 mt-0.5 leading-snug">{stop._reason}</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
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

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-400">Mile {stop.mileMarker}</span>
          {stop._segLabel && (
            <span className="text-[9px] text-gray-300 font-medium">· {stop._segLabel}</span>
          )}
        </div>

        {stop.address && (
          <p className="text-[9px] text-gray-400 truncate mt-0.5">{stop.address}</p>
        )}

        <button
          onClick={() => {
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
  );
};

export default RoutePanel;
