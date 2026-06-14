import { Link, useLocation } from "react-router-dom";
import type { User } from "../types";

interface NavbarProps {
  user: User | null;
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Navbar({ user, isAdmin, onLoginClick, onLogout }: NavbarProps) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/events" style={{ textDecoration: "none", color: "inherit" }}>
          PenguWave 🐧
        </Link>
      </div>
      <div className="navbar-links">
        {user && (
          <Link to="/events" className={location.pathname.startsWith("/events") ? "active" : ""}>
            Events
          </Link>
        )}
        {/* Users link only appears for admins. */}
        {user && isAdmin && (
          <Link to="/users" className={location.pathname === "/users" ? "active" : ""}>
            Users
          </Link>
        )}
        {user ? (
          <>
            <span className="navbar-user" title={`Role: ${user.role}`}>
              {user.email} <span className="role-tag">{user.role}</span>
            </span>
            <button onClick={onLogout} className="navbar-login-btn">
              Logout
            </button>
          </>
        ) : (
          <button onClick={onLoginClick} className="navbar-login-btn">
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
