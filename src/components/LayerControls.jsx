import React from 'react';
import { Cloud, Bug, Car } from 'lucide-react';

/**
 * LayerControls — toggle switches for Weather, Disease, and Traffic layers.
 *
 * Props:
 *  • weatherOn (bool)   — current state of weather layer
 *  • diseaseOn (bool)   — current state of disease layer
 *  • trafficOn (bool)   — current state of traffic layer
 *  • onToggle(layerId)  — called with 'weather', 'disease', or 'traffic'
 */
const LayerControls = ({ weatherOn, diseaseOn, trafficOn, onToggle }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Data Layers
      </h3>

      {/* Weather toggle */}
      <ToggleRow
        icon={<Cloud size={16} />}
        label="NWS Warnings"
        color="sky"
        active={weatherOn}
        onToggle={() => onToggle('weather')}
      />

      {/* Disease toggle */}
      <ToggleRow
        icon={<Bug size={16} />}
        label="Disease Outbreaks"
        color="rose"
        active={diseaseOn}
        onToggle={() => onToggle('disease')}
      />

      {/* Traffic toggle */}
      <ToggleRow
        icon={<Car size={16} />}
        label="Live Traffic"
        color="amber"
        active={trafficOn}
        onToggle={() => onToggle('traffic')}
      />
    </div>
  );
};

/**
 * Reusable toggle row with icon, label, and a styled switch.
 */
const ToggleRow = ({ icon, label, color, active, onToggle }) => {
  const colorMap = {
    sky:  { bg: 'bg-sky-500',  ring: 'ring-sky-300',  iconActive: 'text-sky-600',  iconInactive: 'text-gray-400' },
    rose: { bg: 'bg-rose-500', ring: 'ring-rose-300', iconActive: 'text-rose-600', iconInactive: 'text-gray-400' },
    amber:{ bg: 'bg-amber-500',ring: 'ring-amber-300',iconActive: 'text-amber-600',iconInactive: 'text-gray-400' },
  };
  const c = colorMap[color] || colorMap.sky;

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? c.iconActive : c.iconInactive}>{icon}</span>
        <span className={`text-sm font-medium ${active ? 'text-gray-800' : 'text-gray-400'}`}>
          {label}
        </span>
      </div>

      {/* Switch */}
      <div
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200
          ${active ? c.bg : 'bg-gray-300'}
        `}
      >
        <div
          className={`
            absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200
            ${active ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </div>
    </button>
  );
};

export default LayerControls;
