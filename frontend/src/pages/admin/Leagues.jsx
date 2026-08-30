import { useEffect, useState } from "react";
import api from "../../api/client";

export default function Leagues() {
  const [leagues, setLeagues] = useState([]);
  const [form, setForm] = useState({
    name: "",
    country: "",
    sport: "football",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadLeagues() {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/leagues");
      setLeagues(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load leagues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeagues();
  }, []);

  async function createLeague(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("League name is required.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/admin/leagues", {
        name: form.name.trim(),
        country: form.country.trim() || null,
        sport: form.sport,
      });

      setForm({
        name: "",
        country: "",
        sport: "football",
      });

      await loadLeagues();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create league.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <main className="container" style={{ padding: "40px 0" }}>
        <h1>Manage Leagues</h1>
        <p>Create and manage betting leagues.</p>

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
          onSubmit={createLeague}
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Add League</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="League name"
            />

            <input
              value={form.country}
              onChange={(e) =>
                setForm({ ...form, country: e.target.value })
              }
              placeholder="Country"
            />

            <select
              value={form.sport}
              onChange={(e) =>
                setForm({ ...form, sport: e.target.value })
              }
            >
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="tennis">Tennis</option>
            </select>

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create League"}
            </button>
          </div>
        </form>

        <section style={{ marginTop: "30px" }}>
          <h2>Existing Leagues</h2>

          {loading ? (
            <p>Loading...</p>
          ) : leagues.length === 0 ? (
            <p>No leagues found.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {leagues.map((league) => (
                <div
                  key={league.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{league.name}</strong>

                  <div>
                    {league.country || "International"} ·{" "}
                    {league.sport}
                  </div>

                  <div>
                    Status:{" "}
                    {league.is_active ? "Active" : "Inactive"}
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
