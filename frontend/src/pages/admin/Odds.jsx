import { useEffect, useState } from "react";
import api from "../../api/client";

export default function Odds() {
  const [odds, setOdds] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    market_id: "",
    name: "",
    value: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [oddsResponse, marketsResponse] = await Promise.all([
        api.get("/api/admin/odds"),
        api.get("/api/admin/markets"),
      ]);

      setOdds(oddsResponse.data);
      setMarkets(marketsResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load odds and markets."
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

  async function createOdd(event) {
    event.preventDefault();

    if (
      !form.market_id ||
      !form.name.trim() ||
      !form.value
    ) {
      setError("Market, odd name and odd value are required.");
      return;
    }

    const value = Number(form.value);

    if (!Number.isFinite(value) || value <= 1) {
      setError("Odd value must be greater than 1.0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post("/api/admin/odds", {
        market_id: Number(form.market_id),
        name: form.name.trim(),
        value,
      });

      setForm({
        market_id: "",
        name: "",
        value: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to create odd."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleOdd(odd) {
    try {
      setError("");

      await api.patch(`/api/admin/odds/${odd.id}`, {
        is_active: !odd.is_active,
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update odd."
      );
    }
  }

  async function deleteOdd(odd) {
    const confirmed = window.confirm(
      `Delete odd "${odd.name}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/api/admin/odds/${odd.id}`);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete odd."
      );
    }
  }

  return (
    <div className="page">
      <main className="container" style={{ padding: "40px 0" }}>
        <h1>Manage Odds</h1>
        <p>Create and manage individual betting selections.</p>

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
          onSubmit={createOdd}
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "10px",
          }}
        >
          <h2>Create Odd</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            <select
              name="market_id"
              value={form.market_id}
              onChange={handleChange}
            >
              <option value="">Select market</option>

              {markets.map((market) => (
                <option key={market.id} value={market.id}>
                  #{market.id} — {market.name} — Match #
                  {market.match_id}
                  {!market.is_active ? " (Inactive)" : ""}
                </option>
              ))}
            </select>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Odd name e.g. Home Win"
            />

            <input
              name="value"
              type="number"
              step="0.01"
              min="1.01"
              value={form.value}
              onChange={handleChange}
              placeholder="Odd value e.g. 2.50"
            />

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Odd"}
            </button>
          </div>
        </form>

        <section style={{ marginTop: "30px" }}>
          <h2>Existing Odds</h2>

          {loading ? (
            <p>Loading odds...</p>
          ) : odds.length === 0 ? (
            <p>No odds found.</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {odds.map((odd) => (
                <div
                  key={odd.id}
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                  }}
                >
                  <strong>{odd.name}</strong>

                  <div>
                    Odd #{odd.id} · Market #{odd.market_id}
                  </div>

                  <div>
                    Value: <strong>{Number(odd.value).toFixed(2)}</strong>
                  </div>

                  <div>
                    Status:{" "}
                    {odd.is_active ? "Active" : "Inactive"}
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
                      onClick={() => toggleOdd(odd)}
                    >
                      {odd.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteOdd(odd)}
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
