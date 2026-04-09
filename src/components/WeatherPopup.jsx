import React from 'react';
import {
  X, ThermometerSun, Droplets, Wind, CloudRain,
  Navigation2, MapPin, Heart, Eye
} from 'lucide-react';

/**
 * WeatherPopup — Google/Apple Maps-style popup.
 * Desktop: floating card anchored to screen click point.
 * Mobile: always rendered as a centered bottom card (ignores screenPoint position).
 */

function getWeatherEmoji(desc = '') {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('drizzle') || d.includes('light rain')) return '🌦️';
  if (d.includes('rain')) return '🌧️';
  if (d.includes('snow') || d.includes('blizzard')) return '❄️';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  if (d.includes('overcast') || d.includes('broken clouds')) return '☁️';
  if (d.includes('few clouds') || d.includes('scattered')) return '⛅';
  if (d.includes('clear') || d.includes('sunny')) return '☀️';
  return '🌤️';
}

function getHealthAdvisory(temp, desc = '', humidity) {
  const d = desc.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return { text: 'Thunderstorm risk — avoid open areas', color: 'red' };
  if (d.includes('snow') || d.includes('blizzard')) return { text: 'Icy conditions — dress in layers', color: 'blue' };
  if (d.includes('rain') || d.includes('drizzle')) return { text: 'Rain expected — carry an umbrella', color: 'blue' };
  if (temp > 35) return { text: 'Heat advisory — stay hydrated', color: 'red' };
  if (temp > 28) return { text: 'Warm day — use sunscreen', color: 'orange' };
  if (temp < 0) return { text: 'Freezing temps — bundle up!', color: 'blue' };
  if (temp < 10) return { text: 'Cold — wear a coat outdoors', color: 'indigo' };
  if (humidity > 85) return { text: 'High humidity — feels muggy', color: 'teal' };
  return { text: 'Conditions look good for outdoor activity', color: 'green' };
}

const advisoryColors = {
  red:    'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
  green:  'bg-green-50 text-green-700 border-green-200',
};

const WeatherPopup = ({ weather, address, screenPoint, tempUnit, windUnit, onClose, loading, lat, lon }) => {
  if (!screenPoint) return null;

  // ── Loading state ──
  if (!weather && loading) {
    return (
      <>
        {/* Desktop anchor */}
        <DesktopAnchor screenPoint={screenPoint} headerColor="from-blue-600 to-indigo-600">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-5 py-4 flex items-center gap-3 w-64">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600 font-medium">Fetching weather…</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-auto"><X size={14} /></button>
          </div>
        </DesktopAnchor>
        {/* Mobile card */}
        <MobileCard onClose={onClose} headerGradient="from-blue-600 to-indigo-600" title="Fetching weather…" emoji="🌤️">
          <div className="flex items-center justify-center py-6 gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Loading…</span>
          </div>
        </MobileCard>
      </>
    );
  }

  const hasWeather = !!weather;
  const displayLat = lat ?? weather?.lat;
  const displayLon = lon ?? weather?.lon;

  const emoji = hasWeather ? getWeatherEmoji(weather.description || weather.condition) : '📍';
  const advisory = hasWeather
    ? getHealthAdvisory(weather.temp, weather.description || weather.condition, weather.humidity)
    : null;
  const advisoryClass = advisory ? (advisoryColors[advisory.color] || advisoryColors.green) : '';

  const locationLabel = address?.city && address?.region
    ? `${address.city}, ${address.region}`
    : (hasWeather ? (weather.name || 'Selected Location') : 'Selected Location');

  const navigateToGoogle = () => {
    const dest = encodeURIComponent(address?.formatted || `${displayLat},${displayLon}`);
    window.open(`https://www.google.com/maps?q=${dest}`, '_blank');
  };

  const unitLabel = tempUnit || '°C';
  const windLabel = windUnit || 'm/s';

  const cardBody = (
    <div className="p-4 pb-3 space-y-3">
      {hasWeather ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <ThermometerSun className="mx-auto text-orange-500 mb-1" size={18} />
              <p className="text-lg font-bold text-orange-600 leading-tight">
                {typeof weather.temp === 'number' ? weather.temp.toFixed(1) : weather.temp}
                <span className="text-sm font-semibold">{unitLabel}</span>
              </p>
              <p className="text-[9px] text-orange-400 uppercase tracking-wider mt-0.5">Temp</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Droplets className="mx-auto text-blue-500 mb-1" size={18} />
              <p className="text-lg font-bold text-blue-600 leading-tight">
                {weather.humidity}<span className="text-sm">%</span>
              </p>
              <p className="text-[9px] text-blue-400 uppercase tracking-wider mt-0.5">Humidity</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <Wind className="mx-auto text-teal-500 mb-1" size={18} />
              <p className="text-lg font-bold text-teal-600 leading-tight">
                {typeof weather.windSpeed === 'number' ? weather.windSpeed.toFixed(1) : (weather.windSpeed ?? '–')}
              </p>
              <p className="text-[9px] text-teal-400 uppercase tracking-wider mt-0.5">{windLabel}</p>
            </div>
          </div>

          {advisory && (
            <div className={`rounded-xl px-3 py-2 border flex items-start gap-2 ${advisoryClass}`}>
              <Heart size={13} className="mt-0.5 flex-shrink-0" />
              <p className="text-[11px] leading-snug font-medium">{advisory.text}</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <CloudRain className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-500 font-medium">Weather data unavailable</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Check your API key or try again</p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-2">
        {address?.formatted && (
          <p className="text-[11px] text-gray-600 font-medium leading-snug mb-1 flex items-start gap-1">
            <MapPin size={11} className="mt-0.5 flex-shrink-0 text-gray-400" />
            {address.formatted}
          </p>
        )}
        <p className="text-[10px] text-gray-400 mb-2">
          📍 {displayLat?.toFixed(5)}, {displayLon?.toFixed(5)}
        </p>
        <button
          onClick={navigateToGoogle}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Navigation2 size={12} />
          Navigate Here
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: anchored to click point */}
      <DesktopAnchor screenPoint={screenPoint} showBelow={screenPoint.y < 400}>
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
          <PopupHeader emoji={emoji} title={locationLabel} subtitle={weather?.description || weather?.condition} onClose={onClose} gradient="from-blue-600 to-indigo-600" />
          {cardBody}
        </div>
      </DesktopAnchor>

      {/* Mobile: bottom card */}
      <MobileCard onClose={onClose} headerGradient="from-blue-600 to-indigo-600" title={locationLabel} emoji={emoji} subtitle={weather?.description || weather?.condition}>
        {cardBody}
      </MobileCard>
    </>
  );
};

// ─── Shared sub-components ─────────────────────────────────────────────────

/**
 * Renders children anchored to a screen point — only visible on md+ screens.
 */
const DesktopAnchor = ({ screenPoint, showBelow, children }) => {
  const below = showBelow ?? (screenPoint?.y < 400);
  const style = below
    ? { left: `${screenPoint.x}px`, top: `${screenPoint.y + 20}px`, transform: 'translateX(-50%)' }
    : { left: `${screenPoint.x}px`, top: `${screenPoint.y - 12}px`, transform: 'translate(-50%, -100%)' };

  return (
    <div className="hidden md:block absolute pointer-events-auto" style={{ zIndex: 9999, ...style }}>
      {below && (
        <div className="flex justify-center mb-[-1px]">
          <div className="w-3 h-3 bg-gradient-to-br from-blue-600 to-indigo-600" style={{ transform: 'rotate(45deg) translateY(6px)' }} />
        </div>
      )}
      {children}
      {!below && (
        <div className="flex justify-center -mt-px">
          <div className="w-3 h-3 bg-white border-r border-b border-gray-200" style={{ transform: 'rotate(45deg) translateY(-6px)' }} />
        </div>
      )}
    </div>
  );
};

/**
 * Mobile-only bottom card — slides up from above the bottom sheet.
 */
const MobileCard = ({ onClose, headerGradient, title, subtitle, emoji, children }) => (
  <div className="md:hidden absolute left-0 right-0 z-30 pointer-events-auto"
    style={{ bottom: '46vh' }} /* sits just above the peeked sheet */
  >
    <div className="mx-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
        <PopupHeader emoji={emoji} title={title} subtitle={subtitle} onClose={onClose} gradient={headerGradient || 'from-blue-600 to-indigo-600'} />
        {children}
      </div>
    </div>
  </div>
);

const PopupHeader = ({ emoji, title, subtitle, onClose, gradient }) => (
  <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between`}>
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xl">{emoji}</span>
      <div className="min-w-0">
        <h3 className="text-white font-semibold text-sm truncate leading-tight">{title}</h3>
        {subtitle && (
          <p className="text-white/70 text-[10px] capitalize truncate">{subtitle}</p>
        )}
      </div>
    </div>
    <button
      onClick={onClose}
      className="text-white/70 hover:text-white transition-colors cursor-pointer ml-2 flex-shrink-0"
    >
      <X size={16} />
    </button>
  </div>
);

export default WeatherPopup;
