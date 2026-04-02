import React, { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import ArcMapView from '@arcgis/core/views/MapView';
import Graphic from '@arcgis/core/Graphic';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Point from '@arcgis/core/geometry/Point';
import Track from '@arcgis/core/widgets/Track';
import Compass from '@arcgis/core/widgets/Compass';
import Search from '@arcgis/core/widgets/Search';
import { fetchWeatherData } from '../services/weatherService';
import { reverseGeocode } from '../services/geocodeService';
import { fetchForecast } from '../services/forecastService';
import '@arcgis/core/assets/esri/themes/light/main.css';

/**
 * MapView — reusable, full-screen ArcGIS map with click-to-fetch weather + geocode.
 *
 * Props:
 *  • onMapClick(lat, lon, data, screenPoint) — data = { weather?, address?, forecast? }
 *  • weatherEnabled (bool)
 *  • layers (Layer[])
 *  • basemap / center / zoom
 */
const MapView = ({
  onMapClick,
  onPlaceSelected,
  layers = [],
  routeGraphics = [],
  places = [],
  stopFilters = [],
  weatherEnabled = true,
  units = 'metric',
  basemap = 'streets-navigation-vector',
  center = [-98.5795, 39.8283],
  zoom = 4,
}) => {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const weatherEnabledRef = useRef(weatherEnabled);
  const unitsRef = useRef(units);
  const routeLayerRef = useRef(null);
  const placesLayerRef = useRef(null);

  useEffect(() => {
    weatherEnabledRef.current = weatherEnabled;
  }, [weatherEnabled]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // ── Initialise map & view ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new Map({ basemap });

    const view = new ArcMapView({
      container: containerRef.current,
      map,
      center,
      zoom,
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
      view.ui.add(trackWidget, 'top-left');

      // 2. Add Compass Widget
      const compassWidget = new Compass({
        view: view,
      });
      view.ui.add(compassWidget, 'top-left');

      // 3. Add Search Widget
      const searchWidget = new Search({
        view: view,
        container: 'sidebar-search-container',
        popupEnabled: true // enable popup for search results specifically
      });
      // Not adding to view.ui so it renders exactly where the container is

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

      const clickHandle = view.on('click', async (event) => {
        const response = await view.hitTest(event);
        
        // 1. Check if we clicked a custom place marker
        const placeGraphic = response.results
          .map((res) => res.graphic)
          .find((g) => g && g.attributes && g.attributes.isPlaceMarker);

        if (placeGraphic && onPlaceSelected) {
          const screenPoint = { x: event.x, y: event.y };
          onPlaceSelected(placeGraphic.attributes, screenPoint);
          return; // Skip normal map click processing
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
          onPlaceSelected && onPlaceSelected(null, null); // Dismiss custom popup
          return; // Skip normal map click processing
        }

        // 3. Normal map click (weather)
        onPlaceSelected && onPlaceSelected(null, null); // Dismiss custom popup
        const { latitude: lat, longitude: lon } = event.mapPoint;
        const screenPoint = { x: event.x, y: event.y };

        const geocodePromise = reverseGeocode(lat, lon);
        const currentUnits = unitsRef.current;
        const forecastPromise = fetchForecast(lat, lon, currentUnits).catch(() => []);

        if (!weatherEnabledRef.current) {
          const [address, forecast] = await Promise.all([geocodePromise, forecastPromise]);
          onMapClick?.(lat, lon, { address, forecast }, screenPoint);
          return;
        }

        // Notify parent immediately (loading state)
        onMapClick?.(lat, lon, { address: null, weather: null, forecast: null }, screenPoint);

        // Fetch weather, geocode, and forecast in parallel
        const [weather, address, forecast] = await Promise.all([
          fetchWeatherData(lat, lon, currentUnits).catch(() => null),
          geocodePromise,
          forecastPromise,
        ]);

        if (weather) {
          weather.lat = lat;
          weather.lon = lon;
        }

        onMapClick?.(lat, lon, { weather, address, forecast }, screenPoint);
      });

      view._clickHandle = clickHandle;
    });

    return () => {
      view._clickHandle?.remove();
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync external layers (add/remove based on toggle state) ─────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    const map = view.map;
    const wantedIds = new Set(layers.map((l) => l.id));

    // Remove any map layers that we previously added but are no longer wanted
    map.layers.toArray().forEach((l) => {
      if (l.id && !wantedIds.has(l.id) && l.id !== 'default' && l.id !== '__route__' && l.id !== '__places__') {
        map.remove(l);
      }
    });

    // Add layers that aren't on the map yet
    layers.forEach((layer) => {
      if (!map.findLayerById(layer.id)) {
        map.add(layer);
      }
    });
  }, [layers]);

  // ── Sync center & zoom ──────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready || !center) return;

    // Only update if center differs significantly to prevent jitter
    view.goTo(
      { center, zoom: zoom || view.zoom },
      { duration: 1000, easing: 'ease-in-out' }
    ).catch(() => {});
  }, [center, zoom]);

  // ── Sync route graphics ─────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    // Create the route graphics layer on first use
    if (!routeLayerRef.current) {
      routeLayerRef.current = new GraphicsLayer({ id: '__route__' });
      view.map.add(routeLayerRef.current);
    }

    const rl = routeLayerRef.current;
    rl.removeAll();
    routeGraphics.forEach((g) => rl.add(g));

    if (routeGraphics.length > 0) {
      const poly = routeGraphics.find(g => g.geometry?.type === 'polyline');
      if (poly) {
        view.goTo(poly.geometry.extent.expand(1.2)).catch(() => {});
      }
    }
  }, [routeGraphics]);

  // ── Sync places graphics (FeatureLayer with clustering) ──
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.ready) return;

    // Filter by stopFilters first
    const filteredPlaces = places.filter(p => p.lat && p.lon && stopFilters.includes(p.type));

    const typeToColor = {
      gas: [245, 158, 11, 1],
      food: [16, 185, 129, 1],
      rest: [59, 130, 246, 1],
      emergency: [239, 68, 68, 1],
      hospital: [239, 68, 68, 1],
      mechanic: [100, 116, 139, 1],
    };

    const typeToIcon = { gas: '⛽', food: '🍔', rest: '🛑', emergency: '🚨', hospital: '🏥', mechanic: '🔧' };

    // Create underlying graphics
    const graphics = filteredPlaces.map((place, i) => {
      return new Graphic({
        geometry: new Point({ longitude: place.lon, latitude: place.lat }),
        attributes: {
          ObjectID: i,
          isPlaceMarker: true,
          placeType: place.type,
          name: place.name,
          ...place
        }
      });
    });

    if (placesLayerRef.current) {
      view.map.remove(placesLayerRef.current);
    }

    // Re-create the FeatureLayer so we can set source easily
    placesLayerRef.current = new FeatureLayer({
      id: '__places__',
      source: graphics,
      objectIdField: 'ObjectID',
      fields: [
        { name: 'ObjectID', type: 'oid' },
        { name: 'placeType', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'isPlaceMarker', type: 'boolean' }
      ],
      outFields: ['*'],
      renderer: {
        type: 'unique-value',
        field: 'placeType',
        uniqueValueInfos: ['gas', 'food', 'rest', 'emergency', 'hospital', 'mechanic'].map(type => ({
          value: type,
          symbol: {
            type: 'simple-marker',
            path: "M16,0 C7.163,0 0,7.163 0,16 C0,24.837 16,48 16,48 C16,48 32,24.837 32,16 C32,7.163 24.837,0 16,0 Z M16,22 C12.686,22 10,19.314 10,16 C10,12.686 12.686,10 16,10 C19.314,10 22,12.686 22,16 C22,19.314 19.314,22 16,22 Z",
            color: typeToColor[type] || [100, 100, 100, 1],
            size: 32,
            outline: { color: [255, 255, 255, 0.9], width: 1.5 },
            yoffset: 16,
          }
        }))
      },
      // Scale-dependent labeling
      labelingInfo: [
        {
          labelExpressionInfo: { 
            expression: "Decode($feature.placeType, 'gas', '⛽', 'food', '🍔', 'rest', '🛑', 'emergency', '🚨', 'hospital', '🏥', 'mechanic', '🔧', '')"
          },
          symbol: {
            type: "text",
            font: { size: 14, family: "sans-serif" },
            yoffset: 22,
            color: [0, 0, 0, 1], // The emoji renders with its own colors mostly, but fallback
            haloSize: 0,
          },
          minScale: 100000,
          labelPlacement: "center-center",
          deconflictionStrategy: "none",
        },
        {
          labelExpressionInfo: { expression: "$feature.name" },
          symbol: {
            type: "text",
            color: [40, 40, 40, 1],
            haloColor: [255, 255, 255, 0.95],
            haloSize: 2,
            font: { size: 10, weight: "bold", family: "sans-serif" },
            xoffset: 14,
            yoffset: 16,
            horizontalAlignment: "left"
          },
          minScale: 100000 // Only show text labels when zoomed in closer than 1:100,000
        }
      ],
      // Clustering feature!
      featureReduction: {
        type: "cluster",
        clusterRadius: "60px",
        symbol: {
          type: "simple-marker",
          style: "circle",
          color: [59, 130, 246, 0.95],
          size: "26px",
          outline: {
            color: [255, 255, 255, 1],
            width: 2
          }
        },
        popupTemplate: {
          title: "Cluster summary",
          content: "This cluster represents <b>{cluster_count}</b> places.",
          fieldInfos: [{
            fieldName: "cluster_count",
            format: { places: 0, digitSeparator: true }
          }]
        },
        clusterMinSize: "24px",
        clusterMaxSize: "40px",
        labelingInfo: [{
          deconflictionStrategy: "none",
          labelExpressionInfo: { expression: "Text($feature.cluster_count, '#,###')" },
          symbol: {
            type: "text",
            color: "#ffffff",
            font: { weight: "bold", family: "sans-serif", size: "12px" }
          },
          labelPlacement: "center-center"
        }]
      }
    });

    view.map.add(placesLayerRef.current);
  }, [places, stopFilters]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
      style={{ minHeight: '100%' }}
    />
  );
};

export default MapView;
