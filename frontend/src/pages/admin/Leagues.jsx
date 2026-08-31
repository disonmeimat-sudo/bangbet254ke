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
  const [message, setMessage] = useState("");

  async function loadLeagues() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/api/admin/leagues"
      );

      setLeagues(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load leagues."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeagues();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function createLeague(e) {
    e.preventDefault();

    setError("");
    setMessage("");

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

      setMessage("League created successfully.");
      await loadLeagues();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to create league."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <main
        className="container"
        style={{
          maxWidth: "1050px",
          margin: "0 auto",
          padding: "24px 16px 60px",
        }}
      >
        <div style={{ marginBottom: "25px" }}>
          <div
            style={{
              fontSize: "13px",
              color: "#6366f1",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Competition Management
          </div>

          <h1
            style={{
              margin: "6px 0",
              fontSize: "clamp(28px,6vw,42px)",
            }}
          >
            🏆 Leagues
          </h1>

          <p style={{ color: "#64748b" }}>
            Create and organize the competitions used
            throughout BangBet254.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "16px",
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
              padding: "14px",
              marginBottom: "16px",
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
            padding: "22px",
            borderRadius: "20px",
            background:
              "linear-gradient(135deg,#4f46e5,#7c3aed,#db2777)",
            color: "#fff",
            boxShadow:
              "0 15px 40px rgba(79,70,229,.22)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            ➕ Create New League
          </h2>

          <form onSubmit={createLeague}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(210px,1fr))",
                gap: "14px",
              }}
            >
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="League name"
                style={inputStyle}
              />

              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Country e.g. Kenya"
                style={inputStyle}
              />

              <select
                name="sport"
                value={form.sport}
                onChange={handleChange}
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
                <option value="rugby">
                  🏉 Rugby
                </option>
                <option value="other">
                  🏅 Other
                </option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "14px",
                border: 0,
                borderRadius: "12px",
                background: "#fff",
                color: "#4f46e5",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {saving
                ? "Creating League..."
                : "Create League"}
            </button>
          </form>
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginTop: "32px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>
            Existing Leagues
          </h2>

          <span
            style={{
              padding: "7px 12px",
              borderRadius: "999px",
              background: "#ede9fe",
              color: "#6d28d9",
              fontWeight: 800,
            }}
          >
            {leagues.length} leagues
          </span>
        </div>

        {loading ? (
          <p>Loading leagues...</p>
        ) : leagues.length === 0 ? (
          <div
            style={{
              padding: "35px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "18px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <div style={{ fontSize: "40px" }}>
              🏆
            </div>

            <strong>
              No leagues created yet
            </strong>

            <p style={{ color: "#64748b" }}>
              Create your first league above.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(230px,1fr))",
              gap: "16px",
            }}
          >
            {leagues.map((league) => (
              <article
                key={league.id}
                style={{
                  padding: "20px",
                  borderRadius: "18px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  boxShadow:
                    "0 6px 20px rgba(15,23,42,.06)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "14px",
                    background: "#ede9fe",
                    fontSize: "24px",
                    marginBottom: "14px",
                  }}
                >
                  🏆
                </div>

                <h3
                  style={{
                    margin: "0 0 8px",
                  }}
                >
                  {league.name}
                </h3>

                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={badgeStyle}>
                    {league.sport}
                  </span>

                  {league.country && (
                    <span style={countryBadgeStyle}>
                      🌍 {league.country}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "15px",
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                >
                  League #{league.id}
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
  borderRadius: "11px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#111827",
};

const badgeStyle = {
  padding: "6px 9px",
  borderRadius: "999px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "capitalize",
};

const countryBadgeStyle = {
  padding: "6px 9px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontSize: "12px",
  fontWeight: 800,
};
