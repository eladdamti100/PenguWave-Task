import type { User } from "../types";

/**
 * DEMO-ONLY auth.
 *
 * This file exists purely so the frontend can be demoed end-to-end without the
 * Track A backend. In a real system, credentials are NEVER shipped to the client:
 * the server verifies a hashed password and returns a token. Swapping this for
 * the real `api.login()` is a one-line change in AuthContext.
 *
 * Roles drive what the UI exposes (e.g. only `admin` sees User Management) — but
 * this is a UX affordance, not a security boundary. Real authorization must be
 * enforced server-side.
 */
interface DemoAccount extends User {
  password: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "usr-001", email: "admin@penguwave.io", role: "admin", status: "active", password: "admin123" },
  { id: "usr-002", email: "analyst@penguwave.io", role: "analyst", status: "active", password: "analyst123" },
  { id: "usr-003", email: "viewer@penguwave.io", role: "viewer", status: "disabled", password: "viewer123" },
];

/** The demo credentials, surfaced in the login modal as a convenience hint. */
export const DEMO_HINT = "admin@penguwave.io / admin123";

/** Active demo accounts offered as one-click "fill" buttons on the login screen. */
export const DEMO_LOGINS = DEMO_ACCOUNTS.filter((a) => a.status === "active").map((a) => ({
  label: a.role,
  email: a.email,
  password: a.password,
}));

export interface MockLoginResult {
  token: string;
  user: User;
}

/** Resolves with a public user (no password) or rejects with a user-facing message. */
export function mockLogin(email: string, password: string): Promise<MockLoginResult> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!account || account.password !== password) {
        reject(new Error("Invalid email or password"));
        return;
      }
      if (account.status !== "active") {
        reject(new Error("This account is disabled"));
        return;
      }
      const { password: _pw, ...user } = account;
      void _pw;
      resolve({ token: `demo-${account.id}-${email.length}`, user });
    }, 300);
  });
}
