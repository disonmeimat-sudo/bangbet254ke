import { useEffect, useState } from "react";
import api from "../../api/client";

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
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [matchesRes, leaguesRes, teamsRes] = await Promise.all([
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
    const team = teams.find((t) => t.id === id);
    return team?.name || `Team #${id}`;
  }

  function leagueName(id) {
    const league = leagues.find((l) => l.id === id);
    return league?.name || `League #${id}`;
  }

  async function createMatch(e) {
    e.preventDefault();
    setError("");

    if (
      !form.league_id ||
      !form.home_team_id ||
      !form.away_team_id ||
      !form.scheduled_at
    ) {
      setError("All match fields are required.");
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
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      });

      setForm({
        league_id: "",
        home_team_id: "",
        away_team_id: "",
        scheduled_at: "",
      });

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

  async function updateScore(match) {
    const home = window.prompt(
      `Home score for ${teamName(match.home_team_id)}:`,
      match.home_score
    );

    if (home === null) return;

    const away = window.prompt(
      `Away score for ${teamName(match.away_team_id)}:`,
      match.away_score
    );

    if (away === null) return;

    const homeScore = Number(home);
    const awayScore = Number(away);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setError("Scores must be non-negative whole numbers.");
      return;
    }

    try {
      setError("");

      await api.patch(`/api/admin/matches/${match.id}/score`, {
        home_score: homeScore,
        away_score: awayScore,
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update score."
      );
    }
  }

  async function updateStatus(match, status) {
    try {
      setError("");

      await api.patch(`/api/admin/matches/${match.id}/status`, {
        status,
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update match status."
      );
    }
  }

  async function toggleFeatured(match) {
    try {
      setError("");

      await api.patch(
        `/api/admin/matches/${match.id}/featured`,
        {
          is_featured: !match.is_featured,
        }
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update featured status."
      );
    }
  }

  async function toggleBetting(match) {
    try {
      setError("");

      await api.patch(
        `/api/admin/matches/${match.id}/betting`,
        {
          is_betting_open: !match.is_betting_open,
        }
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update betting status."
      );
    }
  }

  const selectedLeagueTeams = teams.filter(
    (team) =>
      !form.league_id ||
      team.league_id === Number(form.league_id)
  );

  return (
    <div className="page">
      <main className="container" style={{ padding: "40px 0" }}>
        <h1>Manage Matches</h1>
        <p>
          Create matches, manage scores, betting and live status.
        </p>

        {error && (
          <div
            style={{
              margin: "20px 0",
              padding: "12px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={createMatch}
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Create Match</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <select
              value={form.league_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  league_id: e.target.value,
                  home_team_id: "",
                  away_team_id: "",
                })
              }
            >
              <option value="">Select league</option>

              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <select
              value={form.home_team_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  home_team_id: e.target.value,
                })
              }
            >
              <option value="">Select home team</option>

              {selectedLeagueTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <select
              value={form.away_team_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  away_team_id: e.target.value,
                })
              }
            >
              <option value="">Select away team</option>

              {selectedLeagueTeams
                .filter(
                  (team) =>
                    String(team.id) !== form.home_team_id
                )
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>

            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) =>
                setForm({
                  ...form,
                  scheduled_at: e.target.value,
                })
              }
            />

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Match"}
            </button>
          </div>
        </form>

        <section style={{ marginTop: "35px" }}>
          <h2>Matches</h2>

          {loading ? (
            <p>Loading matches...</p>
          ) : matches.length === 0 ? (
            <p>No matches found.</p>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {matches.map((match) => (
                <div
                  key={match.id}
                  style={{
                    padding: "18px",
                    border: "1px solid #ddd",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "18px" }}>
                        {teamName(match.home_team_id)}
                        {" vs "}
                        {teamName(match.away_team_id)}
                      </strong>

                      <div style={{ marginTop: "5px" }}>
                        {leagueName(match.league_id)}
                      </div>

                      <div style={{ marginTop: "5px" }}>
                        {new Date(
                          match.scheduled_at
                        ).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "24px" }}>
                        {match.home_score} - {match.away_score}
                      </strong>

                      <div>
                        Status: <strong>{match.status}</strong>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateScore(match)}
                    >
                      Update Score
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(
                          match,
                          match.status === "live"
                            ? "upcoming"
                            : "live"
                        )
                      }
                    >
                      {match.status === "live"
                        ? "Stop Live"
                        : "Make Live"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(match, "ended")
                      }
                    >
                      End Match
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(match, "suspended")
                      }
                    >
                      Suspend
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFeatured(match)}
                    >
                      {match.is_featured
                        ? "★ Unfeature"
                        : "☆ Feature"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleBetting(match)}
                    >
                      {match.is_betting_open
                        ? "Close Betting"
                        : "Open Betting"}
                    </button>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    Betting:{" "}
                    <strong>
                      {match.is_betting_open
                        ? "OPEN"
                        : "CLOSED"}
                    </strong>
                    {" · "}
                    Featured:{" "}
                    <strong>
                      {match.is_featured ? "YES" : "NO"}
                    </strong>
                    {" · "}
                    Live:{" "}
                    <strong>
                      {match.is_live ? "YES" : "NO"}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
