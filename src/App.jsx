import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Graphic from '@arcgis/core/Graphic';
import Polyline from '@arcgis/core/geometry/Polyline';
import Point from '@arcgis/core/geometry/Point';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';
import MapView from './components/MapView';
import FloatingInterface from './components/FloatingInterface';
import config from '@arcgis/core/config';
import { Loader2 } from 'lucide-react';

// Configure ArcGIS API key for routing and premium services
config.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

import WeatherPopup from './components/WeatherPopup';
import PlacePopup from './components/PlacePopup';
import ShareETAModal from './components/ShareETAModal';
import UnitToggle from './components/UnitToggle';
import PreferencesPanel from './components/PreferencesPanel';
import useDiseaseLayer from './hooks/useDiseaseLayer';
import useUnits from './hooks/useUnits';
import useRouteWeather from './hooks/useRouteWeather';
import useGeolocation from './hooks/useGeolocation';
import usePreferences from './hooks/usePreferences';
import { fetchWeatherData } from './services/weatherService';
import { reverseGeocode } from './services/geocodeService';
import { fetchForecast } from './services/forecastService';
import { fetchDiseaseData } from './services/whoApiService';
import { fetchNearbyPlaces } from './services/placesService';
import { fetchAirQuality } from './services/airQualityService';
import { fetchNWSAlerts } from './services/nwsAlertService';
import useAppStore from './store/useAppStore';
import RouteAlerts from './components/RouteAlerts';

function App() {
  const {
    locationData, setLocationData,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom,
    placesData, setPlacesData,
    placesEnabled, setPlacesEnabled,
    activeLayers: globalActiveLayers, toggleLayer,
    weatherData, setWeatherData,
    addressData, setAddressData,
    forecastData, setForecastData,
    popupData, setPopupData,
    placePopupData, setPlacePopupData,
    airQualityData, setAirQualityData,
    nwsAlerts, setNwsAlerts,
    stopFilters, setStopFilters,
    nearbyPlaces, setNearbyPlaces,
    routeData, setRouteData,
    routeLoading, setRouteLoading,
    routeError, setRouteError,
    currentLocation, setCurrentLocation,
    isShareModalOpen, setIsShareModalOpen,
  } = useAppStore();

  const locationDataRef = useRef(locationData);
  useEffect(() => {
    locationDataRef.current = locationData;
  }, [locationData]);



  // User preferences
  const {
    preferences,
    updatePreference,
    addFavoriteFood,
    removeFavoriteFood,
    updateMealWindow,
    searchRadiusMeters,
  } = usePreferences();

  // Unit preferences
  const { units, tempUnit, windUnit, isMetric, toggleUnits } = useUnits();

  // Layer toggles mapped from Zustand
  const weatherLayerOn = globalActiveLayers.weather;
  const diseaseLayerOn = globalActiveLayers.disease;
  const trafficLayerOn = globalActiveLayers.traffic;
  
  const diseaseLayer = useDiseaseLayer();
  
  const trafficLayer = useMemo(() => {
    return new MapImageLayer({
      url: "https://traffic.arcgis.com/arcgis/rest/services/World/Traffic/MapServer",
      id: 'traffic-layer',
    });
  }, []);

  // NWS Watch/Warning/Advisory polygons (free, no API key)
  const nwsLayer = useMemo(() => {
    const popupTemplate = {
      title: "⚠️ {prod_type}",
      expressionInfos: [
        {
          name: "issued-local",
          title: "Issued",
          expression: "Text(Date($feature.issuance), 'MMM D, YYYY h:mm A')"
        },
        {
          name: "expiration-local",
          title: "Expiration",
          expression: "Text(Date($feature.expiration), 'MMM D, YYYY h:mm A')"
        }
      ],
      content: `
        <div style="font-family: inherit; padding: 4px 0;">
          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
            <div style="background: #fee2e2; padding: 10px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #991b1b; margin-bottom: 4px; font-weight: 600;">Alert Active Until</div>
              <div style="font-weight: 700; color: #7f1d1d; font-size: 14px;">{expression/expiration-local}</div>
            </div>
            
            <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; border-left: 4px solid #64748b;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin-bottom: 4px; font-weight: 600;">Issued At</div>
              <div style="font-weight: 500; color: #334155; font-size: 13px;">{expression/issued-local}</div>
            </div>
          </div>
          
          <a href="{url}" target="_blank" rel="noopener noreferrer" 
             style="display: block; text-align: center; background: #3b82f6; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);">
             Read Full Advisory Details ↗
          </a>
        </div>
      `
    };

    return new MapImageLayer({
      url: "https://mapservices.weather.noaa.gov/eventdriven/rest/services/WWA/watch_warn_adv/MapServer",
      id: 'nws-warnings-layer',
      opacity: 0.55,
      sublayers: [
        { id: 0, popupTemplate },
        { id: 1, popupTemplate }
      ]
    });
  }, []);

  // Route weather
  const { calculateRoute, clearRoute } = useRouteWeather();
  const routeDataRef = useRef(routeData);
  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);

  // Handle unit changes
  useEffect(() => {
    const loc = locationDataRef.current;
    if (loc && loc.lat && loc.lon) {
      Promise.all([
        fetchWeatherData(loc.lat, loc.lon, units).catch(() => null),
        fetchForecast(loc.lat, loc.lon, units).catch(() => []),
      ]).then(([weather, forecast]) => {
        if (forecast) setForecastData(forecast);
        if (weather) {
          setWeatherData(weather);
          const existing = useAppStore.getState().popupData;
          if (existing) setPopupData({ ...existing, weather });
        }
      });
    }

    const currentRoute = routeDataRef.current;
    if (currentRoute?.summary) {
      calculateRoute(
        currentRoute.summary.startLabel,
        currentRoute.summary.endLabel,
        units,
        currentRoute.summary.travelMode,
        preferences
      );
    }
  }, [units, calculateRoute]);

  // Geolocation
  const { location, loading: geoLoading, refresh: refreshGeo } = useGeolocation();

  // Handle location from GPS (auto-fetch)
  React.useEffect(() => {
    if (location) {
      setMapCenter([location.lon, location.lat]);
      setMapZoom(14);
      setLocationData({ lat: location.lat, lon: location.lon });
      const currentUnits = units;

      // Optional: Only clear things that definitively need to change.
      // We do NOT clear popupData here anymore to avoid snuffing out open popups on GPS refresh.
      // Also leaving weatherData / addressData intact until the new fetch arrives to avoid flicker.
      setNwsAlerts([]);

      // Fetch all for current location (including AQI + NWS alerts)
      Promise.all([
        fetchWeatherData(location.lat, location.lon, currentUnits).catch(() => null),
        reverseGeocode(location.lat, location.lon),
        fetchForecast(location.lat, location.lon, currentUnits).catch(() => []),
        placesEnabled ? fetchNearbyPlaces(location.lat, location.lon, searchRadiusMeters).catch(() => []) : Promise.resolve([]),
        preferences.showAirQuality ? fetchAirQuality(location.lat, location.lon).catch(() => null) : Promise.resolve(null),
        fetchNWSAlerts(location.lat, location.lon).catch(() => []),
      ]).then(([weather, address, forecast, places, aqi, alerts]) => {
        if (address) {
          setAddressData(address);
          setCurrentLocation({
            lat: location.lat,
            lon: location.lon,
            address: address.formatted,
          });
        }
        if (forecast) setForecastData(forecast);
        if (places && placesEnabled) setPlacesData(places);
        if (aqi) setAirQualityData(aqi);
        if (alerts) setNwsAlerts(alerts);
        if (weather) {
          setWeatherData(weather);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, placesEnabled, searchRadiusMeters]);

  const activeLayers = useMemo(() => {
    const layers = [];
    if (diseaseLayerOn) layers.push(diseaseLayer);
    if (trafficLayerOn) layers.push(trafficLayer);
    if (weatherLayerOn) layers.push(nwsLayer);
    return layers;
  }, [diseaseLayerOn, diseaseLayer, trafficLayerOn, trafficLayer, weatherLayerOn, nwsLayer]);

  // ── Build ArcGIS graphics from route data (or selected location) ──
  const routeGraphics = useMemo(() => {
    const graphics = [];

    if (!routeData) {
      // If we aren't routing but we have a selected location, show a blue pin
      if (locationData) {
        graphics.push(
          new Graphic({
            geometry: new Point({ longitude: locationData.lon, latitude: locationData.lat }),
            symbol: {
              type: 'simple-marker',
              color: [59, 130, 246, 0.9],
              size: '14px',
              outline: { color: [255, 255, 255], width: 2 },
            },
          }),
        );
      }
      return graphics;
    }

    const { paths, routeWeatherPoints } = routeData;

    // 1. Draw the route geometry
    if (paths?.length) {
      graphics.push(
        new Graphic({
          geometry: new Polyline({
            paths,
            spatialReference: { wkid: 4326 },
          }),
          symbol: {
            type: 'simple-line',
            color: [79, 70, 229, 0.8],
            width: 4,
            cap: 'round',
            join: 'round',
          },
        })
      );
    }

    return graphics;
  }, [routeData, locationData]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleMapClick = (lat, lon, data, screenPoint) => {
    setLocationData({ lat, lon });
    if (data?.address) setAddressData(data.address);
    if (data?.forecast) setForecastData(data.forecast);
    if (data?.weather) {
      setWeatherData(data.weather);
      setPopupData({ weather: data.weather, address: data.address, screenPoint });
    } else if (data?.weather === null) {
      setWeatherData(null);
      setPopupData(null);
    }

    // Fetch nearby places + AQI + NWS alerts based on clicked location
    if (placesEnabled) {
      fetchNearbyPlaces(lat, lon, searchRadiusMeters).then(setPlacesData).catch(() => setPlacesData([]));
    } else {
      setPlacesData([]);
    }
    fetchNWSAlerts(lat, lon).then(setNwsAlerts).catch(() => setNwsAlerts([]));
    if (preferences.showAirQuality) {
      fetchAirQuality(lat, lon).then(setAirQualityData).catch(() => setAirQualityData(null));
    }
  };

  const handlePlaceSelected = useCallback((placeAttributes, screenPoint) => {
    setPopupData(null);
    if (!placeAttributes) {
      setPlacePopupData(null);
      return;
    }
    setPlacePopupData({ place: placeAttributes, screenPoint });
  }, []);

  const closePopup = () => {
    console.trace('[App] closePopup called!');
    setPopupData(null);
    setPlacePopupData(null);
  };

  const handleToggleLayer = (layerId) => {
    toggleLayer(layerId);
  };

  const handleCalculateRoute = useCallback(
    (start, end, mode) => calculateRoute(start, end, units, mode, preferences),
    [calculateRoute, units, preferences],
  );

  const handleToggleStopFilter = (type) => {
    setStopFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Handle radius change from sidebar
  const handleRadiusChange = useCallback((radiusMiles) => {
    updatePreference('searchRadiusMiles', radiusMiles);
    // Re-fetch nearby places with new radius
    const loc = locationDataRef.current;
    if (loc?.lat && loc?.lon && placesEnabled) {
      const radiusMeters = Math.round(radiusMiles * 1609.34);
      fetchNearbyPlaces(loc.lat, loc.lon, radiusMeters).then(setPlacesData).catch(() => setPlacesData([]));
    }
  }, [updatePreference, placesEnabled, setPlacesData]);

  // Handle clicking a nearby place in the sidebar → zoom to it on map
  const handlePlaceClick = useCallback((place) => {
    if (place?.lat && place?.lon) {
      setMapCenter([place.lon, place.lat]);
      setPlacePopupData({ place, screenPoint: null });
    }
  }, []);

  // Handle clicking a route alert → pan to the place if it has coordinates
  const handleAlertClick = useCallback((alert) => {
    if (alert?.place?.lat && alert?.place?.lon) {
      setMapCenter([alert.place.lon, alert.place.lat]);
      setPlacePopupData({ place: alert.place, screenPoint: null });
    }
  }, []);

  if (!currentLocation) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-700 font-sans">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-lg font-medium">Fetching your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100 font-sans">
      <div className="absolute inset-0 z-0">
        <MapView />
      </div>

      <FloatingInterface />

      {/* Popups render above the map layer */}
        {console.log('[DEBUG RENDER] popupData: ', popupData, typeof popupData)}
        {popupData && typeof popupData === 'object' && (
          <WeatherPopup
            weather={popupData.weather}
            address={popupData.address}
            screenPoint={popupData.screenPoint}
            tempUnit={tempUnit}
            windUnit={windUnit}
            loading={popupData.loading}
            lat={popupData.lat}
            lon={popupData.lon}
            onClose={closePopup}
          />
        )}
        {placePopupData && (
          <PlacePopup
            place={placePopupData.place}
            screenPoint={placePopupData.screenPoint}
            onClose={closePopup}
          />
        )}

        <UnitToggle isMetric={isMetric} onToggle={toggleUnits} />
        <RouteAlerts routeData={routeData} tempUnit={tempUnit} preferences={preferences} nwsAlerts={nwsAlerts} onAlertClick={handleAlertClick} />

      {isShareModalOpen && (
        <ShareETAModal
          routeData={routeData}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
