import React, { useCallback, useRef } from 'react';
import {
  Thermometer, Wind, Droplets, MapPin,
  AlertTriangle, ChevronRight, Gauge,
  Fuel, Utensils, BedDouble, Zap,
  Car, Footprints, Clock, Navigation,
  Star, ExternalLink, Info
} from 'lucide-react';
import useAppStore from '../store/useAppStore';

/**
 * RouteJourneyFeed — Scrollable, mile-by-mile journey timeline.
 *
 * Shows each route waypoint with:
 *  - Weather (temp, condition, wind, humidity)
 *  - AQI badge
 *  - NWS alert badges (blocking)
 *  - Nearby stop chips (⛽ gas, 🍔 food, 🏥 hospital)
 *
 * Clicking a row pans the map to that waypoint and highlights it.
 */

const TYPE_ICON = { gas: '⛽', food: '🍔', rest: '🛑', hospital: '🏥', mechanic: '🔧', emergency: '🚨' };
const TYPE_LABEL = { gas: 'Gas', food: 'Food', rest: 'Rest', hospital: 'Hospital', mechanic: 'Mechanic', emergency: 'SOS' };
const TYPE_COLOR = {
  gas:       'bg-amber-50 text-amber-700 border-amber-200',
  food:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  rest:      'bg-blue-50 text-blue-700 border-blue-200',
  hospital:  'bg-red-50 text-red-700 border-red-200',
  mechanic:  'bg-slate-50 text-slate-700 border-slate-200',
  emergency: 'bg-rose-50 text-rose-700 border-rose-200',
};

function getConditionEmoji(desc = '') {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('snow') || d.includes('blizzard')) return '❄️';
  if (d.includes('rain') || d.includes('shower')) return '🌧️';
  if (d.includes('drizzle')) return '🌦️';
  if (d.includes('mist') || d.includes('fog')) return '🌫️';
  if (d.includes('overcast')) return '☁️';
  if (d.includes('cloud')) return '⛅';
  if (d.includes('clear') || d.includes('sunny')) return '☀️';
  return '🌤️';
}

const SEVERITY_BG = {
  severe:   { row: 'border-l-red-500 bg-red-50/40', badge: 'bg-red-100 text-red-800 border-red-300' },
  moderate: { row: 'border-l-orange-400 bg-orange-50/30', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  low:      { row: 'border-l-transparent', badge: '' },
};

const AQI_COLOR = ['', 'bg-green-100 text-green-700', 'bg-yellow-100 text-yellow-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700', 'bg-purple-100 text-purple-700'];

const RouteJourneyFeed = ({ routeWeatherPoints, tempUnit, onWaypointClick, routeData }) => {
  const selectedIdx = useAppStore(s => s.selectedRouteWaypointIndex);
  const setSelectedIdx = useAppStore(s => s.setSelectedRouteWaypointIndex);
  const selectedRef = useRef(null);

  const handleSelect = useCallback((pt, idx) => {
    setSelectedIdx(idx);
    if (onWaypointClick) onWaypointClick(pt, idx);
  }, [setSelectedIdx, onWaypointClick]);

  if (!routeWeatherPoints || routeWeatherPoints.length === 0) return null;

  // Group visible stop types per waypoint (deduplicated types only)
  const getStopTypes = (pt) => {
    const types = [...new Set((pt.nearbyStops || []).map(s => s.type))];
    return types.slice(0, 4); // max 4 pill badges
  };

  return (
    <div className="mt-3 space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
          Journey · {routeWeatherPoints.length} Waypoints
        </p>
        <p className="text-[10px] text-gray-400">Tap to explore</p>
      </div>

      {/* Route alerts summary at top if any */}
      {routeData?.routeAlerts?.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-700">
              {routeData.routeAlerts.length} Active Alert{routeData.routeAlerts.length > 1 ? 's' : ''} on Route
            </p>
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {routeData.routeAlerts.slice(0, 3).map((alert, i) => (
              <div key={alert.id || i} className="flex items-start gap-1.5">
                <span className="text-sm flex-shrink-0">{alert.icon}</span>
                <p className="text-[10px] text-red-700 leading-snug font-medium">
                  {alert.event} {alert.mileMarker != null ? `· Mile ${alert.mileMarker}` : ''}
                </p>
              </div>
            ))}
            {routeData.routeAlerts.length > 3 && (
              <p className="text-[10px] text-red-500 font-semibold">+{routeData.routeAlerts.length - 3} more alerts…</p>
            )}
          </div>
        </div>
      )}

      {/* Waypoint rows */}
      <div className="space-y-1.5 relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[22px] top-3 bottom-3 w-px bg-gray-200 z-0" />

        {routeWeatherPoints.map((pt, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === routeWeatherPoints.length - 1;
          const isSelected = selectedIdx === idx;
          const severity = pt.severity?.tier || 'low';
          const sevStyle = SEVERITY_BG[severity] || SEVERITY_BG.low;
          const stopTypes = getStopTypes(pt);
          const hasAlerts = pt.nearbyAlerts?.length > 0;
          const emoji = getConditionEmoji(pt.weather?.description || '');

          return (
            <button
              key={idx}
              ref={isSelected ? selectedRef : null}
              onClick={() => handleSelect(pt, idx)}
              className={`relative w-full text-left flex items-start gap-3 p-2.5 rounded-xl border-l-4 transition-all cursor-pointer
                ${isSelected
                  ? 'bg-indigo-50 border-l-indigo-500 shadow-sm ring-1 ring-indigo-200'
                  : `hover:bg-gray-50 ${sevStyle.row}`
                }
              `}
            >
              {/* Mile marker bubble */}
              <div className={`relative z-10 flex-shrink-0 w-11 h-11 rounded-full flex flex-col items-center justify-center text-center border-2 ${
                isFirst ? 'bg-green-500 border-green-600 text-white' :
                isLast ? 'bg-indigo-600 border-indigo-700 text-white' :
                isSelected ? 'bg-indigo-100 border-indigo-400 text-indigo-700' :
                severity === 'severe' ? 'bg-red-100 border-red-300 text-red-700' :
                severity === 'moderate' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                'bg-white border-gray-200 text-gray-600'
              }`}>
                {isFirst ? (
                  <span className="text-[9px] font-bold leading-none">START</span>
                ) : isLast ? (
                  <span className="text-[9px] font-bold leading-none">END</span>
                ) : (
                  <>
                    <span className="text-[9px] font-bold leading-none">{pt.mileMarker}</span>
                    <span className="text-[8px] leading-none opacity-70">mi</span>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Row 1: condition + temp */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base leading-none">{emoji}</span>
                  {pt.weather ? (
                    <>
                      <span className="text-sm font-bold text-gray-900">
                        {typeof pt.weather.temp === 'number' ? `${pt.weather.temp.toFixed(0)}${tempUnit || '°C'}` : '–'}
                      </span>
                      <span className="text-[11px] text-gray-500 capitalize truncate max-w-[100px]">
                        {pt.weather.description || pt.weather.condition || '–'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No weather data</span>
                  )}

                  {/* AQI badge */}
                  {pt.airQuality && pt.airQuality.aqi >= 3 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${AQI_COLOR[pt.airQuality.aqi] || 'bg-gray-100 text-gray-600'}`}>
                      AQI {pt.airQuality.label}
                    </span>
                  )}

                  {/* Alert badge */}
                  {hasAlerts && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 flex items-center gap-0.5">
                      <AlertTriangle size={8} />
                      {pt.nearbyAlerts[0].event.split(' ')[0]}
                    </span>
                  )}
                </div>

                {/* Row 2: wind + humidity if selected */}
                {isSelected && pt.weather && (
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                    <span className="flex items-center gap-0.5">
                      <Wind size={10} /> {pt.weather.windSpeed ?? '–'} m/s
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Droplets size={10} /> {pt.weather.humidity ?? '–'}%
                    </span>
                    {pt.airQuality && (
                      <span className="flex items-center gap-0.5">
                        <Gauge size={10} /> AQI {pt.airQuality.aqi ?? '–'}
                      </span>
                    )}
                  </div>
                )}

                {/* Row 3: Alert details if selected */}
                {isSelected && hasAlerts && (
                  <div className="mt-1.5 space-y-1">
                    {pt.nearbyAlerts.slice(0, 2).map((alert, ai) => (
                      <div key={ai} className="flex items-start gap-1.5 bg-red-50 rounded-lg px-2 py-1.5 border border-red-200">
                        <span className="text-xs">{alert.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-red-800 leading-tight">{alert.event}</p>
                          <p className="text-[9px] text-red-600 truncate">{alert.headline?.slice(0, 80)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Row 4: Nearby stop pills */}
                {stopTypes.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {stopTypes.map(type => (
                      <span
                        key={type}
                        className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLOR[type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
                      >
                        {TYPE_ICON[type]} {TYPE_LABEL[type]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded nearby places if selected */}
                {isSelected && pt.nearbyStops?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">Nearby</p>
                    {pt.nearbyStops.slice(0, 3).map((stop, si) => (
                      <div key={si} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-gray-100 shadow-sm">
                        <span className="text-sm">{TYPE_ICON[stop.type] || '📍'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-gray-800 truncate">{stop.name}</p>
                          {stop.rating && (
                            <p className="text-[9px] text-amber-600">
                              {'★'.repeat(Math.round(stop.rating))} {stop.rating}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dest = encodeURIComponent(stop.address || `${stop.lat},${stop.lon}`);
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
                          }}
                          className="text-indigo-600 hover:text-indigo-800 flex-shrink-0 p-1"
                        >
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Chevron indicator */}
              <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-transform ${isSelected ? 'text-indigo-500 rotate-90' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RouteJourneyFeed;
