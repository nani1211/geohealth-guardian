import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Wind, Construction } from 'lucide-react';

/**
 * RouteAlerts — Stacked, multi-type floating notification banners.
 *
 * Alert types by priority:
 * 1. 🔴 Dangerous Weather (score >= 3)
 * 2. 🟠 Adverse Weather (score = 2)
 * 3. 🟣 Poor Air Quality (AQI >= 4)
 * 4. 🟤 Unpaved Road
 * 5. 🍽️ Meal Recommendation (informational)
 */
const RouteAlerts = ({ routeData, tempUnit, preferences, nwsAlerts, onAlertClick }) => {
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Reset dismissed state when a new route is calculated
  useEffect(() => {
    setDismissedIds(new Set());
  }, [routeData]);

  if (!routeData && (!nwsAlerts || nwsAlerts.length === 0)) return null;

  // Build array of all alerts
  const alerts = [];

  // ── NWS Government Alerts (highest priority) ──────────────────
  if (nwsAlerts && nwsAlerts.length > 0) {
    nwsAlerts.forEach((nws, idx) => {
      const isExtreme = nws.severity?.score >= 3;
      alerts.push({
        id: `nws_${nws.id || idx}`,
        priority: isExtreme ? -2 : -1,
        icon: <span className="text-lg">{nws.icon}</span>,
        title: nws.event,
        message: nws.headline,
        extra: nws.instruction ? `⚡ ${nws.instruction.slice(0, 100)}…` : nws.areaDesc,
        style: isExtreme
          ? { bg: 'bg-red-100/95', border: 'border-red-400', text: 'text-red-900', icon: 'text-red-600' }
          : { bg: 'bg-red-50/95', border: 'border-red-300', text: 'text-red-800', icon: 'text-red-500' },
      });
    });
  }

  if (!routeData) {
    // Only NWS alerts, no route
    const activeAlerts = alerts.filter((a) => !dismissedIds.has(a.id));
    if (activeAlerts.length === 0) return null;
    // render below
  }

  // ── Weather alerts ──────────────────────────────────────────────
  const hazardousPoints = routeData?.routeWeatherPoints?.filter(
    (pt) => pt.severity && pt.severity.score >= 2
  ) || [];

  if (hazardousPoints.length > 0) {
    const worstWeather = [...hazardousPoints].sort((a, b) => b.severity.score - a.severity.score)[0];
    const isDangerous = worstWeather.severity.score >= 3;
    alerts.push({
      id: 'weather',
      priority: isDangerous ? 0 : 1,
      icon: <AlertTriangle size={20} />,
      title: isDangerous ? 'Dangerous Weather Alert' : 'Adverse Weather Advisory',
      message: `Expect ${worstWeather.weather?.description} (${worstWeather.weather?.temp}${tempUnit}) near Mile ${worstWeather.mileMarker}`,
      extra: hazardousPoints.length > 1 ? `+ ${hazardousPoints.length - 1} other segment(s)` : null,
      style: isDangerous
        ? { bg: 'bg-red-50/95', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' }
        : { bg: 'bg-orange-50/95', border: 'border-orange-200', text: 'text-orange-800', icon: 'text-orange-500' },
    });
  }

  // ── Air Quality alerts ──────────────────────────────────────────
  if (preferences?.showAirQuality !== false) {
    const poorAqiPoints = routeData?.routeWeatherPoints?.filter(
      (pt) => pt.airQuality && pt.airQuality.aqi >= 4
    ) || [];

    if (poorAqiPoints.length > 0) {
      const worstAqi = [...poorAqiPoints].sort((a, b) => b.airQuality.aqi - a.airQuality.aqi)[0];
      alerts.push({
        id: 'aqi',
        priority: 2,
        icon: <Wind size={20} />,
        title: `${worstAqi.airQuality.label} Air Quality`,
        message: `PM2.5: ${worstAqi.airQuality.pm25}μg/m³ near Mile ${worstAqi.mileMarker}`,
        extra: poorAqiPoints.length > 1 ? `+ ${poorAqiPoints.length - 1} other segment(s)` : null,
        style: { bg: 'bg-purple-50/95', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-500' },
      });
    }
  }

  // ── Dirt Road alerts ────────────────────────────────────────────
  if (preferences?.avoidDirtRoads !== false && routeData?.dirtRoadSegments?.length > 0) {
    const seg = routeData.dirtRoadSegments[0];
    alerts.push({
      id: 'dirtroad',
      priority: 3,
      icon: <Construction size={20} />,
      title: 'Unpaved Road Detected',
      message: `~${seg.miles} mi of ${seg.surfaceType} near Mile ${seg.mileMarker}`,
      extra: seg.detourExtraMiles ? `Paved alternative adds ~${seg.detourExtraMiles} extra miles` : null,
      style: { bg: 'bg-amber-50/95', border: 'border-amber-300', text: 'text-amber-900', icon: 'text-amber-600' },
    });
  }

  // ── Meal Recommendations ────────────────────────────────────────
  if (routeData?.mealRecommendations?.length > 0) {
    const topRec = routeData.mealRecommendations[0];
    alerts.push({
      id: 'meal',
      priority: 4,
      icon: <span className="text-lg">🍽️</span>,
      title: topRec.mealType ? `${topRec.mealType.charAt(0).toUpperCase() + topRec.mealType.slice(1)} Stop` : 'Food Recommendation',
      message: topRec.suggestion,
      extra: `${topRec.stop.name} — arriving ~${topRec.estimatedArrival}`,
      style: { bg: 'bg-teal-50/95', border: 'border-teal-200', text: 'text-teal-800', icon: 'text-teal-500' },
      place: topRec.stop,
    });
  }

  // Sort by priority and filter dismissed
  const activeAlerts = alerts
    .sort((a, b) => a.priority - b.priority)
    .filter((a) => !dismissedIds.has(a.id));

  if (activeAlerts.length === 0) return null;

  const dismiss = (id) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] md:w-auto md:min-w-[380px] max-w-lg space-y-2">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          onClick={() => onAlertClick && onAlertClick(alert)}
          className={`relative ${alert.style.bg} ${alert.style.border} ${alert.style.text} border rounded-2xl p-3.5 pr-10 shadow-xl backdrop-blur-md transition-all duration-300 ${onAlertClick && alert.place ? 'cursor-pointer hover:shadow-2xl hover:scale-[1.02]' : ''}`}
          style={{ animation: 'slideDown 0.4s ease-out' }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              dismiss(alert.id);
            }}
            className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer z-10"
            aria-label={`Dismiss ${alert.title}`}
          >
            <X size={14} className="opacity-50 hover:opacity-100" />
          </button>

          <div className="flex gap-2.5 items-start">
            <div className={`mt-0.5 flex-shrink-0 ${alert.style.icon} ${alert.priority <= 1 ? 'animate-pulse' : ''}`}>
              {alert.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[11px] tracking-tight uppercase mb-0.5">{alert.title}</h3>
              <p className="text-xs leading-snug opacity-90">{alert.message}</p>
              {alert.extra && (
                <p className="text-[10px] mt-1 opacity-65 font-semibold">{alert.extra}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Slide-down animation */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RouteAlerts;
