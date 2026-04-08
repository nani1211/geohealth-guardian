import useAppStore from '../store/useAppStore';

/**
 * useUnits — reads unit preferences from the global Zustand store.
 *
 * All components share the same unit state, so toggling in one place
 * (e.g., UnitToggle in App.jsx) updates Sidebar, RoutePanel, Popup, etc.
 *
 * Returns:
 *  • units        — 'metric' | 'imperial'
 *  • tempUnit     — '°C' | '°F'
 *  • windUnit     — 'm/s' | 'mph'
 *  • isMetric     — boolean
 *  • toggleUnits  — function to flip between metric ↔ imperial
 */
const useUnits = () => {
  const units = useAppStore((s) => s.units);
  const toggleUnits = useAppStore((s) => s.toggleUnits);

  return {
    units,
    tempUnit: units === 'metric' ? '°C' : '°F',
    windUnit: units === 'metric' ? 'm/s' : 'mph',
    isMetric: units === 'metric',
    toggleUnits,
  };
};

export default useUnits;
