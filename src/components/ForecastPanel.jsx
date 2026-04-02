import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

/**
 * ForecastPanel — horizontal scroll view of daily forecast cards
 * with Today / 7 Days / 14 Days toggle tabs.
 *
 * Props:
 *  • forecast — array of { dayLabel, dateLabel, high, low, condition, icon, humidity }
 */
const RANGES = [
  { key: 'today', label: 'Today',   count: 1 },
  { key: '7d',    label: '7 Days',  count: 7 },
  { key: '14d',   label: '14 Days', count: 14 },
];

const ForecastPanel = ({ forecast }) => {
  const [range, setRange] = useState('7d');

  if (!forecast || forecast.length === 0) return null;

  const activeRange = RANGES.find((r) => r.key === range);
  const visibleDays = forecast.slice(0, activeRange.count);

  return (
    <div className="space-y-3">
      {/* Header + range tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-indigo-600" />
          <h3 className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Forecast
          </h3>
        </div>

        {/* Tab pills */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`
                px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer
                ${range === r.key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {visibleDays.map((day, i) => (
            <div
              key={day.date}
              className={`
                flex-shrink-0 w-[72px] rounded-xl border p-2.5 text-center transition-all
                ${i === 0
                  ? 'bg-gradient-to-b from-indigo-50 to-blue-50 border-indigo-200'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
              `}
            >
              {/* Day label */}
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                i === 0 ? 'text-indigo-600' : 'text-gray-500'
              }`}>
                {i === 0 ? 'Today' : day.dayLabel}
              </p>

              {/* Date */}
              <p className="text-[9px] text-gray-400 mt-0.5">{day.dateLabel}</p>

              {/* Weather icon */}
              <p className="text-2xl my-1.5 leading-none">{day.icon}</p>

              {/* High / Low */}
              <p className="text-sm font-bold text-gray-900">{day.high}°</p>
              <p className="text-[11px] text-gray-400">{day.low}°</p>

              {/* Condition */}
              <p className="text-[8px] text-gray-500 mt-1 leading-tight capitalize truncate">
                {day.condition}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ForecastPanel;
