import React, { useState, useCallback } from 'react';
import {
  Star, Clock, Phone, MapPin, Navigation,
  Fuel, Utensils, BedDouble, Hospital,
  Wrench, Siren, ExternalLink, Loader2,
  ChevronRight
} from 'lucide-react';
import useAppStore from '../store/useAppStore';

/**
 * NearbyPlacesPanel — shows nearby places for the current selected location.
 * Renders in the Explore tab.
 */

const TYPE_CONFIG = {
  all:       { icon: '📍', label: 'All',      bg: 'bg-gray-100',  activeBg: 'bg-gray-700 text-white' },
  food:      { icon: '🍔', label: 'Food',     bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeBg: 'bg-emerald-600 text-white' },
  gas:       { icon: '⛽', label: 'Gas',      bg: 'bg-amber-50 text-amber-700 border-amber-200',   activeBg: 'bg-amber-500 text-white' },
  rest:      { icon: '🛑', label: 'Rest',     bg: 'bg-blue-50 text-blue-700 border-blue-200',     activeBg: 'bg-blue-600 text-white' },
  hospital:  { icon: '🏥', label: 'Medical',  bg: 'bg-red-50 text-red-700 border-red-200',        activeBg: 'bg-red-500 text-white' },
  mechanic:  { icon: '🔧', label: 'Mechanic', bg: 'bg-slate-50 text-slate-700 border-slate-200', activeBg: 'bg-slate-600 text-white' },
  emergency: { icon: '🚨', label: 'SOS',      bg: 'bg-rose-50 text-rose-700 border-rose-200',    activeBg: 'bg-rose-600 text-white' },
};

const HEADER_GRADIENT = {
  gas: 'from-amber-500 to-orange-500',
  food: 'from-emerald-500 to-teal-500',
  rest: 'from-blue-500 to-indigo-500',
  hospital: 'from-red-500 to-rose-600',
  mechanic: 'from-slate-500 to-slate-600',
  emergency: 'from-red-600 to-rose-700',
};

const FILTER_TYPES = ['all', 'food', 'gas', 'rest', 'hospital'];

const NearbyPlacesPanel = ({ onPlaceClick }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const { placesData, placesLoading, placesEnabled, setPlacesEnabled, setPlacePopupData, setMapCenter } = useAppStore();

  const filtered = activeFilter === 'all'
    ? (placesData || [])
    : (placesData || []).filter(p => p.type === activeFilter);

  const handleSelect = useCallback((place) => {
    if (place.lat && place.lon) {
      setMapCenter([place.lon, place.lat]);
      setPlacePopupData({ place, screenPoint: null });
    }
    if (onPlaceClick) onPlaceClick(place);
  }, [setMapCenter, setPlacePopupData, onPlaceClick]);

  return (
    <div className="flex flex-col gap-3">
      {/* Enable places toggle */}
      {!placesEnabled ? (
        <div className="flex flex-col items-center justify-center text-center py-8 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-3xl mb-3">📍</span>
          <p className="text-sm font-semibold text-gray-800 mb-1">Nearby Places</p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Enable to discover gas stations, food, rest stops, and hospitals near you.
          </p>
          <button
            onClick={() => setPlacesEnabled(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Enable Nearby Places
          </button>
        </div>
      ) : (
        <>
          {/* Filter pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            {FILTER_TYPES.map(type => {
              const cfg = TYPE_CONFIG[type];
              const isActive = activeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? `${cfg.activeBg} border-transparent shadow-sm`
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              );
            })}
            <button
              onClick={() => setPlacesEnabled(false)}
              className="flex-shrink-0 px-2 py-1.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 transition-all"
            >
              Hide
            </button>
          </div>

          {/* Loading */}
          {placesLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Fetching nearby places…</span>
            </div>
          )}

          {/* No results */}
          {!placesLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-2xl mb-2">{TYPE_CONFIG[activeFilter]?.icon || '🔍'}</span>
              <p className="text-sm text-gray-500 font-medium">No {TYPE_CONFIG[activeFilter]?.label || ''} places found</p>
              <p className="text-xs text-gray-400 mt-0.5">Try clicking the map or zooming in</p>
            </div>
          )}

          {/* Place cards */}
          {!placesLoading && filtered.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-0.5">
                {filtered.length} place{filtered.length !== 1 ? 's' : ''} nearby
              </p>
              {filtered.map((place, idx) => (
                <PlaceCard key={place.id || idx} place={place} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Place Card ────────────────────────────────────────────────────

const PlaceCard = ({ place, onSelect }) => {
  const gradient = HEADER_GRADIENT[place.type] || 'from-gray-500 to-gray-600';
  const icon = TYPE_CONFIG[place.type]?.icon || '📍';

  const handleNavigate = (e) => {
    e.stopPropagation();
    const dest = encodeURIComponent(place.address || place.name || `${place.lat},${place.lon}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
  };

  return (
    <button
      onClick={() => onSelect(place)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all overflow-hidden active:scale-[0.99]"
    >
      {/* Colored top bar */}
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />

      <div className="px-3 py-2.5 flex items-start gap-2.5">
        {/* Icon bubble */}
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <span className="text-lg leading-none">{icon}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{place.name}</p>
          
          {/* Meta row */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {place.openNow !== null && place.openNow !== undefined && (
              <span className={`text-[10px] font-semibold ${place.openNow ? 'text-emerald-600' : 'text-red-500'}`}>
                {place.openNow ? '● Open' : '● Closed'}
              </span>
            )}
            {place.rating && (
              <span className="text-[10px] text-amber-600 font-medium">
                ★ {place.rating}
                {place.reviewCount > 0 && <span className="text-gray-400 font-normal"> ({place.reviewCount})</span>}
              </span>
            )}
            {place.priceLevel && (
              <span className="text-[10px] text-gray-500 font-medium">{place.priceLevel}</span>
            )}
          </div>

          {/* Address */}
          {place.address && (
            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug truncate flex items-center gap-1">
              <MapPin size={8} className="flex-shrink-0" />
              {place.address}
            </p>
          )}
        </div>

        {/* Navigate button */}
        <button
          onClick={handleNavigate}
          className="flex-shrink-0 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
          title="Navigate"
        >
          <Navigation size={14} />
        </button>
      </div>
    </button>
  );
};

export default NearbyPlacesPanel;
