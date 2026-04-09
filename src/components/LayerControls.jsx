import React from 'react';
import { Cloud, Bug, Car } from 'lucide-react';

/**
 * Accepts either:
 *  - New API: activeLayers (object), onToggleLayer (fn)
 *  - Old API: weatherOn, diseaseOn, trafficOn, onToggle (fn)
 * vertical prop — renders toggle rows only (no horizontal pill layout)
 */
const LayerControls = ({ activeLayers, onToggleLayer, weatherOn, diseaseOn, trafficOn, onToggle, vertical }) => {
  // Resolve new vs old API
  const isOn = (key, fallback) => activeLayers ? !!activeLayers[key] : !!fallback;
  const toggle = (key) => {
    if (onToggleLayer) onToggleLayer(key);
    else if (onToggle) onToggle(key);
  };

  const layers = [
    { key: 'weather', icon: <Cloud size={16} />, label: 'NWS Warnings', color: 'sky', active: isOn('weather', weatherOn) },
    { key: 'disease', icon: <Bug size={16} />, label: 'Disease Outbreaks', color: 'rose', active: isOn('disease', diseaseOn) },
    { key: 'traffic', icon: <Car size={16} />, label: 'Live Traffic', color: 'amber', active: isOn('traffic', trafficOn) },
  ];

  if (vertical) {
    return (
      <div className="space-y-1">
        {layers.map(l => (
          <ToggleRow key={l.key} {...l} onToggle={() => toggle(l.key)} />
        ))}
      </div>
    );
  }

  // Original horizontal pill layout (used in old floating bottom bar)
  return (
    <div className="flex items-center gap-4">
      {layers.map(l => (
        <HorizontalToggle key={l.key} {...l} onToggle={() => toggle(l.key)} />
      ))}
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

/**
 * HorizontalToggle — compact pill for horizontal layout.
 */
const HorizontalToggle = ({ icon, label, color, active, onToggle }) => {
  const colorMap = {
    sky:   { active: 'bg-sky-100 text-sky-700 border-sky-200',   inactive: 'bg-white text-gray-500 border-gray-200' },
    rose:  { active: 'bg-rose-100 text-rose-700 border-rose-200', inactive: 'bg-white text-gray-500 border-gray-200' },
    amber: { active: 'bg-amber-100 text-amber-700 border-amber-200', inactive: 'bg-white text-gray-500 border-gray-200' },
  };
  const c = colorMap[color] || colorMap.sky;
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
        active ? c.active : c.inactive
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
};

export default LayerControls;
