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
  Play,
  Shield,
  ExternalLink
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import AutocompleteInput from './AutocompleteInput';
import RouteJourneyFeed from './RouteJourneyFeed';

/**
 * RoutePanel — Slim form + route summary + scrollable Journey Feed.
 * The Journey Feed shows mile-by-mile weather, alerts, and nearby stops.
 */
const RoutePanel = ({
  currentLocation,
  onCalculateRoute,
  onClearRoute,
  routeData,
  loading,
  error,
  tempUnit,
  stopFilters,
  onToggleStopFilter,
  onStartTrip,
  onWaypointClick,
}) => {
  const {
    routeStart: startAddr, setRouteStart: setStartAddr,
    routeEnd: endAddr, setRouteEnd: setEndAddr,
    mapPickingMode, setMapPickingMode,
    setMapCenter,
  } = useAppStore();

  const routeWeatherData = useAppStore(s => s.routeWeatherData);
  const routeRiskLevel = useAppStore(s => s.routeRiskLevel);

  const [travelMode, setTravelMode] = useState('driving');

  const handleSubmit = (e) => {
    e.preventDefault();
    const actualStart = startAddr.trim() || currentLocation?.address;
    if (!actualStart || !endAddr.trim()) return;
    onCalculateRoute(actualStart, endAddr.trim(), travelMode);
  };

  const formatTime = (mins) => {
    if (!mins) return '–';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const handleWaypointClick = (pt) => {
    if (pt?.lat && pt?.lon) {
      setMapCenter([pt.lon, pt.lat]);
    }
    if (onWaypointClick) onWaypointClick(pt);
  };

  const riskColors = {
    high:   { bg: 'bg-red-50 border-red-200',     text: 'text-red-700',    iconColor: 'text-red-600',    iconBg: 'bg-red-100' },
    medium: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  iconColor: 'text-amber-600',  iconBg: 'bg-amber-100' },
    low:    { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  };
  const riskStyle = riskColors[routeRiskLevel] || riskColors.low;

  const riskDesc = {
    high:   'Severe weather detected. Consider delaying travel.',
    medium: 'Moderate conditions on parts of this route.',
    low:    'Conditions look good for travel.',
  };

  return (
    <div className="space-y-4">
      {/* ── Input Form ── */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Travel Mode */}
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

        {/* Start */}
        <AutocompleteInput
          value={startAddr}
          onChange={setStartAddr}
          icon={MapPin}
          iconColorClass="text-green-500"
          placeholder={currentLocation?.address
            ? `Current: ${currentLocation.address.split(',')[0]}`
            : 'Start (e.g. Chicago, IL)'}
          buttonAction={{
            icon: Navigation,
            onClick: () => setMapPickingMode(mapPickingMode === 'start' ? null : 'start'),
            title: 'Tap point on map',
            isActive: mapPickingMode === 'start',
            activeClass: 'bg-indigo-100 text-indigo-700 shadow-sm',
            inactiveClass: 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200/50'
          }}
        />

        {/* Destination */}
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

        {/* Action buttons */}
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
              <><Loader2 size={14} className="animate-spin" /> Analyzing route…</>
            ) : (
              <><Navigation size={14} /> Calculate Route</>
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

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ── Route Active: Summary + Journey Feed ── */}
      {routeData && (
        <div className="space-y-3">
          {/* Summary Header */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <p className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold mb-2">Route Summary</p>

            {/* From → To labels */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex flex-col items-center gap-0.5 pt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white shadow" />
                <div className="w-px h-4 bg-gray-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 leading-snug truncate">
                  {routeData.summary.startLabel}
                </p>
                <p className="text-xs font-semibold text-gray-800 leading-snug truncate mt-3">
                  {routeData.summary.endLabel}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium border-t border-indigo-100 pt-2 mt-1">
              <span className="flex items-center gap-1">
                {routeData.summary.travelMode === 'walking'
                  ? <Footprints size={12} className="text-emerald-500" />
                  : <Car size={12} className="text-blue-500" />}
                {routeData.summary.totalMiles} mi
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                {formatTime(routeData.summary.totalMinutes)}
              </span>
              {routeData.summary.avgTemp != null && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Thermometer size={12} className="text-orange-400" />
                    {routeData.summary.avgTemp}{tempUnit} avg
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Risk Level */}
          {routeRiskLevel && (
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${riskStyle.bg}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${riskStyle.iconBg}`}>
                <Shield size={18} className={riskStyle.iconColor} />
              </div>
              <div>
                <p className={`text-sm font-bold capitalize ${riskStyle.text}`}>
                  {routeRiskLevel} Risk Route
                </p>
                <p className="text-[10px] text-gray-500 leading-snug">{riskDesc[routeRiskLevel]}</p>
              </div>
            </div>
          )}

          {/* Start Trip */}
          <button
            onClick={onStartTrip}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Play size={16} className="fill-current" />
            Start Trip
          </button>

          {/* ── Journey Feed ── */}
          <RouteJourneyFeed
            routeWeatherPoints={routeWeatherData}
            tempUnit={tempUnit}
            onWaypointClick={handleWaypointClick}
            routeData={routeData}
          />
        </div>
      )}

      {/* ── Empty State ── */}
      {!routeData && !loading && !error && (
        <div className="flex flex-col items-center justify-center text-center mt-8 px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Shield className="text-indigo-400" size={28} />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Plan Your Route</h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-[200px] mx-auto">
            Enter a destination to get mile-by-mile weather, alerts, and smart stop suggestions.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoutePanel;
