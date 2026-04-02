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
  setPopupData: (data) => set({ popupData: data }),

  placePopupData: null,
  setPlacePopupData: (data) => set({ placePopupData: data }),

  airQualityData: null,
  setAirQualityData: (data) => set({ airQualityData: data }),

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

  // Places Data
  placesData: [],
  setPlacesData: (data) => set({ placesData: data }),

  placesEnabled: false,
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
    disease: false
  },
  toggleLayer: (layer) => set(state => ({
    activeLayers: {
      ...state.activeLayers,
      [layer]: !state.activeLayers[layer]
    }
  }))
}));

export default useAppStore;
