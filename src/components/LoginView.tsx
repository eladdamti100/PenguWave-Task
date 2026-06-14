import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { DEMO_LOGINS } from "../auth/mockAuth";
import "../styles/auth-ui.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Full-page sign-in (Premium SaaS design) wired to the real auth context. */
export default function LoginView() {
  const { login, loginAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const fillCredentials = (demoEmail: string, demoPassword: string): void => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  const copyValue = async (value: string, key: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both your email and password.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("That email address doesn't look right.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      // On success the app re-renders with a user and this view unmounts.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="vb-login">
      <form className="vb-login-card" onSubmit={handleSubmit} noValidate>
        <div className="vb-login-brand">
          <div className="vb-logo" aria-hidden="true">🐧</div>
          <div className="vb-login-headings">
            <span className="vb-login-title">Welcome to PenguWave</span>
            <span className="vb-login-sub">Sign in to your security workspace</span>
          </div>
        </div>

        <div className="vb-field">
          <label className="vb-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className={`vb-input${error && !email.trim() ? " vb-input-error" : ""}`}
            type="email"
            autoComplete="email"
            placeholder="you@penguwave.io"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="vb-field">
          <label className="vb-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className={`vb-input${error && !password.trim() ? " vb-input-error" : ""}`}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <div className="vb-error" role="alert">
            <span aria-hidden="true">⚠</span> {error}
          </div>
        ) : null}

        <button className="vb-btn vb-btn-primary vb-btn-block" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="vb-spinner" aria-hidden="true" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <div className="vb-divider">or</div>

        <button
          className="vb-btn vb-btn-ghost vb-btn-block"
          type="button"
          disabled={loading}
          onClick={loginAsGuest}
        >
          👁 Continue as guest (read-only)
        </button>

        <div className="vb-demo">
          <span className="vb-demo-label">Demo accounts — click to fill, or copy:</span>
          {DEMO_LOGINS.map((d) => (
            <div className="vb-demo-card" key={d.email}>
              <button
                type="button"
                className="vb-demo-fill"
                onClick={() => fillCredentials(d.email, d.password)}
                title="Fill the form with these credentials"
              >
                <span className="vb-demo-role">{d.label}</span>
                <span className="vb-demo-creds mono">
                  {d.email} · {d.password}
                </span>
              </button>
              <button
                type="button"
                className="vb-icon-btn"
                aria-label={`Copy ${d.label} email`}
                title="Copy email"
                onClick={() => copyValue(d.email, `${d.email}-email`)}
              >
                {copied === `${d.email}-email` ? "✓" : "✉"}
              </button>
              <button
                type="button"
                className="vb-icon-btn"
                aria-label={`Copy ${d.label} password`}
                title="Copy password"
                onClick={() => copyValue(d.password, `${d.email}-pw`)}
              >
                {copied === `${d.email}-pw` ? "✓" : "🔑"}
              </button>
            </div>
          ))}
        </div>
      </form>
    </div>
  );
}
