import { useCallback, useMemo, useState } from "react";
import type { NormalizedEvent } from "../lib/events";

export type TriageStatus = "new" | "ack" | "resolved";

export const TRIAGE_LABEL: Record<TriageStatus, string> = {
  new: "New",
  ack: "Acknowledged",
  resolved: "Resolved",
};

const STORAGE_KEY = "pw_triage";

/**
 * Seed a realistic starting status from severity, since the mock events carry no
 * triage state: high-urgency events land in the queue as "new", medium are
 * "acknowledged", routine low-severity is "resolved". Analyst actions override this.
 */
function seedStatus(event: NormalizedEvent): TriageStatus {
  if (event.severity === "CRITICAL" || event.severity === "HIGH") return "new";
  if (event.severity === "MEDIUM") return "ack";
  return "resolved";
}

function readOverrides(): Record<string, TriageStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TriageStatus>) : {};
  } catch {
    return {};
  }
}

export interface TriageApi {
  statusOf: (event: NormalizedEvent) => TriageStatus;
  setStatus: (id: string, status: TriageStatus) => void;
  reset: () => void;
  counts: { new: number; ack: number; resolved: number; open: number };
}

/** Per-event triage status with localStorage-persisted analyst overrides. */
export function useTriage(events: NormalizedEvent[]): TriageApi {
  const [overrides, setOverrides] = useState<Record<string, TriageStatus>>(readOverrides);

  const statusOf = useCallback(
    (event: NormalizedEvent): TriageStatus => overrides[event.id] ?? seedStatus(event),
    [overrides]
  );

  const setStatus = useCallback((id: string, status: TriageStatus) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: status };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Clear all analyst overrides → every event reverts to its seeded status.
  const reset = useCallback(() => {
    setOverrides({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const counts = useMemo(() => {
    let n = 0;
    let a = 0;
    let r = 0;
    for (const e of events) {
      const s = overrides[e.id] ?? seedStatus(e);
      if (s === "new") n++;
      else if (s === "ack") a++;
      else r++;
    }
    return { new: n, ack: a, resolved: r, open: n + a };
  }, [events, overrides]);

  return { statusOf, setStatus, reset, counts };
}
