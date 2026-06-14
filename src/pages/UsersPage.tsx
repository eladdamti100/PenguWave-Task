import { useState, type FormEvent } from "react";
import type { User } from "../types";
import "../styles/auth-ui.css";

const ROLES = ["admin", "analyst", "viewer"] as const;

// Seed list carries only public fields — no passwords are ever stored client-side.
const SEED_USERS: User[] = [
  { id: "usr-001", email: "admin@penguwave.io", role: "admin", status: "active" },
  { id: "usr-002", email: "analyst@penguwave.io", role: "analyst", status: "active" },
  { id: "usr-003", email: "viewer@penguwave.io", role: "viewer", status: "disabled" },
];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #a855f7)",
  "linear-gradient(135deg, #0ea5e9, #6366f1)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
  "linear-gradient(135deg, #14b8a6, #6366f1)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #8b5cf6, #06b6d4)",
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function initials(email: string): string {
  const name = email.split("@")[0] ?? email;
  const parts = name.split(/[.\-_]/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddUserModalProps {
  existingEmails: string[];
  onClose: () => void;
  onCreate: (user: Omit<User, "id">) => void;
}

function AddUserModal({ existingEmails, onClose, onCreate }: AddUserModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [error, setError] = useState("");

  const handleCreate = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password.trim()) {
      setError("Email and password are both required.");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (existingEmails.some((e2) => e2.toLowerCase() === trimmed)) {
      setError("A user with that email already exists.");
      return;
    }
    // Password is captured to create the account (a real backend would hash it)
    // but never stored in client state or rendered.
    onCreate({ email: trimmed, role, status: "active" });
  };

  return (
    <div
      className="vb-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-user-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form className="vb-modal" onSubmit={handleCreate} onKeyDown={(e) => e.key === "Escape" && onClose()} noValidate>
        <div className="vb-modal-head">
          <div>
            <div className="vb-modal-title" id="add-user-title">Add user</div>
            <div className="vb-modal-sub">Invite a teammate to the workspace</div>
          </div>
          <button className="vb-icon-btn" type="button" aria-label="Close dialog" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vb-field">
          <label className="vb-label" htmlFor="add-email">Email</label>
          <input
            id="add-email"
            className={`vb-input${error && !email.trim() ? " vb-input-error" : ""}`}
            type="email"
            placeholder="teammate@penguwave.io"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="vb-field">
          <label className="vb-label" htmlFor="add-password">Password</label>
          <input
            id="add-password"
            className={`vb-input${error && !password.trim() ? " vb-input-error" : ""}`}
            type="password"
            autoComplete="new-password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="vb-field">
          <span className="vb-label" id="role-label">Role</span>
          <div className="vb-segment" role="group" aria-labelledby="role-label">
            {ROLES.map((r) => (
              <button key={r} type="button" className="vb-segment-btn" aria-pressed={role === r} onClick={() => setRole(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="vb-error" role="alert">
            <span aria-hidden="true">⚠</span> {error}
          </div>
        ) : null}

        <div className="vb-modal-actions">
          <button className="vb-btn vb-btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="vb-btn vb-btn-primary" type="submit">
            Create user
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [newId, setNewId] = useState("");

  const addUser = (draft: Omit<User, "id">): void => {
    const id = `usr-${Date.now().toString(36)}`;
    setUsers((prev) => [{ id, ...draft }, ...prev]);
    setNewId(id);
    setModalOpen(false);
    window.setTimeout(() => setNewId(""), 1900);
  };

  const toggleStatus = (id: string): void => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "disabled" : "active" } : u))
    );
  };

  const removeUser = (user: User): void => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  return (
    <div className="page-container">
      <section className="vb-section">
        <div className="vb-section-head">
          <div>
            <h1>User Management</h1>
            <p className="muted">{users.length} user{users.length === 1 ? "" : "s"} · manage roles and access</p>
          </div>
          <button className="vb-btn vb-btn-primary vb-btn-sm" type="button" onClick={() => setModalOpen(true)}>
            <span aria-hidden="true">＋</span> Add user
          </button>
        </div>

        <div className="vb-card vb-user-list">
          {users.length === 0 ? (
            <div className="vb-empty">No users yet. Add your first teammate.</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className={`vb-user-row${u.id === newId ? " vb-row-new" : ""}`}>
                <div className="vb-avatar" style={{ background: gradientFor(u.email) }} aria-hidden="true">
                  {initials(u.email)}
                </div>
                <div className="vb-user-meta">
                  <span className="vb-user-email">{u.email}</span>
                  <span className="vb-user-id">{u.id}</span>
                </div>
                <span className="vb-role">{u.role}</span>
                <span className={`vb-pill vb-pill-${u.status === "active" ? "active" : "disabled"}`}>{u.status}</span>
                <div className="vb-row-actions">
                  <button
                    className="vb-icon-btn"
                    type="button"
                    aria-label={u.status === "active" ? `Disable ${u.email}` : `Enable ${u.email}`}
                    title={u.status === "active" ? "Disable" : "Enable"}
                    onClick={() => toggleStatus(u.id)}
                  >
                    {u.status === "active" ? "⏸" : "▶"}
                  </button>
                  <button
                    className="vb-icon-btn vb-icon-danger"
                    type="button"
                    aria-label={`Remove ${u.email}`}
                    title="Remove"
                    onClick={() => removeUser(u)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {modalOpen ? (
        <AddUserModal existingEmails={users.map((u) => u.email)} onClose={() => setModalOpen(false)} onCreate={addUser} />
      ) : null}
    </div>
  );
}
