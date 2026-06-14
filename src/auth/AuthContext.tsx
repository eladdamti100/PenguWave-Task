import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "../types";
import { mockLogin } from "./mockAuth";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
}

// Read-only guest session. Maps to the lowest-privilege role (viewer), so a
// guest can browse the events dashboard but never reach admin-only surfaces.
const GUEST_USER: User = { id: "guest", email: "guest@penguwave.io", role: "viewer", status: "active" };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "pw_user";

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  // Keep localStorage in sync so a refresh preserves the session.
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    // Demo auth. To go live, replace `mockLogin` with `api.login` from src/api.ts.
    const { token, user: authedUser } = await mockLogin(email, password);
    localStorage.setItem("token", token);
    setUser(authedUser);
  }, []);

  const loginAsGuest = useCallback(() => {
    localStorage.setItem("token", "guest");
    setUser(GUEST_USER);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === "admin", login, loginAsGuest, logout }),
    [user, login, loginAsGuest, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
