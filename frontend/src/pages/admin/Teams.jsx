import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);

  const [form, setForm] = useState({
    name: "",
    league_id: "",
    country: "",
    sport: "football",
  });

  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [teamsResponse, leaguesResponse] = await Promise.all([
        api.get("/api/admin/teams"),
        api.get("/api/admin/leagues"),
      ]);

      setTeams(teamsResponse.data);
      setLeagues(leaguesResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load teams and leagues."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      league_id: "",
      country: "",
      sport: "football",
    });
    setEditing(null);
  }

  function startEdit(team) {
    setEditing(team);
    setForm({
      name: team.name || "",
      league_id: team.league_id ? String(team.league_id) : "",
      country: team.country || "",
      sport: team.sport || "football",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveTeam(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Team name is required.");
      return;
    }

    if (!form.league_id) {
      setError("Please select a league.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        league_id: Number(form.league_id),
        country: form.country.trim() || null,
        sport: form.sport.trim() || "football",
      };

      if (editing) {
        await api.patch(
          `/api/admin/teams/${editing.id}`,
          payload
        );

        setMessage("Team updated successfully.");
      } else {
        await api.post(
          "/api/admin/teams",
          payload
        );

        setMessage("Team created successfully.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save team."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(team) {
    try {
      setActionId(team.id);
      setError("");
      setMessage("");

      await api.patch(
        `/api/admin/teams/${team.id}/status`,
        null,
        {
          params: {
            is_active: !team.is_active,
          },
        }
      );

      setMessage(
        `${team.name} is now ${
          !team.is_active ? "active" : "inactive"
        }.`
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update team status."
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteTeam(team) {
    const confirmed = window.confirm(
      `Delete "${team.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setActionId(team.id);
      setError("");
      setMessage("");

      await api.delete(
        `/api/admin/teams/${team.id}`
      );

      setMessage(`${team.name} deleted.`);
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to delete team."
      );
    } finally {
      setActionId(null);
    }
  }

  function leagueName(id) {
    const league = leagues.find(
      (item) => item.id === id
    );

    return league?.name || "Unassigned league";
  }

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();

    return teams.filter((team) => {
      const matchesSearch =
        !term ||
        team.name.toLowerCase().includes(term) ||
        String(team.country || "")
          .toLowerCase()
          .includes(term) ||
        leagueName(team.league_id)
          .toLowerCase()
          .includes(term);

      const matchesLeague =
        !leagueFilter ||
        String(team.league_id) ===
          String(leagueFilter);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active"
          ? team.is_active
          : !team.is_active);

      return (
        matchesSearch &&
        matchesLeague &&
        matchesStatus
      );
    });
  }, [
    teams,
    leagues,
    search,
    leagueFilter,
    statusFilter,
  ]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "18px 12px 40px",
        background:
          "linear-gradient(135deg,#eff6ff,#f5f3ff,#fff7ed)",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg,#2563eb,#7c3aed)",
            color: "#fff",
            borderRadius: 20,
            padding: "22px 18px",
            marginBottom: 16,
            boxShadow:
              "0 12px 30px rgba(37,99,235,.20)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              opacity: 0.85,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            ⚽ BangBet254
          </div>

          <h1
            style={{
              margin: "5px 0",
              fontSize: "clamp(24px,7vw,34px)",
            }}
          >
            Manage Teams
          </h1>

          <p
            style={{
              margin: 0,
              opacity: 0.9,
            }}
          >
            Create teams, assign leagues and control
            their betting availability.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              borderRadius: 12,
              background: "#dcfce7",
              color: "#166534",
              fontWeight: 600,
            }}
          >
            ✅ {message}
          </div>
        )}

        <form
          onSubmit={saveTeam}
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 18,
            marginBottom: 18,
            boxShadow:
              "0 8px 25px rgba(15,23,42,.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h2 style={{ margin: 0 }}>
              {editing
                ? "✏️ Edit Team"
                : "➕ Add Team"}
            </h2>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  border: 0,
                  borderRadius: 10,
                  padding: "9px 12px",
                  background: "#f1f5f9",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <input
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              placeholder="Team name"
              style={inputStyle}
            />

            <select
              value={form.league_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  league_id: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">
                Select league
              </option>

              {leagues.map((league) => (
                <option
                  key={league.id}
                  value={league.id}
                >
                  {league.name}
                </option>
              ))}
            </select>

            <input
              value={form.country}
              onChange={(e) =>
                setForm({
                  ...form,
                  country: e.target.value,
                })
              }
              placeholder="Country (optional)"
              style={inputStyle}
            />

            <select
              value={form.sport}
              onChange={(e) =>
                setForm({
                  ...form,
                  sport: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="football">
                ⚽ Football
              </option>
              <option value="basketball">
                🏀 Basketball
              </option>
              <option value="tennis">
                🎾 Tennis
              </option>
              <option value="other">
                🏆 Other
              </option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 14,
              border: 0,
              borderRadius: 12,
              padding: 13,
              background:
                "linear-gradient(135deg,#2563eb,#7c3aed)",
              color: "#fff",
              fontWeight: 800,
              cursor: saving
                ? "not-allowed"
                : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Saving..."
              : editing
              ? "💾 Save Changes"
              : "➕ Create Team"}
          </button>
        </form>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: 15,
            marginBottom: 18,
            boxShadow:
              "0 8px 25px rgba(15,23,42,.08)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 10,
            }}
          >
            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="🔎 Search teams..."
              style={inputStyle}
            />

            <select
              value={leagueFilter}
              onChange={(e) =>
                setLeagueFilter(e.target.value)
              }
              style={inputStyle}
            >
              <option value="">
                All leagues
              </option>

              {leagues.map((league) => (
                <option
                  key={league.id}
                  value={league.id}
                >
                  {league.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              style={inputStyle}
            >
              <option value="">
                All statuses
              </option>
              <option value="active">
                🟢 Active
              </option>
              <option value="inactive">
                🔴 Inactive
              </option>
            </select>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>
            Teams
          </h2>

          <span
            style={{
              background: "#ede9fe",
              color: "#6d28d9",
              padding: "6px 10px",
              borderRadius: 20,
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {filteredTeams.length}
          </span>
        </div>

        {loading ? (
          <div style={emptyStyle}>
            ⏳ Loading teams...
          </div>
        ) : filteredTeams.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 40 }}>
              ⚽
            </div>
            <strong>No teams found</strong>
            <div
              style={{
                color: "#64748b",
                marginTop: 5,
              }}
            >
              Create a team or change your filters.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: 12,
            }}
          >
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                style={{
                  background: "#fff",
                  borderRadius: 17,
                  padding: 16,
                  boxShadow:
                    "0 8px 22px rgba(15,23,42,.08)",
                  border:
                    team.is_active
                      ? "1px solid #dbeafe"
                      : "1px solid #fecaca",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(135deg,#dbeafe,#ede9fe)",
                      fontSize: 23,
                    }}
                  >
                    ⚽
                  </div>

                  <span
                    style={{
                      height: "fit-content",
                      padding: "5px 9px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 800,
                      background: team.is_active
                        ? "#dcfce7"
                        : "#fee2e2",
                      color: team.is_active
                        ? "#166534"
                        : "#991b1b",
                    }}
                  >
                    {team.is_active
                      ? "● ACTIVE"
                      : "● INACTIVE"}
                  </span>
                </div>

                <h3
                  style={{
                    margin: "13px 0 4px",
                    fontSize: 18,
                  }}
                >
                  {team.name}
                </h3>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                  }}
                >
                  🏆 {leagueName(team.league_id)}
                </div>

                {team.country && (
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    🌍 {team.country}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                    marginTop: 15,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      startEdit(team)
                    }
                    style={buttonStyle("#2563eb")}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    disabled={actionId === team.id}
                    onClick={() =>
                      toggleStatus(team)
                    }
                    style={buttonStyle(
                      team.is_active
                        ? "#f59e0b"
                        : "#16a34a"
                    )}
                  >
                    {team.is_active
                      ? "⏸ Disable"
                      : "▶ Activate"}
                  </button>

                  <button
                    type="button"
                    disabled={actionId === team.id}
                    onClick={() =>
                      deleteTeam(team)
                    }
                    style={buttonStyle("#dc2626")}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 11,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 14,
  outline: "none",
};

function buttonStyle(background) {
  return {
    flex: "1 1 90px",
    border: 0,
    borderRadius: 10,
    padding: "10px 9px",
    background,
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };
}

const emptyStyle = {
  background: "#fff",
  borderRadius: 18,
  padding: 35,
  textAlign: "center",
  boxShadow:
    "0 8px 22px rgba(15,23,42,.07)",
};
