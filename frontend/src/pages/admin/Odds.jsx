import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

export default function Odds() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [odds, setOdds] = useState([]);

  const [selectedMatch, setSelectedMatch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [edited, setEdited] = useState({});

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        matchesResponse,
        teamsResponse,
        marketsResponse,
        oddsResponse,
      ] = await Promise.all([
        api.get("/api/admin/matches"),
        api.get("/api/admin/teams"),
        api.get("/api/admin/markets"),
        api.get("/api/admin/odds"),
      ]);

      setMatches(matchesResponse.data);
      setTeams(teamsResponse.data);
      setMarkets(marketsResponse.data);
      setOdds(oddsResponse.data);

      if (!selectedMatch && matchesResponse.data.length > 0) {
        setSelectedMatch(String(matchesResponse.data[0].id));
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load matches, markets and odds."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const teamMap = useMemo(() => {
    const map = {};
    teams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [teams]);

  const match = matches.find(
    (item) => String(item.id) === String(selectedMatch)
  );

  const matchMarkets = markets.filter(
    (market) =>
      String(market.match_id) === String(selectedMatch)
  );

  function matchOdds(marketId) {
    return odds.filter(
      (odd) => String(odd.market_id) === String(marketId)
    );
  }

  function getOddValue(odd) {
    if (edited[odd.id] !== undefined) {
      return edited[odd.id];
    }

    return Number(odd.value).toFixed(2);
  }

  function updateEditedValue(id, value) {
    setEdited((current) => ({
      ...current,
      [id]: value,
    }));
  }

  async function saveOdd(odd) {
    const value = Number(getOddValue(odd));

    if (!Number.isFinite(value) || value <= 1) {
      setError("Odd value must be greater than 1.00.");
      return;
    }

    try {
      setSaving(odd.id);
      setError("");
      setMessage("");

      await api.patch(`/api/admin/odds/${odd.id}`, {
        value,
      });

      setOdds((current) =>
        current.map((item) =>
          item.id === odd.id
            ? { ...item, value }
            : item
        )
      );

      setEdited((current) => {
        const next = { ...current };
        delete next[odd.id];
        return next;
      });

      setMessage(
        `"${odd.name}" updated to ${value.toFixed(2)}`
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to save odd."
      );
    } finally {
      setSaving(null);
    }
  }

  async function toggleOdd(odd) {
    try {
      setError("");
      setMessage("");

      await api.patch(`/api/admin/odds/${odd.id}`, {
        is_active: !odd.is_active,
      });

      setOdds((current) =>
        current.map((item) =>
          item.id === odd.id
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );

      setMessage(
        `${odd.name} is now ${
          !odd.is_active ? "active" : "inactive"
        }.`
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update odd status."
      );
    }
  }

  if (loading) {
    return (
      <div className="page">
        <main
          className="container"
          style={{ padding: "50px 20px" }}
        >
          <h1>⚽ Odds Management</h1>
          <p>Loading betting markets...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main
        className="container"
        style={{
          padding: "35px 20px 80px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #111827, #1d4ed8, #7c3aed)",
            color: "white",
            borderRadius: "18px",
            padding: "28px",
            marginBottom: "25px",
            boxShadow: "0 10px 30px rgba(0,0,0,.15)",
          }}
        >
          <h1 style={{ margin: 0 }}>
            ⚽ Odds Management
          </h1>

          <p style={{ marginBottom: 0, opacity: 0.9 }}>
            Select a match, manage its markets and update
            the odds displayed to users.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontWeight: 600,
            }}
          >
            ❌ {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "14px 18px",
              borderRadius: "10px",
              marginBottom: "18px",
              fontWeight: 600,
            }}
          >
            ✅ {message}
          </div>
        )}

        <section
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "22px",
            marginBottom: "25px",
            boxShadow: "0 4px 15px rgba(0,0,0,.08)",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: 800,
              marginBottom: "10px",
            }}
          >
            SELECT MATCH
          </label>

          <select
            value={selectedMatch}
            onChange={(event) => {
              setSelectedMatch(event.target.value);
              setMessage("");
              setError("");
            }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "10px",
              border: "2px solid #dbeafe",
              fontSize: "16px",
              fontWeight: 600,
            }}
          >
            {matches.length === 0 && (
              <option value="">
                No matches available
              </option>
            )}

            {matches.map((item) => {
              const home =
                teamMap[item.home_team_id]?.name ||
                `Team #${item.home_team_id}`;

              const away =
                teamMap[item.away_team_id]?.name ||
                `Team #${item.away_team_id}`;

              return (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {home} vs {away} — Match #{item.id}
                </option>
              );
            })}
          </select>
        </section>

        {match && (
          <section
            style={{
              background:
                "linear-gradient(135deg, #eff6ff, #f5f3ff)",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "25px",
              border: "1px solid #dbeafe",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  MATCH #{match.id}
                </div>

                <h2 style={{ margin: "5px 0" }}>
                  {teamMap[match.home_team_id]?.name ||
                    `Team #${match.home_team_id}`}
                  {"  "}
                  <span style={{ color: "#64748b" }}>
                    VS
                  </span>
                  {"  "}
                  {teamMap[match.away_team_id]?.name ||
                    `Team #${match.away_team_id}`}
                </h2>

                <div
                  style={{
                    color: "#475569",
                    fontWeight: 600,
                  }}
                >
                  Status: {match.status} ·{" "}
                  {match.is_betting_open
                    ? "🟢 Betting Open"
                    : "🔴 Betting Closed"}
                </div>
              </div>
            </div>
          </section>
        )}

        {!match ? (
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "16px",
              textAlign: "center",
            }}
          >
            No match selected.
          </div>
        ) : matchMarkets.length === 0 ? (
          <div
            style={{
              background: "white",
              padding: "40px",
              borderRadius: "16px",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(0,0,0,.06)",
            }}
          >
            <h2>No markets yet</h2>
            <p>
              Create markets for this match first.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "20px",
            }}
          >
            {matchMarkets.map((market) => {
              const marketOdds = matchOdds(market.id);

              return (
                <section
                  key={market.id}
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow:
                      "0 5px 18px rgba(0,0,0,.08)",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      background:
                        "linear-gradient(90deg, #172554, #312e81)",
                      color: "white",
                      padding: "17px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "18px" }}>
                        {market.name}
                      </strong>

                      <div
                        style={{
                          fontSize: "12px",
                          opacity: 0.8,
                          marginTop: "3px",
                        }}
                      >
                        {market.market_type} · Market #
                        {market.id}
                      </div>
                    </div>

                    <span>
                      {market.is_active
                        ? "🟢 ACTIVE"
                        : "🔴 INACTIVE"}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      display: "grid",
                      gap: "10px",
                    }}
                  >
                    {marketOdds.length === 0 ? (
                      <p
                        style={{
                          color: "#64748b",
                          margin: "10px 0",
                        }}
                      >
                        No odds in this market.
                      </p>
                    ) : (
                      marketOdds.map((odd) => (
                        <div
                          key={odd.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "1fr 150px auto auto",
                            gap: "10px",
                            alignItems: "center",
                            padding: "13px",
                            borderRadius: "10px",
                            background: odd.is_active
                              ? "#f8fafc"
                              : "#f1f5f9",
                            border:
                              "1px solid #e2e8f0",
                          }}
                        >
                          <div>
                            <strong>
                              {odd.name}
                            </strong>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                              }}
                            >
                              Odd #{odd.id}
                            </div>
                          </div>

                          <input
                            type="number"
                            min="1.01"
                            step="0.01"
                            value={getOddValue(odd)}
                            onChange={(event) =>
                              updateEditedValue(
                                odd.id,
                                event.target.value
                              )
                            }
                            style={{
                              width: "100%",
                              padding: "10px",
                              borderRadius: "8px",
                              border: "2px solid #cbd5e1",
                              fontSize: "17px",
                              fontWeight: 800,
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => saveOdd(odd)}
                            disabled={
                              saving === odd.id
                            }
                            style={{
                              padding: "10px 16px",
                              border: 0,
                              borderRadius: "8px",
                              background: "#2563eb",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {saving === odd.id
                              ? "Saving..."
                              : "💾 Save"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleOdd(odd)
                            }
                            style={{
                              padding: "10px 14px",
                              border: 0,
                              borderRadius: "8px",
                              background:
                                odd.is_active
                                  ? "#fee2e2"
                                  : "#dcfce7",
                              color:
                                odd.is_active
                                  ? "#991b1b"
                                  : "#166534",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {odd.is_active
                              ? "Disable"
                              : "Enable"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
