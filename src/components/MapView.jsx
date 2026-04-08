import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import ArcMapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import Track from '@arcgis/core/widgets/Track';
import Compass from '@arcgis/core/widgets/Compass';

import { fetchWeatherData } from '../services/weatherService';
import { reverseGeocode } from '../services/geocodeService';
import { fetchForecast } from '../services/forecastService';
import useAppStore from '../store/useAppStore';
import '@arcgis/core/assets/esri/themes/light/main.css';

import usePreferences from '../hooks/usePreferences';
import { fetchNearbyPlaces } from '../services/placesService';

/**
 * MapView — reusable, full-screen ArcGIS map with click-to-fetch weather + geocode.
 * Purely pulls from Zustand store.
 */
const MapView = () => {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const routeLayerRef = useRef(null);
  const placesLayerRef = useRef(null);
  const routeWeatherLayerRef = useRef(null);
  
  const {
    routeData,
    routeWeatherData,
    mapCenter, setMapCenter,
    mapZoom, setMapZoom,
    placesData, setPlacesData, setPlacesLoading,
    placesEnabled,
    stopFilters,
    weatherData, setWeatherData,
    setAddressData,
    setForecastData,
    setPopupData,
    placePopupData, setPlacePopupData,
    activeLayers,
    currentLocation,
    mapPickingMode, setMapPickingMode,
    setRouteStart, setRouteEnd
  } = useAppStore();

  const weatherEnabled = activeLayers.weather;
  const { preferences } = usePreferences();
  const searchRadiusMeters = preferences.searchRadiusMiles * 1609.34;
  const units = 'metric';

  // Refs that track latest values for use inside async callbacks
  const weatherEnabledRef = useRef(weatherEnabled);
  const unitsRef = useRef(units);

  useEffect(() => {
    weatherEnabledRef.current = weatherEnabled;
  }, [weatherEnabled]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // ── Initialise map & view ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new Map({ basemap: 'streets-navigation-vector' });

    const view = new ArcMapView({
      container: containerRef.current,
      map,
      center: mapCenter,
      zoom: mapZoom,
    });

    viewRef.current = view;

    // Register click handler after view is ready
    view.when(() => {
      // 1. Add Track Widget (pulsing blue dot / live location)
      const trackWidget = new Track({
        view: view,
        useHeadingEnabled: false,
        goToLocationEnabled: true,
      });
      view.ui.add(trackWidget, 'bottom-right');

      // 2. Add Compass Widget
      const compassWidget = new Compass({
        view: view,
      });
      view.ui.add(compassWidget, 'bottom-right');

      view.ui.move("zoom", "bottom-right");

      // Disable the native popup's auto-open because we manually handle it below
      view.popup.autoOpenEnabled = false;

      // Register an action handler for our custom popup buttons (like Navigate)
      view.popup.on("trigger-action", (event) => {
        if (event.action.id === "navigate-action") {
          const attr = view.popup.selectedFeature.attributes;
          if (attr) {
            const dest = encodeURIComponent(attr.address || attr.name || `${attr.lat},${attr.lon}`);
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
          }
        }
      });

      // Regular Map Click: Handling place popups and map picking for routing
      const clickHandle = view.on('click', async (event) => {
        const pickingMode = useAppStore.getState().mapPickingMode;

        // Routing Pin Placer
        if (pickingMode) {
          console.log('[MapView] Map click intercepted for routing mapPickingMode:', pickingMode);
          const { latitude: lat, longitude: lon } = event.mapPoint;
          const addressText = await reverseGeocode(lat, lon).then(a => a?.label || `${lat.toFixed(4)}, ${lon.toFixed(4)}`).catch(() => `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          if (pickingMode === 'start') {
             useAppStore.getState().setRouteStart(addressText);
          } else if (pickingMode === 'end') {
             useAppStore.getState().setRouteEnd(addressText);
          }
          useAppStore.getState().setMapPickingMode(null);
          return; // Stop standard click handling
        }

        const response = await view.hitTest(event);
        
        // 1. Check if we clicked a custom place marker
        const placeGraphic = response.results
          .map((res) => res.graphic)
          .find((g) => g && g.attributes && g.attributes.isPlaceMarker);

        if (placeGraphic) {
          const screenPoint = { x: event.x, y: event.y };
          setPlacePopupData({ place: placeGraphic.attributes, screenPoint });
          return; 
        }

        // 2. Check if we clicked any other graphic that has a native popup defined (e.g. disease layer)
        const popupFeatures = response.results
          .map((res) => res.graphic)
          .filter((g) => g && g.popupTemplate);

        if (popupFeatures.length > 0) {
          view.popup.open({
            features: popupFeatures,
            location: event.mapPoint,
          });
          setPlacePopupData(null); // Dismiss custom popup
          return; 
        }

        // ── Regular Map Click (Empty Map Area) ──
        // Trigger weather dashboard and map popup
        setPlacePopupData(null); // Dismiss custom popup
        const { latitude: lat, longitude: lon } = event.mapPoint;
        const screenPoint = { x: event.x, y: event.y };

        console.log('[MapView] Empty map area clicked! lat:', lat, 'lon:', lon);
        setPopupData({ weather: null, address: null, screenPoint, lat, lon, loading: true });

        const currentUnits = unitsRef.current;

        // Fetch everything in parallel
        const [weather, address, forecast] = await Promise.all([
          fetchWeatherData(lat, lon, currentUnits).catch(() => null),
          reverseGeocode(lat, lon).catch(() => null),
          fetchForecast(lat, lon, currentUnits).catch(() => []),
        ]);

        if (weather) {
          weather.lat = lat;
          weather.lon = lon;
        }

        if (address) setAddressData(address);
        if (forecast) setForecastData(forecast);
        if (weather) setWeatherData(weather);

        // Always show popup — even with no weather (show coords + address)
        setPopupData({ weather, address, screenPoint, lat, lon, loading: false });
      });

      const zoomHandle = view.watch('zoom', (newZoom) => {
        setMapZoom(Math.round(newZoom));
      });

      view._clickHandle = clickHandle;
      view._zoomHandle = zoomHandle;
    });

    return () => {
      view._clickHandle?.remove();
      view._zoomHandle?.remove();
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync external layers (add/remove based on toggle state) ─────
  useEffect(() => {
    // Only implemented layer fetching via simple toggles
    // You would map activeLayers into genuine ArcGIS layers here
  }, [activeLayers]);

  // ── Sync center & zoom ──────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready || !mapCenter) return;

    // Only update if center differs significantly to prevent jitter
    view.goTo(
      { center: mapCenter, zoom: mapZoom || view.zoom },
      { duration: 1000, easing: 'ease-in-out' }
    ).catch(() => {});
  }, [mapCenter, mapZoom]);

  // ── Sync route graphics ─────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    if (!routeLayerRef.current) {
      routeLayerRef.current = new GraphicsLayer({ id: '__route__' });
      view.map.add(routeLayerRef.current);
    }

    console.log('[Debug] Syncing route layer with routeData:', routeData);

    const rl = routeLayerRef.current;
    rl.removeAll();

    const graphicsToAdd = [];

    if (!routeData) {
      if (currentLocation) {
        graphicsToAdd.push(new Graphic({
          geometry: new Point({ longitude: currentLocation.lon, latitude: currentLocation.lat }),
          symbol: { type: 'simple-marker', color: [59, 130, 246, 0.9], size: '14px', outline: { color: [255, 255, 255], width: 2 } }
        }));
      }
    } else if (routeData.paths?.length) {
      graphicsToAdd.push(new Graphic({
        geometry: { type: "polyline", paths: routeData.paths, spatialReference: { wkid: 4326 } },
        symbol: { type: 'simple-line', color: [79, 70, 229, 0.8], width: 4, cap: 'round', join: 'round' }
      }));
    }

    if (graphicsToAdd.length > 0) {
      rl.addMany(graphicsToAdd);
    }
    
    console.log('[Stability Fix] Synced routeLayer graphics count:', graphicsToAdd.length);
  }, [routeData, currentLocation]);

  // ── Sync route weather graphics ─────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    if (!routeWeatherLayerRef.current) {
      routeWeatherLayerRef.current = new GraphicsLayer({ id: '__route_weather__' });
      view.map.add(routeWeatherLayerRef.current);
    }

    console.log('[Debug] Syncing weather layer with routeWeatherData:', routeWeatherData);

    const wl = routeWeatherLayerRef.current;
    wl.removeAll();

    const graphicsToAdd = [];

    if (routeWeatherData && routeWeatherData.length > 0) {
      routeWeatherData.forEach((pt) => {
        if (!pt || !pt.lat || !pt.lon) return;

        const color = pt.severity?.color || [100, 100, 100];
        
        const ptGraphic = new Graphic({
          geometry: new Point({ longitude: pt.lon, latitude: pt.lat }),
          symbol: {
            type: 'simple-marker',
            color: [...color, 220],
            size: '14px',
            outline: { color: [255, 255, 255], width: 2 },
          },
          attributes: { 
            temp: pt.weather?.temp, 
            condition: pt.weather?.description,
            isRouteWeatherMarker: true 
          },
          popupTemplate: {
            title: `Weather Marker`,
            content: [
              `<b>${pt.weather?.temp ?? '–'}${unitsRef.current}</b> · ${pt.weather?.description || '–'}`,
              `Wind: ${pt.weather?.windSpeed ?? '–'} m/s`,
              pt.airQuality ? `AQI: ${pt.airQuality.label} (${pt.airQuality.aqi}/5)` : '',
            ].filter(Boolean).join('<br/>'),
          },
        });
        graphicsToAdd.push(ptGraphic);
      });
    }

    if (graphicsToAdd.length > 0) {
      wl.addMany(graphicsToAdd);
    }
    
    console.log('[Stability Fix] Synced routeWeatherLayer graphics count:', graphicsToAdd.length);
  }, [routeWeatherData]);

  // ── Sync places graphics ──
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    if (!placesLayerRef.current) {
      placesLayerRef.current = new GraphicsLayer({ id: '__places__' });
      view.map.add(placesLayerRef.current);
    }
    const pl = placesLayerRef.current;

    console.log('[Debug] Syncing places layer with placesData:', placesData, 'placesEnabled:', placesEnabled);

    if (!placesEnabled) {
      pl.removeAll();
      return;
    }

    pl.removeAll();

    const allPlaces = [...(placesData || []), ...(routeData?.stops || [])];
    const filteredPlaces = allPlaces.filter(p => p.lat && p.lon && stopFilters.includes(p.type));

    const typeToColor = {
      gas: [245, 158, 11, 1],
      food: [16, 185, 129, 1],
      rest: [59, 130, 246, 1],
      emergency: [239, 68, 68, 1],
      hospital: [239, 68, 68, 1],
      mechanic: [100, 116, 139, 1],
    };

    const graphicsToAdd = [];

    filteredPlaces.forEach((place, i) => {
      const type = place.type || 'rest';
      const color = typeToColor[type] || [100, 100, 100, 1];
      const isSelected = placePopupData?.place?.id === place.id;
      const attrs = {
        ObjectID: i,
        isPlaceMarker: true,
        placeType: type,
        name: place.name,
        ...place,
      };

      // Pin marker
      graphicsToAdd.push(new Graphic({
        geometry: new Point({ longitude: place.lon, latitude: place.lat }),
        attributes: attrs,
        symbol: {
          type: 'simple-marker',
          path: "M16,0 C7.163,0 0,7.163 0,16 C0,24.837 16,48 16,48 C16,48 32,24.837 32,16 C32,7.163 24.837,0 16,0 Z M16,22 C12.686,22 10,19.314 10,16 C10,12.686 12.686,10 16,10 C19.314,10 22,12.686 22,16 C22,19.314 19.314,22 16,22 Z",
          color: isSelected ? [255, 255, 255, 1] : color,
          size: isSelected ? 40 : 32,
          outline: { color: isSelected ? color : [255, 255, 255, 0.9], width: isSelected ? 3 : 1.5 },
          yoffset: isSelected ? 20 : 16,
        },
      }));

      // Text label above pin
      const label = place.name
        ? (place.name.length > 22 ? place.name.slice(0, 21) + '…' : place.name)
        : '';
      if (label) {
        graphicsToAdd.push(new Graphic({
          geometry: new Point({ longitude: place.lon, latitude: place.lat }),
          attributes: { ...attrs, isPlaceMarker: false }, // don't re-trigger click popup
          symbol: {
            type: 'text',
            text: label,
            color: isSelected ? [79, 70, 229, 1] : [30, 30, 30, 1],
            font: { size: 10, family: 'sans-serif', weight: isSelected ? 'bold' : 'normal' },
            haloColor: [255, 255, 255, 0.95],
            haloSize: 2,
            yoffset: isSelected ? 46 : 38,
          },
        }));
      }
    });

    if (graphicsToAdd.length > 0) {
      pl.addMany(graphicsToAdd);
    }
    
    console.log('[Stability Fix] Synced placesLayer graphics count:', graphicsToAdd.length);

  }, [placesData, routeData, stopFilters, placesEnabled, placePopupData]);

  // ── API: Fetch places once (when turned on) & dynamically on pan ──
  useEffect(() => {
    if (!placesEnabled) return;
    const view = viewRef.current;
    if (!view) return;
    
    // Attempt instant fetch on enable if we are already zoomed in
    if (view.zoom >= 12) {
      const centerPoint = view.center;
      if (centerPoint) {
        setPlacesLoading(true);
        fetchNearbyPlaces(centerPoint.latitude, centerPoint.longitude, searchRadiusMeters)
          .then(setPlacesData)
          .catch(() => {})
          .finally(() => setPlacesLoading(false));
      }
    }

    let timeout;
    const watchHandle = view.watch('extent', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (view.zoom < 11) {
          setPlacesData([]); // Clear places from screen when zoomed out
          return;
        }
        const centerPoint = view.center;
        setPlacesLoading(true);
        fetchNearbyPlaces(centerPoint.latitude, centerPoint.longitude, searchRadiusMeters)
          .then(setPlacesData)
          .catch(() => {})
          .finally(() => setPlacesLoading(false));
      }, 500); 
    });

    return () => watchHandle.remove();
  }, [placesEnabled, searchRadiusMeters, setPlacesData, setPlacesLoading]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ minHeight: '100%' }}
    />
  );
};

export default MapView;
