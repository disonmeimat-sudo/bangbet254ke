import { useEffect, useState } from "react";
import api from "../../api/client";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [form, setForm] = useState({
    name: "",
    league_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [teamsResponse, leaguesResponse] = await Promise.all([
        api.get("/api/admin/teams"),
        api.get("/api/admin/leagues"),
      ]);

      setTeams(teamsResponse.data);
      setLeagues(leaguesResponse.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createTeam(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.league_id) {
      setError("Team name and league are required.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/admin/teams", {
        name: form.name.trim(),
        league_id: Number(form.league_id),
      });

      setForm({
        name: "",
        league_id: "",
      });

      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create team.");
    } finally {
      setSaving(false);
    }
  }

  function leagueName(id) {
    const league = leagues.find((item) => item.id === id);
    return league?.name || `League #${id}`;
  }

  return (
    <div className="page">
      <main className="container" style={{ padding: "40px 0" }}>
        <h1>Manage Teams</h1>
        <p>Add teams and assign them to leagues.</p>

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
          onSubmit={createTeam}
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Add Team</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <select
              value={form.league_id}
              onChange={(e) =>
                setForm({ ...form, league_id: e.target.value })
              }
            >
              <option value="">Select league</option>

              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Team name"
            />

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>

        <section style={{ marginTop: "30px" }}>
          <h2>Existing Teams</h2>

          {loading ? (
            <p>Loading...</p>
          ) : teams.length === 0 ? (
            <p>No teams found.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {teams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{team.name}</strong>

                  <div>{leagueName(team.league_id)}</div>

                  <div>
                    Status:{" "}
                    {team.is_active ? "Active" : "Inactive"}
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
