import { formatTimestamp, type NormalizedEvent } from "../lib/events";
import { TRIAGE_LABEL, type TriageStatus } from "../hooks/useTriage";
import SeverityBadge from "./SeverityBadge";
import "../styles/auth-ui.css";

interface EventDetailProps {
  event: NormalizedEvent;
  status: TriageStatus;
  onSetStatus: (status: TriageStatus) => void;
  onClose: () => void;
}

/** Slide-over panel with the full details of a single event. */
export default function EventDetail({ event, status, onSetStatus, onClose }: EventDetailProps) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={event.title}>
        <header className="drawer-header">
          <div>
            <SeverityBadge severity={event.severity} raw={event.rawSeverity} />
            <h2>{event.title}</h2>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close details">
            ✕
          </button>
        </header>

        <div className="triage-bar">
          <span className={`triage-chip triage-${status}`}>{TRIAGE_LABEL[status]}</span>
          <div className="triage-bar-actions">
            <button
              className="vb-btn vb-btn-ghost vb-btn-sm"
              disabled={status === "ack"}
              onClick={() => onSetStatus("ack")}
            >
              Acknowledge
            </button>
            <button
              className="vb-btn vb-btn-ghost vb-btn-sm"
              disabled={status === "resolved"}
              onClick={() => onSetStatus("resolved")}
            >
              Resolve
            </button>
            {status !== "new" && (
              <button className="vb-btn vb-btn-ghost vb-btn-sm" onClick={() => onSetStatus("new")}>
                Reopen
              </button>
            )}
          </div>
        </div>

        <dl className="detail-grid">
          <dt>Event ID</dt>
          <dd className="mono">{event.id}</dd>

          <dt>Timestamp</dt>
          <dd>{formatTimestamp(event)}</dd>

          <dt>Asset</dt>
          <dd className="mono">
            {event.assetHostname || "—"}
            {event.assetIp ? ` (${event.assetIp})` : ""}
          </dd>

          <dt>Source IP</dt>
          <dd className="mono">{event.sourceIp ?? "—"}</dd>

          <dt>User</dt>
          <dd className="mono">{event.userId ?? "—"}</dd>

          <dt>Tags</dt>
          <dd>
            {event.tags.length > 0 ? (
              <span className="tag-cloud">
                {event.tags.map((t) => (
                  <span className="tag-chip static" key={t}>
                    {t}
                  </span>
                ))}
              </span>
            ) : (
              "—"
            )}
          </dd>
        </dl>

        <h3>Description</h3>
        {/* Rendered as plain text — descriptions are untrusted data and must never be injected as HTML. */}
        <p className="detail-description">{event.description || <span className="muted">(no description provided)</span>}</p>

        <h3>Raw event</h3>
        <pre className="raw-json">{JSON.stringify(event, null, 2)}</pre>
      </aside>
    </>
  );
}
