import type { Severity, SecurityEvent } from "../types";

/** Canonical severity ranking, highest first. Used for sorting and display order. */
export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const KNOWN_SEVERITIES = new Set<string>(SEVERITY_ORDER);

/**
 * A defensively-normalized event. The mock data is intentionally messy
 * (null IPs, empty descriptions, severities outside the known set), so the UI
 * works exclusively with this shape — never the raw record.
 */
export interface NormalizedEvent {
  id: string;
  title: string;
  description: string;
  severity: Severity; // bucketed into a known value for filtering/coloring
  rawSeverity: string; // original label, preserved for display/audit
  assetHostname: string;
  assetIp: string;
  sourceIp: string | null;
  tags: string[];
  userId: string | null;
  timestamp: string; // raw string, kept as-is
  date: Date | null; // parsed; null when the timestamp is missing/invalid
}

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const nullableStr = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;

function normalizeSeverity(v: unknown): { severity: Severity; rawSeverity: string } {
  const raw = str(v);
  const upper = raw.toUpperCase();
  // Unknown severities are surfaced (rawSeverity) but bucketed as LOW so they
  // never masquerade as a higher priority than we can verify.
  return { severity: (KNOWN_SEVERITIES.has(upper) ? upper : "LOW") as Severity, rawSeverity: raw || "UNKNOWN" };
}

function parseDate(ts: string): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Coerce a single raw record into a safe, fully-populated NormalizedEvent. */
export function normalizeEvent(raw: Partial<SecurityEvent> & Record<string, unknown>, index: number): NormalizedEvent {
  const { severity, rawSeverity } = normalizeSeverity(raw.severity);
  const timestamp = str(raw.timestamp);
  return {
    id: str(raw.id) || `unknown-${index}`,
    title: str(raw.title) || "(untitled event)",
    description: str(raw.description),
    severity,
    rawSeverity,
    assetHostname: str(raw.assetHostname),
    assetIp: str(raw.assetIp),
    sourceIp: nullableStr(raw.sourceIp),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === "string") : [],
    userId: nullableStr(raw.userId),
    timestamp,
    date: parseDate(timestamp),
  };
}

/** Normalize a raw array, tolerating a non-array input. */
export function normalizeEvents(raw: unknown): NormalizedEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r, i) => normalizeEvent(r as Partial<SecurityEvent> & Record<string, unknown>, i));
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

// --- Dashboard selectors (pure functions, reused by Overview + table) ---

/** Counts per severity, always returned in SEVERITY_ORDER (zeros included). */
export function countsBySeverity(events: NormalizedEvent[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const e of events) counts[e.severity]++;
  return counts;
}

function topBy(values: string[], limit: number): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function topHosts(events: NormalizedEvent[], limit = 5) {
  return topBy(events.map((e) => e.assetHostname), limit);
}

export function topTags(events: NormalizedEvent[], limit = 8) {
  return topBy(events.flatMap((e) => e.tags), limit);
}

/** Events bucketed by calendar day (YYYY-MM-DD), sorted ascending. Skips invalid dates. */
export function eventsByDay(events: NormalizedEvent[]): { day: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.date) continue;
    const day = e.date.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return [...map.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day));
}

/** Safe, human-readable timestamp. Returns a clear marker for missing/invalid dates. */
export function formatTimestamp(event: Pick<NormalizedEvent, "date" | "timestamp">): string {
  if (event.date) return event.date.toLocaleString();
  return event.timestamp ? `Invalid date (${event.timestamp})` : "—";
}

// --- SOC operational selectors ---

/** The most recent valid event time — our "now" reference for relative windows. */
export function latestDate(events: NormalizedEvent[]): Date | null {
  let latest: Date | null = null;
  for (const e of events) {
    if (e.date && (!latest || e.date > latest)) latest = e.date;
  }
  return latest;
}

/** Count events within `hours` before the reference time (default: latest event). */
export function countWithinHours(events: NormalizedEvent[], hours: number, ref?: Date | null): number {
  const end = ref ?? latestDate(events);
  if (!end) return 0;
  const start = end.getTime() - hours * 3600_000;
  return events.filter((e) => e.date && e.date.getTime() > start && e.date.getTime() <= end.getTime()).length;
}

const PRIVATE_RE = /^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

/** External (non-RFC1918, valid IPv4) source — i.e. a potential outside attacker. */
export function isExternalIp(ip: string | null): boolean {
  return !!ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && !PRIVATE_RE.test(ip);
}

/** Most active external source IPs ("top talkers"), with their worst severity. */
export function topAttackers(events: NormalizedEvent[], limit = 5): { ip: string; count: number; worst: Severity }[] {
  const map = new Map<string, { count: number; worst: Severity }>();
  for (const e of events) {
    if (!isExternalIp(e.sourceIp)) continue;
    const ip = e.sourceIp as string;
    const cur = map.get(ip);
    if (cur) {
      cur.count++;
      if (compareSeverity(e.severity, cur.worst) < 0) cur.worst = e.severity;
    } else {
      map.set(ip, { count: 1, worst: e.severity });
    }
  }
  return [...map.entries()]
    .map(([ip, v]) => ({ ip, ...v }))
    .sort((a, b) => b.count - a.count || compareSeverity(a.worst, b.worst))
    .slice(0, limit);
}

/** Compact relative time ("3h ago", "2d ago") against the latest-event reference. */
export function relativeTime(date: Date | null, ref: Date | null): string {
  if (!date || !ref) return "—";
  const diff = ref.getTime() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
