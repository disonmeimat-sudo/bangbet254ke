import { useEffect, useState } from "react";
import api from "../../api/client";

export default function Dashboard() {
  const [data, setData] = useState({
    users: 0,
    matches: 0,
    leagues: 0,
    odds: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, matches, leagues, odds] =
          await Promise.all([
            api.get("/api/admin/users"),
            api.get("/api/admin/matches"),
            api.get("/api/admin/leagues"),
            api.get("/api/admin/odds"),
          ]);

        setData({
          users: users.data.length,
          matches: matches.data.length,
          leagues: leagues.data.length,
          odds: odds.data.length,
        });
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const cards = [
    {
      icon: "👥",
      title: "Users",
      value: data.users,
    },
    {
      icon: "⚽",
      title: "Matches",
      value: data.matches,
    },
    {
      icon: "🏆",
      title: "Leagues",
      value: data.leagues,
    },
    {
      icon: "🎯",
      title: "Odds",
      value: data.odds,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "20px 12px 40px",
        boxSizing: "border-box",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(22px, 5vw, 30px)",
              color: "#0f172a",
            }}
          >
            📊 Admin Dashboard
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            BangBet254 administration
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "10px",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "12px",
                minHeight: "82px",
                boxSizing: "border-box",
                boxShadow:
                  "0 2px 8px rgba(15,23,42,.05)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  minWidth: "38px",
                  borderRadius: "9px",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "19px",
                }}
              >
                {card.icon}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: "12px",
                    fontWeight: 600,
                    marginBottom: "2px",
                  }}
                >
                  {card.title}
                </div>

                <div
                  style={{
                    color: "#0f172a",
                    fontSize: "22px",
                    lineHeight: 1.1,
                    fontWeight: 800,
                  }}
                >
                  {loading ? "—" : card.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "18px",
            background: "#111827",
            color: "#ffffff",
            borderRadius: "10px",
            padding: "15px",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
            }}
          >
            ⚡ Quick Management
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              color: "#cbd5e1",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Manage users, leagues, teams, matches,
            markets, odds and transactions from the
            navigation menu.
          </p>
        </div>
      </main>
    </div>
  );
}
