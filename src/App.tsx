import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import LoginView from "./components/LoginView";
import EventsPage from "./pages/EventsPage";
import UsersPage from "./pages/UsersPage";
import NotFound from "./pages/NotFound";
import { useAuth } from "./auth/AuthContext";
import { useTheme } from "./theme/useTheme";

function App() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) {
    return (
      <>
        <Navbar user={null} isAdmin={false} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />
        <div className="container">
          <LoginView />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} isAdmin={isAdmin} theme={theme} onToggleTheme={toggleTheme} onLogout={logout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventsPage />} />
          {/* User management is admin-only. Non-admins (incl. guest viewers) are
              redirected away. This is a UX guard; the backend must enforce the real boundary. */}
          <Route path="/users" element={isAdmin ? <UsersPage /> : <Navigate to="/events" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
