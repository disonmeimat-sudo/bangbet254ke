import { useEffect, useState } from "react";
import api from "../../api/client";

function formatDate(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ children, type = "default" }) {
  const styles = {
    default: {
      background: "#e5e7eb",
      color: "#374151",
    },
    live: {
      background: "#dcfce7",
      color: "#166534",
    },
    featured: {
      background: "#fef3c7",
      color: "#92400e",
    },
    open: {
      background: "#dbeafe",
      color: "#1d4ed8",
    },
    closed: {
      background: "#fee2e2",
      color: "#991b1b",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 800,
        ...styles[type],
      }}
    >
      {children}
    </span>
  );
}

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);

  const [form, setForm] = useState({
    league_id: "",
    home_team_id: "",
    away_team_id: "",
    scheduled_at: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        matchesRes,
        leaguesRes,
        teamsRes,
      ] = await Promise.all([
        api.get("/api/admin/matches"),
        api.get("/api/admin/leagues"),
        api.get("/api/admin/teams"),
      ]);

      setMatches(matchesRes.data);
      setLeagues(leaguesRes.data);
      setTeams(teamsRes.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load matches."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function teamName(id) {
    return (
      teams.find((team) => team.id === id)?.name ||
      `Team #${id}`
    );
  }

  function leagueName(id) {
    return (
      leagues.find((league) => league.id === id)?.name ||
      `League #${id}`
    );
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function createMatch(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (
      !form.league_id ||
      !form.home_team_id ||
      !form.away_team_id ||
      !form.scheduled_at
    ) {
      setError("Please complete every match field.");
      return;
    }

    if (form.home_team_id === form.away_team_id) {
      setError("Home and away teams must be different.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/admin/matches", {
        league_id: Number(form.league_id),
        home_team_id: Number(form.home_team_id),
        away_team_id: Number(form.away_team_id),
        scheduled_at: new Date(
          form.scheduled_at
        ).toISOString(),
      });

      setForm({
        league_id: "",
        home_team_id: "",
        away_team_id: "",
        scheduled_at: "",
      });

      setMessage("Match created successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to create match."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateMatch(matchId, endpoint, payload) {
    try {
      setActionId(matchId);
      setError("");
      setMessage("");

      await api.patch(
        `/api/admin/matches/${matchId}/${endpoint}`,
        payload
      );

      setMessage("Match updated successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update match."
      );
    } finally {
      setActionId(null);
    }
  }

  async function deleteMatch(match) {
    const confirmed = window.confirm(
      `Delete ${teamName(match.home_team_id)} vs ${teamName(
        match.away_team_id
      )}?`
    );

    if (!confirmed) return;

    try {
      setActionId(match.id);
      setError("");
      setMessage("");

      await api.delete(
        `/api/admin/matches/${match.id}`
      );

      setMessage("Match deleted successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete match."
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="page">
      <main
        className="container"
        style={{
          padding: "24px 16px 60px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(26px, 5vw, 38px)",
            }}
          >
            ⚽ Matches
          </h1>

          <p style={{ color: "#64748b" }}>
            Create matches and control live, featured and
            betting status.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px",
              borderRadius: "12px",
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: "16px",
              padding: "14px",
              borderRadius: "12px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            padding: "20px",
            borderRadius: "18px",
            background:
              "linear-gradient(135deg,#111827,#312e81)",
            color: "#fff",
            marginBottom: "30px",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            ➕ Create Match
          </h2>

          <form onSubmit={createMatch}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "14px",
              }}
            >
              <select
                name="league_id"
                value={form.league_id}
                onChange={handleChange}
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

              <select
                name="home_team_id"
                value={form.home_team_id}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">
                  Home team
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>

              <select
                name="away_team_id"
                value={form.away_team_id}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">
                  Away team
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>

              <input
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "13px",
                border: 0,
                borderRadius: "12px",
                background: "#22c55e",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {saving
                ? "Creating..."
                : "Create Match"}
            </button>
          </form>
        </section>

        <h2>All Matches</h2>

        {loading ? (
          <p>Loading matches...</p>
        ) : matches.length === 0 ? (
          <div
            style={{
              padding: "30px",
              textAlign: "center",
              background: "#f1f5f9",
              borderRadius: "16px",
            }}
          >
            No matches created yet.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {matches.map((match) => (
              <article
                key={match.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "18px",
                  padding: "18px",
                  boxShadow:
                    "0 5px 20px rgba(15,23,42,.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#6366f1",
                        fontWeight: 800,
                        fontSize: "13px",
                      }}
                    >
                      {leagueName(
                        match.league_id
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "18px",
                        fontWeight: 900,
                      }}
                    >
                      {teamName(
                        match.home_team_id
                      )}{" "}
                      <span
                        style={{
                          color: "#94a3b8",
                        }}
                      >
                        vs
                      </span>{" "}
                      {teamName(
                        match.away_team_id
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      {formatDate(
                        match.scheduled_at
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <StatusBadge
                      type={
                        match.is_live
                          ? "live"
                          : "default"
                      }
                    >
                      {match.is_live
                        ? "🔴 LIVE"
                        : match.status}
                    </StatusBadge>

                    {match.is_featured && (
                      <StatusBadge type="featured">
                        ⭐ Featured
                      </StatusBadge>
                    )}

                    <StatusBadge
                      type={
                        match.is_betting_open
                          ? "open"
                          : "closed"
                      }
                    >
                      {match.is_betting_open
                        ? "Betting Open"
                        : "Betting Closed"}
                    </StatusBadge>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    padding: "14px",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: 900,
                  }}
                >
                  {match.home_score}{" "}
                  <span
                    style={{
                      color: "#94a3b8",
                    }}
                  >
                    -
                  </span>{" "}
                  {match.away_score}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(150px,1fr))",
                    gap: "8px",
                    marginTop: "14px",
                  }}
                >
                  <button
                    disabled={
                      actionId === match.id
                    }
                    onClick={() =>
                      updateMatch(
                        match.id,
                        "featured",
                        {
                          is_featured:
                            !match.is_featured,
                        }
                      )
                    }
                    style={buttonStyle(
                      "#f59e0b"
                    )}
                  >
                    {match.is_featured
                      ? "⭐ Remove Featured"
                      : "⭐ Mark Featured"}
                  </button>

                  <button
                    disabled={
                      actionId === match.id
                    }
                    onClick={() =>
                      updateMatch(
                        match.id,
                        "status",
                        {
                          status: match.is_live
                            ? "upcoming"
                            : "live",
                        }
                      )
                    }
                    style={buttonStyle(
                      "#16a34a"
                    )}
                  >
                    {match.is_live
                      ? "⏹ Stop Live"
                      : "🔴 Mark Live"}
                  </button>

                  <button
                    disabled={
                      actionId === match.id
                    }
                    onClick={() =>
                      updateMatch(
                        match.id,
                        "betting",
                        {
                          is_betting_open:
                            !match.is_betting_open,
                        }
                      )
                    }
                    style={buttonStyle(
                      "#2563eb"
                    )}
                  >
                    {match.is_betting_open
                      ? "🔒 Close Betting"
                      : "🔓 Open Betting"}
                  </button>

                  <button
                    disabled={
                      actionId === match.id
                    }
                    onClick={() =>
                      deleteMatch(match)
                    }
                    style={buttonStyle(
                      "#dc2626"
                    )}
                  >
                    🗑 Delete
                  </button>
                </div>
              </article>
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
  padding: "13px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#111827",
};

function buttonStyle(background) {
  return {
    border: 0,
    borderRadius: "10px",
    padding: "11px 10px",
    background,
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };
}
