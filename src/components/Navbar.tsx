import { Link, useLocation } from "react-router-dom";
import type { User } from "../types";
import type { Theme } from "../theme/useTheme";

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function Navbar({ user, isAdmin, theme, onToggleTheme, onLogout }: NavbarProps) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/events" className="navbar-brand">
          <span className="brand-mark">🐧</span>
          <span className="brand-name">
            PenguWave <span className="brand-sub">SOC</span>
          </span>
        </Link>
        {user && (
          <div className="nav-tabs">
            <Link to="/events" className={`nav-tab ${location.pathname.startsWith("/events") ? "active" : ""}`}>
              Events
            </Link>
            {isAdmin && (
              <Link to="/users" className={`nav-tab ${location.pathname === "/users" ? "active" : ""}`}>
                Users
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="navbar-right">
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {user && (
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {initials(user.email)}
            </span>
            <span className="user-meta">
              <span className="user-email">{user.email}</span>
              <span className="role-tag">{user.role}</span>
            </span>
            <button onClick={onLogout} className="btn-ghost">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
