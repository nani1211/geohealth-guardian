# GeoHealth Guardian - Comprehensive Project Overview

## 1. Project Purpose
GeoHealth Guardian is a mobile-first, Progressive Web Application (PWA) designed to provide users with health and safety insights based on geographic location and travel routes. It overlays critical environmental data (weather, air quality, recent disease outbreaks) onto an interactive map, and aids in journey planning by exposing necessary route stops (hospitals, gas stations, rest areas, food).

## 2. Technology Stack
*   **Frontend Framework:** React 19, powered by Vite 8.
*   **Styling:** TailwindCSS v4 with custom responsive overrides and reactive utility classes.
*   **Mapping UI:** ArcGIS Maps SDK for JavaScript (`@arcgis/core`).
*   **PWA Support:** `vite-plugin-pwa` for offline capabilities and caching.
*   **Deployment:** Azure Static Web Apps, automated via GitHub Actions.

## 3. Core Architecture & State Management
The application is a single-page app (SPA) that uses modular functional React components. Global-like state is managed centrally in `App.jsx` and passed down to child components (`MapView`, `Sidebar`), while custom React Hooks abstract away the data-fetching and logic.

### 3.1 Primary State Variables (`App.jsx`)
*   `locationData`: The user’s current selected coordinate/location.
*   `mapCenter` / `mapZoom`: Drives programmatic map panning and zooming without strictly locking user controls.
*   `weatherData`: Caches OpenWeatherMap fetch results.
*   `routeData`: Stores geometry and steps for active ArcGIS Routing service paths.
*   `activeLayers`: Boolean flags mapped to different overlay services (weather, air quality, etc.).

### 3.2 Notable Custom Hooks
*   `useGeolocation`: Standardizes HTML5 geolocation logic.
*   `useRouteWeather`: Dynamically chunks polyline driving routes and fetches localized weather for segments along the journey.
*   `usePreferences`: Syncs user configuration (travel mode, route avoidance) to `localStorage`.
*   `useDiseaseLayer`: Constructs URL queries for WHO API mock endpoints to extract local health outbreaks.

## 4. Map & Service Integrations

### 4.1 ArcGIS Maps SDK (`MapView.jsx`)
*   **Base Map:** Uses `arcgis-navigation` for light/clean UI.
*   **Search Widget:** Integrated within the react sidebar DOM element (`#sidebar-search-container`) rather than floating over the map, customized with standard web CSS via `.esri-search` overrides.
*   **FeatureLayer (Clustering):** All individual points of interest (nearby places, route dinner stops, hospitals, mechanics) are mapped into a unified `FeatureLayer`.
    *   **Scale-Dependent Visibility:** Uses `minScale: 100000` to automatically hide icons when zooming out, leaving only interactive cluster bubbles.
*   **GraphicsLayer:** Used to draw the driving path polyline securely referencing `EPSG:4326`.

### 4.2 External Data Services (`src/services/`)
*   **ArcGIS Location Services:** Used directly via an API key for geocoding (`geocodeService.js`) and routing (`routeService.js`).
*   **Places Service (`placesService.js`):** Interacts with a Google Places-like proxy or API to search nearby points. Supports chunked fetching to satisfy route stops.
*   **Weather Service (`weatherService.js`):** Hits OpenWeatherMap or Open-Meteo for real-time conditions.
*   **NWS Alert Service:** Hits the US National Weather Service API to extract detailed text alerts given spatial bounding polygons.
*   **Air Quality API:** Provides current AQI metrics integrated directly into the `PlacePopup.jsx`.
*   **WHO API Mock:** A placeholder structure testing ICD endpoints for local health tracking.

## 5. UI/UX Highlights
*   **Mobile-First Sidebar:** `Sidebar.jsx` acts as the primary control panel, featuring horizontal scrolling layer toggles and a vertically scrollable list (`overflow-y-auto`) of nearby stops.
*   **Automatic Zoom Behavior:** Automatically zooms exactly to a user’s current location (zoom level 14) on startup, and automatically pans and deep-zooms (zoom level 16) when a marker is clicked in the sidebar.
*   **Interactive Popups (`PlacePopup.jsx` & `WeatherPopup.jsx`):** Embayed with Tailwind utilities to render visual gradients, contact numbers, and routing action buttons gracefully.

## 6. Infrastructure & Deployment
*   **CI/CD Pipeline:** The `.github/workflows/azure-static-web-apps.yml` handles building branch `main`.
*   **Build Resolution:** Uses `.npmrc` (`legacy-peer-deps=true`) to bypass strict peer dependency conflicts between Vite v8 and `vite-plugin-pwa`.
*   **Hosting:** Hosted on Azure Static Web Apps, resolving routing for the SPA via `staticwebapp.config.json` defining `navigationFallback`.

## 7. Next Steps / Potential Refactoring Areas for other LLMs
1.  **State Management Overhead:** `App.jsx` handles significant prop-drilling; moving to `Zustand` or React Context for `mapState` could clean up the component tree.
2.  **Weather Overlay Transition:** Converting existing weather Graphics Layers into native ArcGIS `ImageryLayers` or `FeatureLayers` could yield performance benefits.
3.  **Real WHO Backend:** Finalize and wire up the `whoApiService.js` mock layer to the actual data source when available.
