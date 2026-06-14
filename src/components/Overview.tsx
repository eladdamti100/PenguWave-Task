import { Suspense, lazy } from "react";
import type { Severity } from "../types";
import {
  topTags,
  topAttackers,
  countWithinHours,
  latestDate,
  relativeTime,
  formatTimestamp,
  type NormalizedEvent,
} from "../lib/events";
import { type TriageApi, type TriageStatus, TRIAGE_LABEL } from "../hooks/useTriage";
import SeverityBadge from "./SeverityBadge";

// Code-split the 3D globe so it never blocks the rest of the dashboard.
const ThreatGlobe = lazy(() => import("./ThreatGlobe"));

interface OverviewProps {
  events: NormalizedEvent[];
  triage: TriageApi;
  onSelectSeverity: (severity: Severity) => void;
  onSelectStatus: (status: TriageStatus) => void;
  onSelectTag: (tag: string) => void;
  onSelectIp: (ip: string) => void;
  onOpenEvent: (event: NormalizedEvent) => void;
}

export default function Overview({
  events,
  triage,
  onSelectSeverity,
  onSelectStatus,
  onSelectTag,
  onSelectIp,
  onOpenEvent,
}: OverviewProps) {
  const ref = latestDate(events);
  // The globe mirrors the open triage queue: every event that isn't resolved.
  // It updates live as analysts acknowledge/resolve events.
  const globeEvents = events.filter((e) => triage.statusOf(e) !== "resolved");
  const openCritical = events.filter((e) => e.severity === "CRITICAL" && triage.statusOf(e) !== "resolved").length;
  const openHigh = events.filter((e) => e.severity === "HIGH" && triage.statusOf(e) !== "resolved").length;
  const last24 = countWithinHours(events, 24, ref);
  const prev24 = countWithinHours(events, 48, ref) - last24;
  const tags = topTags(events, 6);
  const attackers = topAttackers(events, 5);

  return (
    <section className="overview" aria-label="SOC overview">
      <PostureBanner openCritical={openCritical} openHigh={openHigh} onSelectSeverity={onSelectSeverity} />

      <div className="kpi-row soc-kpis">
        <KpiTile label="OPEN CRITICAL" value={openCritical} tone="critical" onClick={() => onSelectSeverity("CRITICAL")} />
        <KpiTile label="OPEN HIGH" value={openHigh} tone="high" onClick={() => onSelectSeverity("HIGH")} />
        <KpiTile label="UNACKNOWLEDGED" value={triage.counts.new} tone="accent" onClick={() => onSelectStatus("new")} />
        <KpiTile label="LAST 24H" value={last24} tone="muted" trend={last24 - prev24} />
        <KpiTile label="RESOLVED" value={triage.counts.resolved} tone="ok" onClick={() => onSelectStatus("resolved")} />
      </div>

      {globeEvents.length > 0 ? (
        <Suspense fallback={<div className="globe-card globe-loading">Initializing threat map…</div>}>
          <ThreatGlobe
            events={globeEvents}
            subtitle={`${globeEvents.length} open event${globeEvents.length === 1 ? "" : "s"} — live attack sources → assets`}
          />
        </Suspense>
      ) : (
        <div className="globe-card globe-loading">🎉 No open threats — the queue is clear.</div>
      )}

      <div className="soc-grid">
        <TriageQueue events={events} triage={triage} refDate={ref} onOpenEvent={onOpenEvent} />

        <div className="soc-side">
          <div className="panel">
            <h3>Top attackers (external)</h3>
            {attackers.length === 0 ? (
              <p className="muted">No external sources.</p>
            ) : (
              <ul className="rank-list">
                {attackers.map((a) => (
                  <li key={a.ip}>
                    <button className="attacker-ip" onClick={() => onSelectIp(a.ip)} title={`Filter to ${a.ip}`}>
                      <SeverityBadge severity={a.worst} />
                      <span className="mono">{a.ip}</span>
                    </button>
                    <span className="rank-count">{a.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h3>Top tags</h3>
            {tags.length === 0 ? (
              <p className="muted">No tags.</p>
            ) : (
              <div className="tag-cloud">
                {tags.map((t) => (
                  <button key={t.key} className="tag-chip" onClick={() => onSelectTag(t.key)} title={`Filter to "${t.key}"`}>
                    {t.key} <span className="tag-count">{t.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PostureBanner({
  openCritical,
  openHigh,
  onSelectSeverity,
}: {
  openCritical: number;
  openHigh: number;
  onSelectSeverity: (s: Severity) => void;
}) {
  if (openCritical > 0) {
    return (
      <div className="posture posture-critical">
        <span className="posture-pulse" aria-hidden="true" />
        <strong>{openCritical} critical event{openCritical > 1 ? "s" : ""} need attention</strong>
        <span className="muted">Immediate triage required</span>
        <button className="btn-primary sm" onClick={() => onSelectSeverity("CRITICAL")}>
          Triage now →
        </button>
      </div>
    );
  }
  if (openHigh > 0) {
    return (
      <div className="posture posture-high">
        <span className="posture-pulse" aria-hidden="true" />
        <strong>{openHigh} high-severity event{openHigh > 1 ? "s" : ""} open</strong>
        <span className="muted">Review when able</span>
        <button className="btn-primary sm" onClick={() => onSelectSeverity("HIGH")}>
          Review →
        </button>
      </div>
    );
  }
  return (
    <div className="posture posture-ok">
      <span className="posture-pulse" aria-hidden="true" />
      <strong>All clear</strong>
      <span className="muted">No open critical or high-severity events</span>
    </div>
  );
}

type Tone = "critical" | "high" | "accent" | "ok" | "muted";

function KpiTile({
  label,
  value,
  tone,
  trend,
  onClick,
}: {
  label: string;
  value: number;
  tone: Tone;
  trend?: number;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`kpi-card soc-tile tone-${tone}`} onClick={onClick} title={onClick ? `Filter: ${label}` : undefined}>
      <span className="kpi-count">{value}</span>
      <span className="kpi-label">{label}</span>
      {trend !== undefined && trend !== 0 && (
        <span className={`kpi-trend ${trend > 0 ? "up" : "down"}`}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend)} vs prev 24h
        </span>
      )}
    </Tag>
  );
}

function TriageQueue({
  events,
  triage,
  refDate,
  onOpenEvent,
}: {
  events: NormalizedEvent[];
  triage: TriageApi;
  refDate: Date | null;
  onOpenEvent: (event: NormalizedEvent) => void;
}) {
  const severityRank: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const queue = events
    .filter((e) => triage.statusOf(e) !== "resolved")
    .sort((a, b) => {
      const s = severityRank[a.severity] - severityRank[b.severity];
      if (s !== 0) return s;
      return (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);
    })
    .slice(0, 7);

  return (
    <div className="panel triage-panel">
      <div className="triage-head">
        <h3>Triage queue</h3>
        <div className="triage-head-right">
          <span className="muted">{triage.counts.open} open</span>
          <button
            className="link-btn"
            onClick={() => {
              if (window.confirm("Reset all triage? Every event returns to its starting open state.")) triage.reset();
            }}
            title="Re-open everything you acknowledged or resolved"
          >
            ↺ Reset
          </button>
        </div>
      </div>
      {queue.length === 0 ? (
        <div className="empty-state" style={{ padding: 32 }}>
          <p>🎉 Queue clear — nothing open.</p>
        </div>
      ) : (
        <ul className="triage-list">
          {queue.map((e) => {
            const status = triage.statusOf(e);
            return (
              <li key={e.id} className="triage-item">
                <button className="triage-main" onClick={() => onOpenEvent(e)}>
                  <SeverityBadge severity={e.severity} raw={e.rawSeverity} />
                  <span className="triage-title">{e.title}</span>
                  <span className="triage-meta mono">
                    {e.assetHostname || "—"} · {relativeTime(e.date, refDate)}
                  </span>
                </button>
                <div className="triage-actions">
                  <span className={`triage-chip triage-${status}`}>{TRIAGE_LABEL[status]}</span>
                  {status === "new" && (
                    <button className="link-btn" onClick={() => triage.setStatus(e.id, "ack")} title="Acknowledge">
                      Ack
                    </button>
                  )}
                  {status !== "resolved" && (
                    <button className="link-btn" onClick={() => triage.setStatus(e.id, "resolved")} title="Resolve">
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted triage-foot">{formatTimestamp({ date: refDate, timestamp: "" })} · latest event</p>
    </div>
  );
}
