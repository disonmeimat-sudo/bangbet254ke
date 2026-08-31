import { useEffect, useState } from "react";

import {
  getAdminUsers,
  getAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
} from "../../api/admin";

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminUsers({
        search: search.trim() || undefined,
        status: status || undefined,
      });

      setUsers(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [status]);

  async function searchUsers(e) {
    e.preventDefault();
    await loadUsers();
  }

  async function viewUser(userId) {
    try {
      setDetailsLoading(true);
      setError("");

      const user = await getAdminUser(userId);
      setSelected(user);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load user details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function toggleStatus(user) {
    try {
      setActionLoading(true);
      setError("");

      await updateAdminUserStatus(
        user.id,
        !user.is_active
      );

      await loadUsers();

      if (selected?.id === user.id) {
        await viewUser(user.id);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update user status."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function removeUser(user) {
    const confirmed = window.confirm(
      `Delete ${user.full_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      await deleteAdminUser(user.id);

      if (selected?.id === user.id) {
        setSelected(null);
      }

      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete user."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "35px 20px",
        background:
          "linear-gradient(135deg,#eff6ff,#f5f3ff,#fff7ed)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "auto" }}>
        <h1 style={{ marginBottom: 5 }}>
          👥 User Management
        </h1>

        <p style={{ color: "#64748b" }}>
          Search and manage BangBet254 users.
        </p>

        {error && (
          <div
            style={{
              margin: "20px 0",
              padding: 14,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={searchUsers}
          style={{
            marginTop: 25,
            padding: 20,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 25px rgba(0,0,0,.07)",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            style={{
              flex: 1,
              minWidth: 220,
              padding: 12,
              border: "1px solid #cbd5e1",
              borderRadius: 10,
            }}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: 12,
              border: "1px solid #cbd5e1",
              borderRadius: 10,
            }}
          >
            <option value="">All users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="submit"
            style={{
              padding: "12px 20px",
              border: 0,
              borderRadius: 10,
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔍 Search
          </button>
        </form>

        {loading ? (
          <p style={{ marginTop: 30 }}>
            Loading users...
          </p>
        ) : users.length === 0 ? (
          <div
            style={{
              marginTop: 30,
              padding: 30,
              background: "#fff",
              borderRadius: 16,
              textAlign: "center",
            }}
          >
            No users found.
          </div>
        ) : (
          <div
            style={{
              marginTop: 25,
              display: "grid",
              gap: 15,
            }}
          >
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: "0 7px 25px rgba(0,0,0,.07)",
                  borderLeft: `5px solid ${
                    user.is_active
                      ? "#16a34a"
                      : "#dc2626"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 15,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {user.full_name}
                    </h3>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748b",
                      }}
                    >
                      📱 {user.phone || "No phone"}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 20,
                          background: user.is_active
                            ? "#dcfce7"
                            : "#fee2e2",
                          color: user.is_active
                            ? "#166534"
                            : "#991b1b",
                          fontWeight: 700,
                        }}
                      >
                        {user.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => viewUser(user.id)}
                      style={{
                        padding: "9px 14px",
                        border: 0,
                        borderRadius: 9,
                        background: "#7c3aed",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      👁 View
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => toggleStatus(user)}
                      style={{
                        padding: "9px 14px",
                        border: 0,
                        borderRadius: 9,
                        background: user.is_active
                          ? "#f59e0b"
                          : "#16a34a",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {user.is_active
                        ? "⏸ Deactivate"
                        : "▶ Activate"}
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => removeUser(user)}
                      style={{
                        padding: "9px 14px",
                        border: 0,
                        borderRadius: 9,
                        background: "#dc2626",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 1000,
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                background: "#fff",
                borderRadius: 20,
                padding: 25,
                boxShadow: "0 25px 60px rgba(0,0,0,.25)",
              }}
            >
              {detailsLoading ? (
                <p>Loading details...</p>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <h2 style={{ marginTop: 0 }}>
                      👤 User Details
                    </h2>

                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        border: 0,
                        background: "#f1f5f9",
                        borderRadius: 8,
                        padding: "7px 11px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 14,
                    }}
                  >
                    <div>
                      <small>Name</small>
                      <strong style={{ display: "block" }}>
                        {selected.full_name}
                      </strong>
                    </div>

                    <div>
                      <small>Phone</small>
                      <strong style={{ display: "block" }}>
                        {selected.phone || "-"}
                      </strong>
                    </div>

                    <div>
                      <small>Status</small>
                      <strong style={{ display: "block" }}>
                        {selected.is_active
                          ? "Active"
                          : "Inactive"}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 18,
                        borderRadius: 14,
                        background:
                          "linear-gradient(135deg,#dbeafe,#ede9fe)",
                      }}
                    >
                      <small>Wallet Balance</small>

                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: "#2563eb",
                          marginTop: 5,
                        }}
                      >
                        {money(
                          selected.wallet?.balance ??
                            selected.wallet_balance
                        )}
                      </div>
                    </div>

                    <div>
                      <small>Created</small>
                      <strong style={{ display: "block" }}>
                        {date(selected.created_at)}
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
