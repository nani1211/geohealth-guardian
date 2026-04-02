import React from 'react';
import { Thermometer } from 'lucide-react';

/**
 * UnitToggle — compact button in the top-right corner of the map area.
 * Toggles between Metric (°C, m/s) and Imperial (°F, mph).
 *
 * Props:
 *  • isMetric     — boolean
 *  • onToggle     — callback
 */
const UnitToggle = ({ isMetric, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="
        absolute top-4 right-4 z-30
        flex items-center gap-1.5
        bg-white/95 backdrop-blur-sm
        px-3 py-2 rounded-xl shadow-lg border border-gray-200
        hover:shadow-xl hover:border-gray-300
        transition-all duration-200 cursor-pointer
        group
      "
      title={`Switch to ${isMetric ? 'Imperial (°F, mph)' : 'Metric (°C, m/s)'}`}
    >
      <Thermometer
        size={14}
        className="text-orange-500 group-hover:scale-110 transition-transform"
      />
      <span className="text-xs font-bold text-gray-700">
        {isMetric ? '°C' : '°F'}
      </span>
      <span className="text-[10px] text-gray-400 font-medium">
        {isMetric ? 'm/s' : 'mph'}
      </span>
    </button>
  );
};

export default UnitToggle;
