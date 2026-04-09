import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Map State
  mapCenter: [-98.5795, 39.8283], // default USA
  setMapCenter: (coords) => set({ mapCenter: coords }),
  
  mapZoom: 4,
  setMapZoom: (zoom) => set({ mapZoom: zoom }),

  // Modal State
  isShareModalOpen: false,
  setIsShareModalOpen: (isOpen) => set({ isShareModalOpen: isOpen }),

  // Unit preferences — shared across all components
  units: (() => {
    try {
      const v = localStorage.getItem('geohealth-units');
      return v === 'imperial' ? 'imperial' : 'metric';
    } catch { return 'metric'; }
  })(),
  toggleUnits: () =>
    set((state) => {
      const next = state.units === 'metric' ? 'imperial' : 'metric';
      try { localStorage.setItem('geohealth-units', next); } catch {}
      return { units: next };
    }),

  // Core Data State
  currentLocation: null,
  setCurrentLocation: (loc) => set({ currentLocation: loc }),

  locationData: null,
  setLocationData: (data) => set({ locationData: data }),

  weatherData: null,
  setWeatherData: (data) => set({ weatherData: data }),

  addressData: null,
  setAddressData: (data) => set({ addressData: data }),

  forecastData: null,
  setForecastData: (data) => set({ forecastData: data }),

  popupData: null,
  setPopupData: (dataOrFn) => set((state) => {
    const nextVal = typeof dataOrFn === 'function' ? dataOrFn(state.popupData) : dataOrFn;
    console.log('[STORE] setPopupData called. new:', nextVal);
    if (nextVal === null) {
      console.trace('[STORE] setPopupData set to NULL by:');
    }
    return { popupData: nextVal };
  }),

  placePopupData: null,
  setPlacePopupData: (data) => set({ placePopupData: data }),

  airQualityData: null,
  setAirQualityData: (data) => set({ airQualityData: data }),

  // Map Picking & Routing Mode
  mapPickingMode: null, // 'start' | 'end' | null
  setMapPickingMode: (mode) => set({ mapPickingMode: mode }),

  routeStart: '',
  setRouteStart: (addr) => set({ routeStart: addr }),

  routeEnd: '',
  setRouteEnd: (addr) => set({ routeEnd: addr }),

  nwsAlerts: [],
  setNwsAlerts: (data) => set({ nwsAlerts: data }),

  // Filters & Stays
  stopFilters: ['gas', 'food', 'rest', 'emergency', 'hospital', 'mechanic'],
  setStopFilters: (filters) => set({ stopFilters: filters }),

  nearbyPlaces: [],
  setNearbyPlaces: (data) => set({ nearbyPlaces: data }),

  // Route specific globally mapped state
  routeData: null,
  setRouteData: (data) => set({ routeData: data }),

  routeWeatherData: [],
  setRouteWeatherData: (data) => set({ routeWeatherData: data }),

  routeRiskLevel: null, // 'low' | 'medium' | 'high'
  setRouteRiskLevel: (level) => set({ routeRiskLevel: level }),

  routeLoading: false,
  setRouteLoading: (isLoading) => set({ routeLoading: isLoading }),

  routeError: null,
  setRouteError: (err) => set({ routeError: err }),

  routeAlerts: [],
  setRouteAlerts: (data) => set({ routeAlerts: data }),

  selectedRouteWaypointIndex: null,
  setSelectedRouteWaypointIndex: (idx) => set({ selectedRouteWaypointIndex: idx }),

  // Places Data
  placesData: [],
  setPlacesData: (data) => set({ placesData: data }),

  placesLoading: false,
  setPlacesLoading: (isLoading) => set({ placesLoading: isLoading }),

  placesEnabled: false,
  showSearchAreaButton: false,
  setShowSearchAreaButton: (show) => set({ showSearchAreaButton: show }),
  isSidebarOpen: true,
  setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setPlacesEnabled: (enabled) => {
    set({ placesEnabled: enabled });
    if (!enabled) {
      set({ placesData: [] }); // Clear if disabled
    }
  },

  // Layer Visibility Toggles
  activeLayers: {
    weather: true,
    nws: true,
    airQuality: false,
    disease: false,
    traffic: false,
  },
  toggleLayer: (layer) => set(state => ({
    activeLayers: {
      ...state.activeLayers,
      [layer]: !state.activeLayers[layer]
    }
  }))
}));

export default useAppStore;
