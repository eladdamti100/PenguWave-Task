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
