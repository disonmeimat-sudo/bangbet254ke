import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

export default function Markets() {
  const [markets, setMarkets] = useState([]);
  const [matches, setMatches] = useState([]);

  const [form, setForm] = useState({
    match_id: "",
    name: "",
    market_type: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    market_type: "",
  });

  const [selectedMatch, setSelectedMatch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [marketsResponse, matchesResponse] =
        await Promise.all([
          api.get("/api/admin/markets"),
          api.get("/api/admin/matches"),
        ]);

      setMarkets(marketsResponse.data);
      setMatches(matchesResponse.data);

      if (
        !selectedMatch &&
        matchesResponse.data.length > 0
      ) {
        setSelectedMatch(
          String(matchesResponse.data[0].id)
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load markets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const matchMap = useMemo(() => {
    const map = {};

    matches.forEach((match) => {
      map[match.id] = match;
    });

    return map;
  }, [matches]);

  function matchLabel(matchId) {
    const match = matchMap[matchId];

    if (!match) {
      return `Match #${matchId}`;
    }

    return `Match #${match.id} — ${match.home_team_id} vs ${match.away_team_id}`;
  }

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function handleCreateChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });

    clearMessages();
  }

  async function createMarket(event) {
    event.preventDefault();

    clearMessages();

    if (!form.match_id) {
      setError("Please select a match.");
      return;
    }

    if (!form.name.trim()) {
      setError("Market name is required.");
      return;
    }

    if (!form.market_type.trim()) {
      setError("Market type is required.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/api/admin/markets", {
        match_id: Number(form.match_id),
        name: form.name.trim(),
        market_type: form.market_type.trim(),
      });

      setForm({
        match_id: form.match_id,
        name: "",
        market_type: "",
      });

      setMessage("Market created successfully.");

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

  function startEditing(market) {
    clearMessages();

    setEditingId(market.id);

    setEditForm({
      name: market.name,
      market_type: market.market_type,
    });
  }

  function cancelEditing() {
    setEditingId(null);

    setEditForm({
      name: "",
      market_type: "",
    });
  }

  async function saveEdit(marketId) {
    clearMessages();

    if (!editForm.name.trim()) {
      setError("Market name is required.");
      return;
    }

    if (!editForm.market_type.trim()) {
      setError("Market type is required.");
      return;
    }

    try {
      setActionLoading(`edit-${marketId}`);

      await api.patch(
        `/api/admin/markets/${marketId}`,
        {
          name: editForm.name.trim(),
          market_type:
            editForm.market_type.trim(),
        },
      );

      setMessage("Market updated successfully.");

      cancelEditing();

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update market."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleMarket(market) {
    clearMessages();

    try {
      setActionLoading(`toggle-${market.id}`);

      await api.patch(
        `/api/admin/markets/${market.id}`,
        {
          is_active: !market.is_active,
        },
      );

      setMessage(
        market.is_active
          ? "Market deactivated."
          : "Market activated."
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update market status."
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteMarket(market) {
    clearMessages();

    const confirmed = window.confirm(
      `Delete "${market.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(`delete-${market.id}`);

      await api.delete(
        `/api/admin/markets/${market.id}`
      );

      setMessage("Market deleted successfully.");

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to delete market."
      );
    } finally {
      setActionLoading(null);
    }
  }

  const visibleMarkets = selectedMatch
    ? markets.filter(
        (market) =>
          String(market.match_id) ===
          String(selectedMatch)
      )
    : markets;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "18px 12px 40px",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 34px)",
              color: "#0f172a",
            }}
          >
            📊 Markets
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Create and manage betting markets for matches.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: "14px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#dcfce7",
              color: "#166534",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "18px",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 4px 14px rgba(15,23,42,.05)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "14px",
              fontSize: "19px",
              color: "#0f172a",
            }}
          >
            ➕ Create Market
          </h2>

          <form onSubmit={createMarket}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "12px",
              }}
            >
              <select
                name="match_id"
                value={form.match_id}
                onChange={handleCreateChange}
                style={inputStyle}
              >
                <option value="">
                  Select match
                </option>

                {matches.map((match) => (
                  <option
                    key={match.id}
                    value={match.id}
                  >
                    {matchLabel(match.id)}
                  </option>
                ))}
              </select>

              <input
                name="name"
                value={form.name}
                onChange={handleCreateChange}
                placeholder="Market name e.g. Match Winner"
                style={inputStyle}
              />

              <input
                name="market_type"
                value={form.market_type}
                onChange={handleCreateChange}
                placeholder="Market type e.g. 1x2"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButton,
                marginTop: "12px",
                width: "100%",
              }}
            >
              {saving
                ? "Creating..."
                : "Create Market"}
            </button>
          </form>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "16px",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 4px 14px rgba(15,23,42,.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "19px",
                  color: "#0f172a",
                }}
              >
                Existing Markets
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                {visibleMarkets.length} market
                {visibleMarkets.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <select
              value={selectedMatch}
              onChange={(e) =>
                setSelectedMatch(e.target.value)
              }
              style={{
                ...inputStyle,
                width: "100%",
                maxWidth: "360px",
              }}
            >
              <option value="">
                All matches
              </option>

              {matches.map((match) => (
                <option
                  key={match.id}
                  value={match.id}
                >
                  {matchLabel(match.id)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Loading markets...
            </div>
          ) : visibleMarkets.length === 0 ? (
            <div
              style={{
                padding: "30px 10px",
                textAlign: "center",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "10px",
              }}
            >
              No markets found.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "10px",
              }}
            >
              {visibleMarkets.map((market) => (
                <div
                  key={market.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "13px",
                    background: market.is_active
                      ? "#ffffff"
                      : "#f8fafc",
                  }}
                >
                  {editingId === market.id ? (
                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <input
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            name: e.target.value,
                          })
                        }
                        placeholder="Market name"
                        style={inputStyle}
                      />

                      <input
                        value={
                          editForm.market_type
                        }
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            market_type:
                              e.target.value,
                          })
                        }
                        placeholder="Market type"
                        style={inputStyle}
                      />

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            saveEdit(market.id)
                          }
                          disabled={
                            actionLoading ===
                            `edit-${market.id}`
                          }
                          style={primaryButton}
                        >
                          {actionLoading ===
                          `edit-${market.id}`
                            ? "Saving..."
                            : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          style={secondaryButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#0f172a",
                              fontSize: "16px",
                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {market.name}
                          </div>

                          <div
                            style={{
                              marginTop: "4px",
                              color: "#64748b",
                              fontSize: "13px",
                              overflowWrap:
                                "anywhere",
                            }}
                          >
                            {matchLabel(
                              market.match_id
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={badgeStyle}
                            >
                              {market.market_type}
                            </span>

                            <span
                              style={{
                                ...badgeStyle,
                                background:
                                  market.is_active
                                    ? "#dcfce7"
                                    : "#fee2e2",
                                color:
                                  market.is_active
                                    ? "#166534"
                                    : "#991b1b",
                              }}
                            >
                              {market.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            flexShrink: 0,
                          }}
                        >
                          #{market.id}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(3,1fr)",
                          gap: "7px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            startEditing(market)
                          }
                          style={
                            secondaryButton
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleMarket(market)
                          }
                          disabled={
                            actionLoading ===
                            `toggle-${market.id}`
                          }
                          style={{
                            ...secondaryButton,
                            color: market.is_active
                              ? "#b45309"
                              : "#166534",
                          }}
                        >
                          {actionLoading ===
                          `toggle-${market.id}`
                            ? "..."
                            : market.is_active
                              ? "Disable"
                              : "Enable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteMarket(market)
                          }
                          disabled={
                            actionLoading ===
                            `delete-${market.id}`
                          }
                          style={{
                            ...secondaryButton,
                            color: "#dc2626",
                          }}
                        >
                          {actionLoading ===
                          `delete-${market.id}`
                            ? "..."
                            : "Delete"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: "44px",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  outline: "none",
};

const primaryButton = {
  minHeight: "44px",
  padding: "10px 14px",
  border: "none",
  borderRadius: "9px",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton = {
  minHeight: "42px",
  padding: "9px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: "9px",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "24px",
  padding: "3px 8px",
  borderRadius: "999px",
  background: "#e0e7ff",
  color: "#3730a3",
  fontSize: "11px",
  fontWeight: 700,
};
