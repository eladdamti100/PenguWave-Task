import type { Severity } from "../types";

interface SeverityBadgeProps {
  severity: Severity;
  /** Original label from the data; shown when it differs from the bucketed severity. */
  raw?: string;
}

/** Colored severity pill. Falls back gracefully for unexpected raw values. */
export default function SeverityBadge({ severity, raw }: SeverityBadgeProps) {
  const showRaw = raw && raw.toUpperCase() !== severity;
  return (
    <span className={`badge sev-${severity.toLowerCase()}`} title={showRaw ? `Original: ${raw}` : undefined}>
      {showRaw ? raw : severity}
    </span>
  );
}
