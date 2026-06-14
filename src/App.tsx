import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginModal from "./components/LoginModal";
import EventsPage from "./pages/EventsPage";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";
import { useAuth } from "./auth/AuthContext";

function App() {
  const { user, isAdmin, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <Navbar
        user={user}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onLogout={logout}
      />
      <div className="container">
        {!user ? (
          <div className="signin-gate">
            <h1>Welcome to PenguWave 🐧</h1>
            <p className="muted">Sign in to view the security operations dashboard.</p>
            <button className="btn-primary" onClick={() => setShowLogin(true)}>
              Sign In
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/events" replace />} />
            <Route path="/events" element={<EventsPage />} />
            {/* User management is admin-only. Non-admins are redirected away.
                This is a UX guard; the backend must enforce the real boundary. */}
            <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/events" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

export default App;
