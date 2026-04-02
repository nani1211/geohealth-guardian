import { useMemo } from 'react';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import { getDiseaseOutbreaks, SEVERITY_COLORS } from '../services/diseaseService';

/**
 * useDiseaseLayer — builds an ArcGIS GraphicsLayer from mock outbreak data.
 *
 * Returns a stable GraphicsLayer instance that can be passed to MapView's
 * `layers` prop.  Marker size scales with case count, colour encodes severity.
 */
const useDiseaseLayer = () => {
  const layer = useMemo(() => {
    const outbreaks = getDiseaseOutbreaks();

    const gl = new GraphicsLayer({ id: 'disease-outbreaks', title: 'Disease Outbreaks' });

    outbreaks.forEach((ob) => {
      // Scale marker size: min 10px, max 28px based on case count
      const size = Math.min(28, Math.max(10, Math.sqrt(ob.cases) * 0.4));
      const color = SEVERITY_COLORS[ob.severity] || SEVERITY_COLORS.low;

      gl.add(
        new Graphic({
          geometry: new Point({ longitude: ob.lon, latitude: ob.lat }),
          symbol: {
            type: 'simple-marker',
            style: 'diamond',          // diamond shape to distinguish from weather markers (circles)
            color,
            size: `${size}px`,
            outline: { color: [255, 255, 255, 0.9], width: 1.5 },
          },
          attributes: {
            disease: ob.disease,
            cases: ob.cases,
            severity: ob.severity,
            region: ob.region,
          },
          popupTemplate: {
            title: `🦠 ${ob.disease}`,
            content: `
              <b>Region:</b> ${ob.region}<br/>
              <b>Cases:</b> ${ob.cases.toLocaleString()}<br/>
              <b>Severity:</b> ${ob.severity.charAt(0).toUpperCase() + ob.severity.slice(1)}
            `,
          },
        }),
      );
    });

    return gl;
  }, []);

  return layer;
};

export default useDiseaseLayer;
