// import axios removed since locator and routing modules handle network calls
import * as route from '@arcgis/core/rest/route';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';
import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import * as locator from '@arcgis/core/rest/locator';

/**
 * routeService.js — Forward geocoding, ArcGIS routing, and route point sampling.
 */

const GEOCODE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';
const ROUTE_URL = 'https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World';

// ─── Forward Geocode ───────────────────────────────────────────────
/**
 * Convert a human-readable address into coordinates.
 *
 * @param {string} address — e.g. "Chicago, IL"
 * @returns {Promise<{ lat: number, lon: number, label: string }>}
 */
export async function forwardGeocode(address) {
  const results = await locator.addressToLocations(GEOCODE_URL, {
    address: { SingleLine: address },
    maxLocations: 1,
    outFields: ['Match_addr']
  });

  const cand = results[0];
  if (!cand) throw new Error(`Could not geocode: "${address}"`);

  return {
    lat: cand.location.latitude,
    lon: cand.location.longitude,
    label: cand.attributes?.Match_addr || address,
  };
}

// ─── Routing ───────────────────────────────────────────────────────
/**
 * Get a real driving or walking route between two coordinate pairs.
 * Expects config.apiKey to be set, otherwise it will fail.
 *
 * @param {{ lat: number, lon: number }} start
 * @param {{ lat: number, lon: number }} end
 * @param {'driving'|'walking'} mode — travel mode
 * @returns {Promise<{ paths: number[][][], totalMiles: number, totalMinutes: number }>}
 */
export async function getRoute(start, end, mode = 'driving') {
  const routeParams = new RouteParameters({
    stops: new FeatureSet({
      features: [
        new Graphic({ geometry: new Point({ longitude: start.lon, latitude: start.lat }) }),
        new Graphic({ geometry: new Point({ longitude: end.lon, latitude: end.lat }) })
      ]
    }),
    returnRoutes: true,
    returnDirections: true,
    directionsLengthUnits: 'miles',
    outSpatialReference: { wkid: 4326 },
  });

  const data = await route.solve(ROUTE_URL, routeParams);

  const routeFeature = data.routeResults?.[0]?.route;
  if (!routeFeature) throw new Error('No route found');

  const paths = routeFeature.geometry.paths;
  const totalMiles = routeFeature.attributes?.Total_Miles
    || routeFeature.attributes?.Shape_Length
    || 0;
  
  const totalMinutes = routeFeature.attributes?.Total_TravelTime
    || routeFeature.attributes?.Total_Time
    || 0;

  // Parse direction features for road surface detection
  const directionFeatures = data.routeResults?.[0]?.directions?.features || [];
  const dirtRoadSegments = parseDirectionsForSurface(directionFeatures, totalMiles);

  return {
    paths,
    totalMiles: +totalMiles.toFixed(1),
    totalMinutes: Math.round(totalMinutes),
    dirtRoadSegments,
    directions: directionFeatures,
  };
}

// ─── Road Surface Detection ───────────────────────────────────────
const UNPAVED_KEYWORDS = /unpaved|dirt\s*road|gravel|trail|rough\s*road|unimproved|4wd|four.wheel/i;

/**
 * Scan ArcGIS direction text for road surface indicators.
 * Returns array of { mileMarker, miles, surfaceType, text }
 */
function parseDirectionsForSurface(features, totalMiles) {
  const segments = [];
  let cumulativeMiles = 0;

  for (const feat of features) {
    const text = feat.attributes?.text || '';
    const length = feat.attributes?.length || 0;

    if (UNPAVED_KEYWORDS.test(text)) {
      // Identify the type of surface from the text
      let surfaceType = 'unpaved road';
      if (/dirt/i.test(text)) surfaceType = 'dirt road';
      else if (/gravel/i.test(text)) surfaceType = 'gravel road';
      else if (/trail/i.test(text)) surfaceType = 'trail';
      else if (/4wd|four.wheel/i.test(text)) surfaceType = '4WD track';

      segments.push({
        mileMarker: +cumulativeMiles.toFixed(1),
        miles: +length.toFixed(1),
        surfaceType,
        text,
        // Estimate how many extra miles a paved alternative might add (rough heuristic)
        detourExtraMiles: +(length * 1.5).toFixed(1),
      });
    }

    cumulativeMiles += length;
  }

  return segments;
}

export function sampleRoutePoints(paths, numPoints = 10) {
  // Gracefull flatten: ArcGIS uses 3D arrays [[[lon, lat]]]
  const coords = [];
  for (const part of paths) {
    if (Array.isArray(part) && Array.isArray(part[0])) {
      for (const pt of part) coords.push(pt);
    } else if (Array.isArray(part)) {
      coords.push(part);
    }
  }

  if (coords.length < 2) return [];

  // Calculate total distance of exact geometry
  const segments = [];
  let totalLineDist = 0;
  for (let i = 1; i < coords.length; i++) {
    const p1 = coords[i - 1];
    const p2 = coords[i];
    const dist = haversine(p1[1], p1[0], p2[1], p2[0]);
    totalLineDist += dist;
    segments.push({ dist, p1, p2 });
  }

  if (totalLineDist === 0) return []; // Cannot sample zero distance

  const interval = totalLineDist / Math.max(1, numPoints - 1);
  const points = [];

  // Always include the start
  points.push({ lon: coords[0][0], lat: coords[0][1], mileMarker: 0 });

  let currentDist = 0;
  let nextThreshold = interval;

  // Interpolate along the segments
  for (const seg of segments) {
    currentDist += seg.dist;

    while (currentDist >= nextThreshold - 0.00001 && points.length < numPoints - 1) {
      const overshoot = currentDist - nextThreshold;
      // Safeguard against NaN or negative ratio
      const ratio = seg.dist > 0 ? Math.max(0, Math.min(1, 1 - overshoot / seg.dist)) : 0;
      
      const lon = seg.p1[0] + ratio * (seg.p2[0] - seg.p1[0]);
      const lat = seg.p1[1] + ratio * (seg.p2[1] - seg.p1[1]);

      points.push({ lon, lat, mileMarker: +nextThreshold.toFixed(1) });
      nextThreshold += interval;
    }
  }

  // Always include the end point exactly
  const lastCoord = coords[coords.length - 1];
  const lastPoint = points[points.length - 1];
  const distFromLast = haversine(lastPoint.lat, lastPoint.lon, lastCoord[1], lastCoord[0]);
  
  // Only push if it's geographically distinct from the last interpolated point
  if (distFromLast > 0.01 || points.length < 2) {
    points.push({ lon: lastCoord[0], lat: lastCoord[1], mileMarker: +totalLineDist.toFixed(1) });
  }

  return points;
}

// ─── Haversine (miles) ─────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
