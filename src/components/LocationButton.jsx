import React from 'react';
import { LocateFixed } from 'lucide-react';

/**
 * LocationButton — "Use My Location" button placed on the map.
 * Positioned below the UnitToggle in the top-right area.
 *
 * Props:
 *  • onClick  — callback
 *  • loading  — boolean (show spinner)
 */
const LocationButton = ({ onClick, loading = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="
        absolute top-16 right-4 z-30
        flex items-center gap-1.5
        bg-white/95 backdrop-blur-sm
        px-3 py-2 rounded-xl shadow-lg border border-gray-200
        hover:shadow-xl hover:border-blue-300
        transition-all duration-200 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        group
      "
      title="Use my current location"
    >
      <LocateFixed
        size={14}
        className={`text-blue-500 group-hover:scale-110 transition-transform ${loading ? 'animate-pulse' : ''}`}
      />
      <span className="text-xs font-semibold text-gray-700">
        {loading ? 'Locating…' : 'My Location'}
      </span>
    </button>
  );
};

export default LocationButton;
