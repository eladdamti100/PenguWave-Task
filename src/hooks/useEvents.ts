import { useEffect, useState } from "react";
import rawEvents from "../../data/mock_events.json";
import { normalizeEvents, type NormalizedEvent } from "../lib/events";

interface UseEventsResult {
  events: NormalizedEvent[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads and normalizes the security events.
 *
 * Today this reads the bundled mock data; the small async delay exercises the
 * loading state so swapping in a real `GET /api/events` fetch later is a
 * one-line change with no UI rework.
 */
export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        setEvents(normalizeEvents(rawEvents));
      } catch {
        setError("Failed to load security events.");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { events, loading, error };
}
