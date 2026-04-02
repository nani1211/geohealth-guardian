import React from 'react';
import { X, ThermometerSun, Droplets, CloudRain } from 'lucide-react';

/**
 * WeatherPopup — a custom floating popup that renders over the map.
 * Positioned via absolute CSS based on screen coordinates passed as props.
 * Automatically flips below the click point if too close to the top edge.
 */
const WeatherPopup = ({ weather, address, screenPoint, tempUnit, windUnit, onClose }) => {
  if (!weather || !screenPoint) return null;

  // Popup height is roughly 320px. If click point is too close to top,
  // render the popup *below* the click point instead of above.
  const popupHeight = 340;
  const showBelow = screenPoint.y < popupHeight;

  const style = showBelow
    ? {
        left: `${screenPoint.x}px`,
        top: `${screenPoint.y + 20}px`,
        transform: 'translateX(-50%)',
      }
    : {
        left: `${screenPoint.x}px`,
        top: `${screenPoint.y - 12}px`,
        transform: 'translate(-50%, -100%)',
      };

  return (
    <div className="absolute z-50 pointer-events-auto" style={style}>
      {/* Arrow above (when popup is below click point) */}
      {showBelow && (
        <div className="flex justify-center mb-[-1px]">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-600 to-indigo-600 transform rotate-45 translate-y-1.5"></div>
        </div>
      )}

      {/* Popup card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm truncate pr-2">
            🌤️ {address?.city && address?.region
              ? `${address.city}, ${address.region}`
              : weather.name || 'Weather Conditions'}
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Temperature */}
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <ThermometerSun className="mx-auto text-orange-500 mb-1" size={20} />
              <p className="text-[10px] uppercase tracking-wider text-orange-700">Temp</p>
              <p className="text-xl font-bold text-orange-600">{weather.temp}{tempUnit || '°C'}</p>
            </div>

            {/* Humidity */}
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Droplets className="mx-auto text-blue-500 mb-1" size={20} />
              <p className="text-[10px] uppercase tracking-wider text-blue-700">Humidity</p>
              <p className="text-xl font-bold text-blue-600">{weather.humidity}%</p>
            </div>
          </div>

          {/* Condition */}
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <CloudRain className="mx-auto text-green-600 mb-1" size={18} />
            <p className="text-[10px] uppercase tracking-wider text-green-700">Condition</p>
            <p className="text-base font-semibold text-green-700 capitalize">
              {weather.description || weather.condition}
            </p>
          </div>

          {/* Address + Coordinates */}
          <div className="border-t border-gray-100 pt-2 text-center">
            {address?.formatted && (
              <p className="text-[11px] text-gray-600 font-medium leading-snug mb-0.5">
                {address.formatted}
              </p>
            )}
            <p className="text-[10px] text-gray-400">
              📍 {weather.lat?.toFixed(4)}, {weather.lon?.toFixed(4)}
            </p>
          </div>
        </div>
      </div>

      {/* Arrow below (when popup is above click point) */}
      {!showBelow && (
        <div className="flex justify-center -mt-px">
          <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45 -translate-y-1.5"></div>
        </div>
      )}
    </div>
  );
};

export default WeatherPopup;
