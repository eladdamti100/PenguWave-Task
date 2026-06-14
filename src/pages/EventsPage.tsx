import { useMemo, useState } from "react";
import type { Severity } from "../types";
import { useEvents } from "../hooks/useEvents";
import { useTriage, type TriageStatus, TRIAGE_LABEL } from "../hooks/useTriage";
import {
  SEVERITY_ORDER,
  compareSeverity,
  formatTimestamp,
  type NormalizedEvent,
} from "../lib/events";
import { toCsv, downloadFile, type CsvColumn } from "../utils";
import Overview from "../components/Overview";
import EventDetail from "../components/EventDetail";
import SeverityBadge from "../components/SeverityBadge";

type SortKey = "timestamp" | "severity" | "title" | "assetHostname";
type SortDir = "asc" | "desc";
type StatusFilter = TriageStatus | "ALL";

const ALL_SEVERITIES = new Set<Severity>(SEVERITY_ORDER);

const CSV_COLUMNS: CsvColumn<NormalizedEvent>[] = [
  { header: "id", value: (e) => e.id },
  { header: "timestamp", value: (e) => e.timestamp },
  { header: "severity", value: (e) => e.rawSeverity },
  { header: "title", value: (e) => e.title },
  { header: "description", value: (e) => e.description },
  { header: "assetHostname", value: (e) => e.assetHostname },
  { header: "assetIp", value: (e) => e.assetIp },
  { header: "sourceIp", value: (e) => e.sourceIp ?? "" },
  { header: "userId", value: (e) => e.userId ?? "" },
  { header: "tags", value: (e) => e.tags.join("; ") },
];

export default function EventsPage() {
  const { events, loading, error } = useEvents();
  const triage = useTriage(events);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(ALL_SEVERITIES);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<NormalizedEvent | null>(null);

  const { statusOf } = triage;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = events.filter((e) => {
      if (!severityFilter.has(e.severity)) return false;
      if (statusFilter !== "ALL" && statusOf(e) !== statusFilter) return false;
      if (tagFilter && !e.tags.includes(tagFilter)) return false;
      if (!q) return true;
      // Null-safe: every searched field is a guaranteed string on NormalizedEvent.
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.assetHostname.toLowerCase().includes(q) ||
        (e.sourceIp ?? "").toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "severity":
          cmp = compareSeverity(a.severity, b.severity);
          break;
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "assetHostname":
          cmp = a.assetHostname.localeCompare(b.assetHostname);
          break;
        case "timestamp":
          // Invalid/missing dates sort to the bottom regardless of direction.
          if (!a.date && !b.date) cmp = 0;
          else if (!a.date) return 1;
          else if (!b.date) return -1;
          else cmp = a.date.getTime() - b.date.getTime();
          break;
      }
      return cmp * dir;
    });
  }, [events, search, severityFilter, statusFilter, statusOf, tagFilter, sortKey, sortDir]);

  const toggleSeverity = (sev: Severity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      // Never leave the table with zero severities selected — reset to all.
      return next.size === 0 ? new Set(ALL_SEVERITIES) : next;
    });
  };

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "timestamp" || key === "severity" ? "desc" : "asc");
    }
  };

  const sortIndicator = (key: SortKey) => (key === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const exportCsv = () => {
    if (filtered.length === 0) return;
    downloadFile(`penguwave_events_${filtered.length}.csv`, toCsv(filtered, CSV_COLUMNS), "text/csv;charset=utf-8");
  };
  const exportJson = () => {
    if (filtered.length === 0) return;
    downloadFile(`penguwave_events_${filtered.length}.json`, JSON.stringify(filtered, null, 2), "application/json");
  };

  const hasActiveFilters =
    search.trim() !== "" || tagFilter !== null || statusFilter !== "ALL" || severityFilter.size !== SEVERITY_ORDER.length;
  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setStatusFilter("ALL");
    setSeverityFilter(new Set(ALL_SEVERITIES));
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Security Operations</h1>
        <p className="muted">Loading events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <h1>Security Operations</h1>
        <div className="banner banner-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Security Operations</h1>

      <Overview
        events={events}
        triage={triage}
        onSelectSeverity={(sev) => setSeverityFilter(new Set([sev]))}
        onSelectStatus={(s) => setStatusFilter(s)}
        onSelectTag={(tag) => setTagFilter(tag)}
        onSelectIp={(ip) => setSearch(ip)}
        onOpenEvent={(e) => setSelected(e)}
      />

      <h2 className="section-title">Event stream</h2>
      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search title, description, host, IP, tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="severity-toggles">
          {SEVERITY_ORDER.map((sev) => (
            <button
              key={sev}
              type="button"
              className={`sev-toggle sev-${sev.toLowerCase()} ${severityFilter.has(sev) ? "on" : "off"}`}
              aria-pressed={severityFilter.has(sev)}
              onClick={() => toggleSeverity(sev)}
            >
              {sev}
            </button>
          ))}
        </div>
        <select
          className="status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filter by triage status"
        >
          <option value="ALL">All statuses</option>
          <option value="new">New</option>
          <option value="ack">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <div className="toolbar-actions">
          <button onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </button>
          <button onClick={exportJson} disabled={filtered.length === 0}>
            Export JSON
          </button>
        </div>
      </div>

      <div className="result-meta">
        <span>
          {filtered.length} of {events.length} events
        </span>
        {tagFilter && (
          <button className="filter-pill" onClick={() => setTagFilter(null)}>
            tag: {tagFilter} ✕
          </button>
        )}
        {statusFilter !== "ALL" && (
          <button className="filter-pill" onClick={() => setStatusFilter("ALL")}>
            {TRIAGE_LABEL[statusFilter]} ✕
          </button>
        )}
        {hasActiveFilters && (
          <button className="link-btn" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No events match your filters.</p>
          {hasActiveFilters && (
            <button className="link-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => sortBy("severity")}>
                  Severity{sortIndicator("severity")}
                </th>
                <th>Status</th>
                <th className="sortable" onClick={() => sortBy("title")}>
                  Title{sortIndicator("title")}
                </th>
                <th className="sortable" onClick={() => sortBy("assetHostname")}>
                  Asset{sortIndicator("assetHostname")}
                </th>
                <th>Source IP</th>
                <th className="sortable" onClick={() => sortBy("timestamp")}>
                  Timestamp{sortIndicator("timestamp")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const status = statusOf(event);
                return (
                  <tr
                    key={event.id}
                    className="event-row"
                    onClick={() => setSelected(event)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(event);
                      }
                    }}
                  >
                    <td>
                      <SeverityBadge severity={event.severity} raw={event.rawSeverity} />
                    </td>
                    <td>
                      <span className={`triage-chip triage-${status}`}>{TRIAGE_LABEL[status]}</span>
                    </td>
                    <td>{event.title}</td>
                    <td className="mono">{event.assetHostname || "—"}</td>
                    <td className="mono">{event.sourceIp ?? "—"}</td>
                    <td className="nowrap">{formatTimestamp(event)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <EventDetail
          event={selected}
          status={statusOf(selected)}
          onSetStatus={(s) => triage.setStatus(selected.id, s)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
