import { useEffect, useState } from "react";
import api from "../../api/client";

export default function Markets() {
  const [markets, setMarkets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    match_id: "",
    name: "",
    market_type: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [marketsResponse, matchesResponse] = await Promise.all([
        api.get("/api/admin/markets"),
        api.get("/api/admin/matches"),
      ]);

      setMarkets(marketsResponse.data);
      setMatches(matchesResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load markets and matches."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function createMarket(event) {
    event.preventDefault();

    if (!form.match_id || !form.name.trim() || !form.market_type.trim()) {
      setError("Match, market name and market type are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post("/api/admin/markets", {
        match_id: Number(form.match_id),
        name: form.name.trim(),
        market_type: form.market_type.trim(),
      });

      setForm({
        match_id: "",
        name: "",
        market_type: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to create market."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleMarket(market) {
    try {
      setError("");

      await api.patch(`/api/admin/markets/${market.id}`, {
        is_active: !market.is_active,
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update market."
      );
    }
  }

  async function deleteMarket(market) {
    const confirmed = window.confirm(
      `Delete market "${market.name}"? This may also delete its odds.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/api/admin/markets/${market.id}`);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete market."
      );
    }
  }

  return (
    <div className="page">
      <main className="container" style={{ padding: "40px 0" }}>
        <h1>Manage Markets</h1>
        <p>Create and manage betting markets.</p>

        {error && (
          <div
            style={{
              margin: "20px 0",
              padding: "12px",
              border: "1px solid #dc2626",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={createMarket}
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Create Market</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <select
              name="match_id"
              value={form.match_id}
              onChange={handleChange}
            >
              <option value="">Select match</option>

              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  Match #{match.id} — {match.home_team_id} vs{" "}
                  {match.away_team_id}
                </option>
              ))}
            </select>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Market name e.g. Match Result"
            />

            <input
              name="market_type"
              value={form.market_type}
              onChange={handleChange}
              placeholder="Market type e.g. 1X2"
            />

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Market"}
            </button>
          </div>
        </form>

        <section style={{ marginTop: "30px" }}>
          <h2>Existing Markets</h2>

          {loading ? (
            <p>Loading markets...</p>
          ) : markets.length === 0 ? (
            <p>No markets found.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {markets.map((market) => (
                <div
                  key={market.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{market.name}</strong>

                  <div>
                    Market #{market.id} · Match #{market.match_id}
                  </div>

                  <div>
                    Type: {market.market_type}
                  </div>

                  <div>
                    Status:{" "}
                    {market.is_active ? "Active" : "Inactive"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleMarket(market)}
                    >
                      {market.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMarket(market)}
                    >
                      Delete
                    </button>
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
