export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Raw event shape as it appears in the mock data — fields may be missing or null. */
export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: Severity;
  title: string;
  description: string;
  assetHostname: string;
  assetIp: string;
  sourceIp: string | null;
  tags: string[];
  userId: string | null;
}

/**
 * User as the client should see it. Passwords never belong in the frontend —
 * they are not part of any API response the UI consumes.
 */
export interface User {
  id: string;
  email: string;
  role: string;
  status: string;
}
