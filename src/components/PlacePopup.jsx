import React from 'react';
import { X, Navigation, Star, Phone, Clock, MapPin } from 'lucide-react';

/**
 * PlacePopup — Google/Apple Maps-style place card.
 * Desktop: floating card anchored to screen click point.
 * Mobile: rendered as a card sitting above the bottom sheet.
 */
const PlacePopup = ({ place, screenPoint, onClose }) => {
  if (!place) return null;

  const typeToIcon = { gas: '⛽', food: '🍔', rest: '🛑', emergency: '🚨', hospital: '🏥', mechanic: '🔧' };
  const typeToGradient = {
    gas: 'from-amber-500 to-orange-500',
    food: 'from-emerald-500 to-teal-500',
    rest: 'from-blue-500 to-indigo-500',
    emergency: 'from-red-500 to-rose-600',
    hospital: 'from-red-500 to-rose-600',
    mechanic: 'from-slate-500 to-slate-600',
  };

  const icon = typeToIcon[place.type] || '📍';
  const gradient = typeToGradient[place.type] || 'from-gray-500 to-gray-600';

  const handleNavigate = () => {
    const dest = encodeURIComponent(place.address || place.name || `${place.lat},${place.lon}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
  };

  const cardBody = (
    <div className="p-4 space-y-3">
      {(place.rating || place.priceLevel) && (
        <div className="flex items-center gap-4 text-sm">
          {place.rating && (
            <div className="flex items-center text-amber-500 font-medium">
              <Star size={14} className="fill-current mr-1" />
              {place.rating} <span className="text-gray-400 font-normal ml-1 text-xs">({place.reviewCount})</span>
            </div>
          )}
          {place.priceLevel && (
            <span className="text-emerald-600 font-semibold tracking-wider font-mono bg-emerald-50 px-1.5 py-0.5 rounded">{place.priceLevel}</span>
          )}
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-gray-50">
        {place.openNow !== null && place.openNow !== undefined && (
          <div className="flex items-center gap-2.5 text-sm">
            <Clock size={14} className={place.openNow ? 'text-emerald-500' : 'text-red-500'} />
            <span className={`font-medium ${place.openNow ? 'text-emerald-600' : 'text-red-600'}`}>
              {place.openNow ? 'Currently Open' : 'Currently Closed'}
            </span>
          </div>
        )}
        {place.phone && (
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <Phone size={14} className="text-indigo-400" />
            <a href={`tel:${place.phone}`} className="hover:text-indigo-600 transition-colors uppercase tracking-wide text-[11px] font-semibold">{place.phone}</a>
          </div>
        )}
        {place.address && (
          <div className="flex items-start gap-2.5 text-sm text-gray-500 mt-1">
            <MapPin size={14} className="text-gray-400 shrink-0 mt-[2px]" />
            <span className="leading-snug text-xs font-medium text-gray-600">{place.address}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleNavigate}
        className="w-full mt-2 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-100/50 text-indigo-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
      >
        <Navigation size={16} className="text-indigo-500" />
        Navigate
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop: anchored to click point */}
      {screenPoint && (
        <DesktopAnchor screenPoint={screenPoint} gradient={gradient}>
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 overflow-hidden">
            <PopupHeader icon={icon} title={place.name} gradient={gradient} onClose={onClose} />
            {cardBody}
          </div>
        </DesktopAnchor>
      )}

      {/* Mobile: bottom card */}
      <MobileCard gradient={gradient} icon={icon} title={place.name} onClose={onClose}>
        {cardBody}
      </MobileCard>
    </>
  );
};

// ─── Shared sub-components ─────────────────────────────────────────────────

const DesktopAnchor = ({ screenPoint, gradient, children }) => {
  const showBelow = screenPoint.y < 280;
  const style = showBelow
    ? { left: `${screenPoint.x}px`, top: `${screenPoint.y + 20}px`, transform: 'translateX(-50%)' }
    : { left: `${screenPoint.x}px`, top: `${screenPoint.y - 12}px`, transform: 'translate(-50%, -100%)' };

  return (
    <div className="hidden md:block absolute z-50 pointer-events-auto" style={style}>
      {showBelow && (
        <div className="flex justify-center mb-[-1px]">
          <div className={`w-3 h-3 bg-gradient-to-r ${gradient} transform rotate-45 translate-y-1.5`} />
        </div>
      )}
      {children}
      {!showBelow && (
        <div className="flex justify-center -mt-px">
          <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45 -translate-y-1.5" />
        </div>
      )}
    </div>
  );
};

const MobileCard = ({ gradient, icon, title, onClose, children }) => (
  <div
    className="md:hidden absolute left-0 right-0 z-30 pointer-events-auto"
    style={{ bottom: '46vh' }}
  >
    <div className="mx-3">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
        <PopupHeader icon={icon} title={title} gradient={gradient} onClose={onClose} />
        {children}
      </div>
    </div>
  </div>
);

const PopupHeader = ({ icon, title, gradient, onClose }) => (
  <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between shadow-sm`}>
    <div className="flex items-center gap-2 overflow-hidden">
      <span className="text-xl leading-none drop-shadow-sm">{icon}</span>
      <h3 className="text-white font-bold text-[15px] truncate drop-shadow-sm">{title}</h3>
    </div>
    <button
      onClick={onClose}
      className="text-white/80 hover:text-white transition-colors cursor-pointer ml-2 shrink-0 bg-black/10 hover:bg-black/20 rounded-full p-1"
    >
      <X size={16} />
    </button>
  </div>
);

export default PlacePopup;
