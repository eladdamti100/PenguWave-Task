import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { buildThreatGeo, SEVERITY_HEX, type GeoArc, type GeoPoint } from "../lib/geo";
import { SEVERITY_ORDER, type NormalizedEvent } from "../lib/events";

interface ThreatGlobeProps {
  events: NormalizedEvent[];
}

const GLOBE_HEIGHT = 440;

/**
 * 3D threat map: a rotating globe with glowing arcs from attack source IPs to HQ,
 * colored by severity. Geo is approximate/demo (see src/lib/geo.ts).
 */
export default function ThreatGlobe({ events }: ThreatGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  const { points, arcs } = useMemo(() => buildThreatGeo(events), [events]);

  // Track container width so the canvas stays responsive.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Auto-rotate and frame the globe once it mounts.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enableZoom = true;
    g.pointOfView({ lat: 25, lng: 5, altitude: 2.5 }, 0);
  }, [points.length]);

  return (
    <div className="globe-card">
      <div className="globe-head">
        <div>
          <h3>Global Threat Map</h3>
          <p className="muted globe-sub">External attack sources → assets, by severity</p>
        </div>
        <div className="globe-legend">
          {SEVERITY_ORDER.map((sev) => (
            <span key={sev} className="legend-item">
              <span className="legend-dot" style={{ background: SEVERITY_HEX[sev] }} />
              {sev}
            </span>
          ))}
        </div>
      </div>

      <div className="globe-canvas" ref={wrapRef}>
        <Globe
          ref={globeRef}
          width={width}
          height={GLOBE_HEIGHT}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          atmosphereColor="#6d83ff"
          atmosphereAltitude={0.2}
          showGraticules
          arcsData={arcs}
          arcStartLat={(d) => (d as GeoArc).startLat}
          arcStartLng={(d) => (d as GeoArc).startLng}
          arcEndLat={(d) => (d as GeoArc).endLat}
          arcEndLng={(d) => (d as GeoArc).endLng}
          arcColor={(d: object) => SEVERITY_HEX[(d as GeoArc).severity]}
          arcLabel={(d) => (d as GeoArc).label}
          arcStroke={0.5}
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashInitialGap={() => Math.random()}
          arcDashAnimateTime={2000}
          arcAltitudeAutoScale={0.4}
          pointsData={points}
          pointLat={(d) => (d as GeoPoint).lat}
          pointLng={(d) => (d as GeoPoint).lng}
          pointColor={(d) => ((d as GeoPoint).kind === "hq" ? "#6d83ff" : SEVERITY_HEX[(d as GeoPoint).severity])}
          pointLabel={(d) => (d as GeoPoint).label}
          pointAltitude={(d) => ((d as GeoPoint).kind === "hq" ? 0.04 : 0.02)}
          pointRadius={(d) => ((d as GeoPoint).kind === "hq" ? 0.6 : 0.3 + Math.min((d as GeoPoint).count, 6) * 0.06)}
        />
      </div>
      <p className="globe-note muted">
        Geolocation is approximate (demo). Drag to rotate · scroll to zoom.
      </p>
    </div>
  );
}
