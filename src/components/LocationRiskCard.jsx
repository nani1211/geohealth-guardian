import React from 'react';
import {
  ThermometerSun,
  CloudRain,
  Droplets,
  Wind,
  Gauge,
  AlertTriangle,
  MapPin
} from 'lucide-react';

/**
 * Renders the active location's weather, air quality, and NWS alerts seamlessly.
 */
const LocationRiskCard = ({ weatherData, addressData, nwsAlerts, airQualityData, tempUnit, windUnit }) => {
  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Selected Location Address & Coords */}
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
          📍 {weatherData?.lat?.toFixed(4)}, {weatherData?.lon?.toFixed(4)}
        </p>
      </div>

      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Current Conditions
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Temperature */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100 text-center">
          <ThermometerSun className="mx-auto text-orange-500 mb-2" size={24} />
          <p className="text-2xl font-extrabold text-orange-600">{weatherData.temp}{tempUnit || '°C'}</p>
          <p className="text-[10px] text-orange-400 mt-1 uppercase tracking-wider">Temp</p>
        </div>

        {/* Condition */}
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-4 rounded-xl border border-sky-100 flex flex-col items-center justify-center text-center">
          <CloudRain className="text-sky-500 mb-2" size={24} />
          <p className="text-sm font-bold text-gray-900 capitalize leading-tight">
            {weatherData.description || weatherData.condition}
          </p>
          <p className="text-[10px] text-sky-600 uppercase tracking-wider mt-1">Condition</p>
        </div>
      </div>

      {/* Humidity + Wind */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-teal-50 p-3 rounded-xl border border-teal-100 flex items-center justify-center gap-3">
          <Droplets className="text-teal-500" size={18} />
          <div>
            <p className="text-sm font-bold text-teal-800">{weatherData.humidity}%</p>
            <p className="text-[9px] text-teal-600 uppercase tracking-wider">Humidity</p>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-center gap-3">
          <Wind className="text-slate-500" size={18} />
          <div>
            <p className="text-sm font-bold text-slate-700">{weatherData.windSpeed}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{windUnit || 'm/s'} Wind</p>
          </div>
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
              <p className={`text-xl font-extrabold ${
                airQualityData.aqi >= 4 ? 'text-red-600' :
                airQualityData.aqi >= 3 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {airQualityData.aqiName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-700">PM2.5: {airQualityData.pm25.toFixed(1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── NWS Active Alerts ─────────────────────── */}
      {nwsAlerts && nwsAlerts.length > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 mt-2">
          <div className="flex items-center gap-1.5 mb-3">
            <AlertTriangle size={14} className="text-red-500" />
            <p className="text-[10px] text-red-700 uppercase tracking-wider font-bold">Active Alerts ({nwsAlerts.length})</p>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {nwsAlerts.map((alert, i) => (
              <div key={alert.id || i} className="bg-white/90 p-3 rounded-lg border border-red-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">{alert.icon}</span>
                  <p className="text-xs font-bold text-red-800 leading-tight">{alert.event}</p>
                </div>
                <p className="text-[10px] text-gray-700 mt-1.5 leading-snug">{alert.headline}</p>
                {alert.instruction && (
                  <p className="text-[9px] text-red-600 mt-2 font-semibold">⚡ {alert.instruction.slice(0, 100)}…</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationRiskCard;
