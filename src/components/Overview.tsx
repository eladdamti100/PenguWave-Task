import type { Severity } from "../types";
import {
  SEVERITY_ORDER,
  countsBySeverity,
  topHosts,
  topTags,
  eventsByDay,
  type NormalizedEvent,
} from "../lib/events";

interface OverviewProps {
  events: NormalizedEvent[];
  /** Clicking a severity card filters the table to that severity. */
  onSelectSeverity: (severity: Severity) => void;
  /** Clicking a tag filters the table to that tag. */
  onSelectTag: (tag: string) => void;
}

export default function Overview({ events, onSelectSeverity, onSelectTag }: OverviewProps) {
  const counts = countsBySeverity(events);
  const hosts = topHosts(events);
  const tags = topTags(events);
  const byDay = eventsByDay(events);
  const maxDay = byDay.reduce((m, d) => Math.max(m, d.count), 0);

  return (
    <section className="overview" aria-label="Events overview">
      <div className="kpi-row">
        {SEVERITY_ORDER.map((sev) => (
          <button
            key={sev}
            type="button"
            className={`kpi-card sev-${sev.toLowerCase()}`}
            onClick={() => onSelectSeverity(sev)}
            title={`Filter to ${sev} events`}
          >
            <span className="kpi-count">{counts[sev]}</span>
            <span className="kpi-label">{sev}</span>
          </button>
        ))}
        <div className="kpi-card kpi-total">
          <span className="kpi-count">{events.length}</span>
          <span className="kpi-label">TOTAL</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="panel">
          <h3>Events over time</h3>
          {byDay.length === 0 ? (
            <p className="muted">No dated events.</p>
          ) : (
            <div className="timeline" role="img" aria-label="Events per day">
              {byDay.map((d) => (
                <div className="timeline-col" key={d.day} title={`${d.day}: ${d.count} event(s)`}>
                  <div
                    className="timeline-bar"
                    style={{ height: `${maxDay ? (d.count / maxDay) * 100 : 0}%` }}
                  />
                  <span className="timeline-label">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Top affected hosts</h3>
          {hosts.length === 0 ? (
            <p className="muted">No host data.</p>
          ) : (
            <ul className="rank-list">
              {hosts.map((h) => (
                <li key={h.key}>
                  <span className="rank-name" title={h.key}>
                    {h.key || "(unknown host)"}
                  </span>
                  <span className="rank-count">{h.count}</span>
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
                <button
                  key={t.key}
                  type="button"
                  className="tag-chip"
                  onClick={() => onSelectTag(t.key)}
                  title={`Filter to "${t.key}"`}
                >
                  {t.key} <span className="tag-count">{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
