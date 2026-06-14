import type { Severity } from "../types";
import { SEVERITY_ORDER, type NormalizedEvent } from "./events";

/**
 * Approximate geolocation for the threat globe.
 *
 * The mock data has no lat/long, so this is a DEMO geo layer: notable public
 * source IPs are mapped to plausible locations (the descriptions hint at them —
 * "Eastern Europe", "Tor exit node", AWS), internal/RFC-1918 traffic is anchored
 * at HQ, and any unknown public IP gets a stable pseudo-location from its hash so
 * the map degrades gracefully on new data. In production this would be a real
 * GeoIP lookup on the backend.
 */

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  severity: Severity;
  count: number;
  kind: "hq" | "source";
}

export interface GeoArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  severity: Severity;
  label: string;
}

const HQ = { lat: 40.7128, lng: -74.006, label: "PenguWave HQ / internal assets" };

const KNOWN_IPS: Record<string, { lat: number; lng: number; label: string }> = {
  "203.0.113.89": { lat: 44.43, lng: 26.1, label: "Bucharest, RO (brute-force source)" },
  "185.220.101.34": { lat: 50.11, lng: 8.68, label: "Frankfurt, DE (Tor exit node)" },
  "198.51.100.23": { lat: 55.75, lng: 37.62, label: "Moscow, RU" },
  "198.51.100.77": { lat: 55.75, lng: 37.62, label: "Moscow, RU (reverse shell)" },
  "54.231.10.44": { lat: 38.95, lng: -77.45, label: "AWS us-east-1 (Ashburn, US)" },
};

function isPrivateOrInternal(ip: string | null): boolean {
  if (!ip) return true;
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip) // non-IPv4 (e.g. an S3 URL) → treat as internal
  );
}

/** Deterministic pseudo-location for unknown public IPs, so the globe never hides data. */
function pseudoGeo(ip: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) >>> 0;
  const lat = ((h % 1000) / 1000) * 120 - 55; // -55..65
  const lng = (((h >> 10) % 1000) / 1000) * 340 - 170; // -170..170
  return { lat, lng };
}

function highestSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_ORDER.indexOf(a) < SEVERITY_ORDER.indexOf(b) ? a : b;
}

/** Build globe points + arcs from the events, grouped by source IP. */
export function buildThreatGeo(events: NormalizedEvent[]): { points: GeoPoint[]; arcs: GeoArc[] } {
  const sources = new Map<string, { lat: number; lng: number; label: string; severity: Severity; count: number }>();
  let internalCount = 0;
  let internalSeverity: Severity = "LOW";

  for (const e of events) {
    if (isPrivateOrInternal(e.sourceIp)) {
      internalCount++;
      internalSeverity = highestSeverity(internalSeverity, e.severity);
      continue;
    }
    const ip = e.sourceIp as string;
    const geo = KNOWN_IPS[ip] ?? { ...pseudoGeo(ip), label: `Unknown origin (${ip})` };
    const existing = sources.get(ip);
    if (existing) {
      existing.count++;
      existing.severity = highestSeverity(existing.severity, e.severity);
    } else {
      sources.set(ip, { lat: geo.lat, lng: geo.lng, label: geo.label, severity: e.severity, count: 1 });
    }
  }

  const points: GeoPoint[] = [
    {
      id: "hq",
      lat: HQ.lat,
      lng: HQ.lng,
      label: `${HQ.label} — ${internalCount} internal event(s)`,
      severity: internalSeverity,
      count: internalCount,
      kind: "hq",
    },
  ];
  const arcs: GeoArc[] = [];

  for (const [ip, s] of sources) {
    points.push({ id: ip, lat: s.lat, lng: s.lng, label: `${s.label} — ${s.count} event(s)`, severity: s.severity, count: s.count, kind: "source" });
    arcs.push({
      startLat: s.lat,
      startLng: s.lng,
      endLat: HQ.lat,
      endLng: HQ.lng,
      severity: s.severity,
      label: `${s.label} → HQ (${s.count})`,
    });
  }

  return { points, arcs };
}

export const SEVERITY_HEX: Record<Severity, string> = {
  CRITICAL: "#ff5252",
  HIGH: "#ff9838",
  MEDIUM: "#ffd24a",
  LOW: "#8aa0b6",
};
