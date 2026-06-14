import { useState } from "react";
import type { User } from "../types";

// Seed list mirrors the public fields of the demo accounts — note there are no
// passwords here. Passwords are never sent to or stored in the client.
const SEED_USERS: User[] = [
  { id: "usr-001", email: "admin@penguwave.io", role: "admin", status: "active" },
  { id: "usr-002", email: "analyst@penguwave.io", role: "analyst", status: "active" },
  { id: "usr-003", email: "viewer@penguwave.io", role: "viewer", status: "disabled" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const email = newEmail.trim();
    if (!email || !newPassword) {
      setFormError("Email and password are required.");
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      setFormError("A user with that email already exists.");
      return;
    }

    // The password is sent to create the account (in a real app, to the backend
    // which hashes it) but is never stored in client state or rendered.
    const newUser: User = {
      id: `usr-${Date.now()}`,
      email,
      role: newRole,
      status: "active",
    };
    setUsers((prev) => [...prev, newUser]);
    setNewEmail("");
    setNewPassword("");
    setNewRole("analyst");
    setShowForm(false);
  };

  const handleDelete = (user: User) => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>User Management</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showForm && (
        <div className="panel form-panel">
          <h3>New User</h3>
          <form onSubmit={handleAddUser}>
            <div style={{ marginBottom: 8 }}>
              <label>Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@penguwave.io"
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {formError && <div className="banner banner-error" style={{ marginBottom: 12 }}>{formError}</div>}
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-dot ${user.status === "active" ? "ok" : "off"}`} />
                  {user.status}
                </td>
                <td>
                  <button className="link-btn danger" onClick={() => handleDelete(user)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && <p className="muted">No users.</p>}
    </div>
  );
}
