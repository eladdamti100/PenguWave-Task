import type { User } from "./types";

const API_URL = "http://localhost:3001";

// NOTE: there is intentionally no API key in this file.
// A frontend bundle ships to the browser, so anything embedded here is public —
// service credentials and secrets must live only on the server. The starter had
// a hardcoded `pw_live_sk_...` key here; it has been removed.

/** Throw a consistent Error from a failed response, using the API's `{ error }` body when present. */
async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    /* non-JSON error body — keep the generic message */
  }
  throw new Error(message);
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LoginResult {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  // Credentials are never logged.
  const res = await ensureOk(
    await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", headers: authHeaders() });
}

// Authorization is enforced by the backend; the token identifies the caller.
export async function getEvents() {
  const res = await ensureOk(await fetch(`${API_URL}/api/events`, { headers: authHeaders() }));
  return res.json();
}

export async function getUsers(): Promise<User[]> {
  const res = await ensureOk(await fetch(`${API_URL}/api/users`, { headers: authHeaders() }));
  return res.json();
}

export async function createUser(user: { email: string; password: string; role: string }): Promise<User> {
  const res = await ensureOk(
    await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(user),
    })
  );
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  await ensureOk(await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE", headers: authHeaders() }));
}
