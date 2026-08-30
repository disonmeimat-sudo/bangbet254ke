import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBetSlip } from "../../context/BetSlipContext";
import MatchCard from "../../components/matches/MatchCard";
import BetSlip from "../../components/betting/BetSlip";

const demoMatches = [
  { id: 1, league: "Premier League", time: "16:00", home_team: "Chelsea", away_team: "Brighton", home_odds: "1.91", draw_odds: "3.70", away_odds: "4.10" },
  { id: 2, league: "Premier League", time: "18:30", home_team: "Arsenal", away_team: "Aston Villa", home_odds: "1.55", draw_odds: "4.20", away_odds: "5.80" },
  { id: 3, league: "La Liga", time: "21:00", home_team: "Barcelona", away_team: "Sevilla", home_odds: "1.42", draw_odds: "4.80", away_odds: "6.50" },
  { id: 4, league: "Serie A", time: "20:45", home_team: "Inter Milan", away_team: "Roma", home_odds: "1.68", draw_odds: "3.90", away_odds: "5.10" },
];

const liveMatches = [
  { id: 101, league: "Premier League", time: "72'", home_team: "Liverpool", away_team: "Newcastle", home_score: 2, away_score: 1, home_odds: "1.35", draw_odds: "4.50", away_odds: "8.20", live: true },
  { id: 102, league: "La Liga", time: "58'", home_team: "Real Madrid", away_team: "Valencia", home_score: 1, away_score: 0, home_odds: "1.28", draw_odds: "5.20", away_odds: "10.00", live: true },
];

function SportIcon({ icon, label }) {
  return (
    <button className="sport-item">
      <span className="sport-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const {
    selections = [],
    betHistory = [],
  } = useBetSlip();
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");

  const balance =
    user?.balance ??
    user?.wallet_balance ??
    user?.available_balance ??
    0;

  function go(section) {
    setTab(section);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="bb-loading">
        <div className="bb-spinner" />
        <span>Loading BangBet254...</span>
      </div>
    );
  }

  return (
    <div className="bb-app">

      {/* HEADER */}
      <header className="bb-header">
        <div className="bb-header-top">
          <div className="bb-brand">
            BANGBET<span>254</span>
          </div>

          <div className="bb-header-actions">
            <button className="bb-search-button">🔍</button>

            <button
              className="bb-account"
              onClick={() => go("me")}
            >
              <span className="bb-avatar">👤</span>

              <span className="bb-account-info">
                <strong>
                  {user?.full_name || "Account"}
                </strong>
                <small>
                  KSh {Number(balance).toLocaleString()}
                </small>
              </span>
            </button>
          </div>
        </div>

        <div className="bb-main-nav">
          <button
            className={`bb-main-nav-item ${tab === "home" ? "active" : ""}`}
            onClick={() => go("home")}
          >
            ⚽ Sports
          </button>

          <button
            className={`bb-main-nav-item ${tab === "live" ? "active" : ""}`}
            onClick={() => go("live")}
          >
            🔴 Live
          </button>

          <div className="bb-nav-search">
            <span>🔍</span>
            <input placeholder="Search teams, leagues..." />
          </div>
        </div>
      </header>

      {/* HOME */}
      {tab === "home" && (
        <>
          <section className="bb-sports-strip">
            <div className="bb-sports-scroll">
              <SportIcon icon="⚽" label="Football" />
              <SportIcon icon="🏆" label="Jackpot" />
              <SportIcon icon="🎯" label="Virtuals" />
              <SportIcon icon="🎟️" label="Pick12" />
              <SportIcon icon="🤝" label="Affiliate" />
              <SportIcon icon="🔥" label="Popular" />
              <SportIcon icon="▦" label="All Sports" />
            </div>
          </section>

          <main className="bb-content">

            <div className="bb-competition-scroll">
              <button className="bb-competition active">
                Today's Football
              </button>
              <button className="bb-competition">
                Euro Top 5
              </button>
              <button className="bb-competition">
                Champions League
              </button>
              <button className="bb-competition">
                Premier League
              </button>
              <button className="bb-competition">
                La Liga
              </button>
            </div>

            <div className="bb-promo">
              <div>
                <span className="bb-promo-small">
                  BANGBET254
                </span>
                <strong>
                  Bet on today's biggest matches
                </strong>
                <p>
                  More matches. More markets. More excitement.
                </p>
              </div>

              <div className="bb-promo-ball">⚽</div>
            </div>

            <section className="bb-section">
              <div className="bb-section-heading">
                <div>
                  <span className="bb-section-kicker">TODAY</span>
                  <h2>Top Matches</h2>
                </div>

                <button
                  className="bb-view-all"
                  onClick={() => navigate("/matches")}
                >
                  View all →
                </button>
              </div>

              <div className="bb-matches-grid">
                {demoMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                  />
                ))}
              </div>
            </section>

            <section className="bb-section">
              <div className="bb-section-heading">
                <div className="bb-live-heading">
                  <span className="bb-live-dot" />
                  <div>
                    <span className="bb-section-kicker">
                      LIVE NOW
                    </span>
                    <h2>Live Football</h2>
                  </div>
                </div>

                <button
                  className="bb-view-all"
                  onClick={() => go("live")}
                >
                  All live →
                </button>
              </div>

              <div className="bb-live-grid">
                {liveMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    live
                  />
                ))}
              </div>
            </section>

          </main>
        </>
      )}

      {/* LIVE */}
      {tab === "live" && (
        <main className="bb-content bb-dashboard-page">
          <div className="bb-page-title">
            <span className="bb-section-kicker">LIVE NOW</span>
            <h1>Live Matches 🔴</h1>
            <p>Follow live matches and select your odds.</p>
          </div>

          <div className="bb-live-grid">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                live
              />
            ))}
          </div>
        </main>
      )}

      {/* WIN / BETSLIP */}
      {tab === "win" && (
        <main className="bb-content bb-dashboard-page">
          <div className="bb-page-title">
            <span className="bb-section-kicker">YOUR BET</span>
            <h1>Win 🎯</h1>
            <p>Review your selections and possible winnings.</p>
          </div>

          <div className="bb-dashboard-betslip">
            <BetSlip />
          </div>
        </main>
      )}

      {/* MY BETS */}
      {tab === "mybets" && (
        <main className="bb-content bb-dashboard-page">
          <div className="bb-page-title">
            <span className="bb-section-kicker">BETTING</span>
            <h1>My Bets 📋</h1>
            <p>
              Your selected odds and betting history.
            </p>
          </div>

          <section className="bb-my-bets-card">
            <div className="bb-my-bets-header">
              <strong>Current selections</strong>
              <span>{selections.length}</span>
            </div>

            {selections.length === 0 ? (
              <div className="bb-empty-history">
                <div>🎟️</div>
                <strong>No selections yet</strong>
                <p>
                  Select odds from the matches to build your bet.
                </p>

                <button onClick={() => go("home")}>
                  Browse Matches
                </button>
              </div>
            ) : (
              <div className="bb-selection-list">
                {selections.map((selection) => (
                  <div
                    className="bb-history-row"
                    key={selection.match_id}
                  >
                    <div>
                      <strong>
                        {selection.home_team} vs{" "}
                        {selection.away_team}
                      </strong>
                      <small>
                        {selection.selection}
                      </small>
                    </div>

                    <strong>
                      {Number(selection.odds).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bb-my-bets-card">
            <div className="bb-my-bets-header">
              <strong>Bet history</strong>
              <span>{betHistory.length}</span>
            </div>

            {betHistory.length === 0 ? (
              <div className="bb-empty-history">
                <div>📊</div>
                <strong>No bets yet</strong>
                <p>
                  Bets you place will appear here with all
                  selected matches and odds.
                </p>
              </div>
            ) : (
              <div className="bb-bet-history-list">
                {betHistory.map((bet) => (
                  <article
                    className="bb-bet-history-card"
                    key={bet.id}
                  >
                    <div className="bb-bet-history-top">
                      <div>
                        <strong>{bet.id}</strong>
                        <small>
                          {new Date(bet.created_at).toLocaleString(
                            "en-KE",
                            {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }
                          )}
                        </small>
                      </div>

                      <span className="bb-bet-status">
                        {bet.status || "Pending"}
                      </span>
                    </div>

                    <div className="bb-bet-history-selections">
                      {bet.selections?.map((selection, index) => (
                        <div
                          className="bb-bet-history-selection"
                          key={`${bet.id}-${selection.match_id}-${index}`}
                        >
                          <div>
                            <strong>
                              {selection.home_team} vs{" "}
                              {selection.away_team}
                            </strong>

                            <small>
                              {selection.selection}
                            </small>
                          </div>

                          <strong>
                            {Number(selection.odds).toFixed(2)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="bb-bet-history-summary">
                      <div>
                        <span>Stake</span>
                        <strong>
                          KSh{" "}
                          {Number(bet.stake).toLocaleString(
                            "en-KE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Total Odds</span>
                        <strong>
                          {Number(bet.total_odds).toFixed(2)}
                        </strong>
                      </div>

                      <div>
                        <span>Possible Win</span>
                        <strong>
                          KSh{" "}
                          {Number(bet.possible_win).toLocaleString(
                            "en-KE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ME */}
      {tab === "me" && (
        <main className="bb-content bb-dashboard-page">

          <div className="bb-profile-hero">
            <div className="bb-profile-avatar">👤</div>

            <div>
              <span>Welcome back</span>
              <h1>{user?.full_name || "User"}</h1>
              <small>{user?.email || ""}</small>
            </div>
          </div>

          <div className="bb-balance-card">
            <span>AVAILABLE BALANCE</span>
            <strong>
              KSh {Number(balance).toLocaleString()}
            </strong>

            <div className="bb-wallet-actions">
              <button onClick={() => navigate("/wallet")}>
                💰 Wallet
              </button>

              <button onClick={() => navigate("/wallet")}>
                ➕ Deposit
              </button>

              <button onClick={() => navigate("/wallet")}>
                ↗ Withdraw
              </button>
            </div>
          </div>

          <div className="bb-account-menu">
            <button onClick={() => navigate("/profile")}>
              <span>👤</span>
              <div>
                <strong>Profile</strong>
                <small>Manage your account</small>
              </div>
              <b>›</b>
            </button>

            <button onClick={() => navigate("/wallet")}>
              <span>💰</span>
              <div>
                <strong>Wallet</strong>
                <small>Deposit and withdraw</small>
              </div>
              <b>›</b>
            </button>

            <button onClick={() => navigate("/transactions")}>
              <span>📋</span>
              <div>
                <strong>Transactions</strong>
                <small>View account activity</small>
              </div>
              <b>›</b>
            </button>

            <button onClick={handleLogout}>
              <span>🚪</span>
              <div>
                <strong>Logout</strong>
                <small>Sign out of BangBet254</small>
              </div>
              <b>›</b>
            </button>
          </div>

        </main>
      )}

      {/* DESKTOP BETSLIP */}
      {tab === "home" && (
        <div className="bb-betslip-floating">
          <BetSlip />
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="bb-bottom-nav"
        style={{
          display: "flex",
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "72px",
          background: "red",
          zIndex: 999999999,
        }}
      >

        <button
          onClick={() => go("home")}
          className={`bb-bottom-item ${tab === "home" ? "active" : ""}`}
        >
          <span>🏠</span>
          <small>Home</small>
        </button>

        <button
          onClick={() => go("live")}
          className={`bb-bottom-item ${tab === "live" ? "active" : ""}`}
        >
          <span>🔴</span>
          <small>Live</small>
        </button>

        <button
          onClick={() => go("win")}
          className={`bb-bottom-item bb-win-nav ${tab === "win" ? "active" : ""}`}
        >
          <span>🎯</span>
          <small>Win</small>

          {selections.length > 0 && (
            <b>{selections.length}</b>
          )}
        </button>

        <button
          onClick={() => go("mybets")}
          className={`bb-bottom-item ${tab === "mybets" ? "active" : ""}`}
        >
          <span>📋</span>
          <small>My Bets</small>
        </button>

        <button
          onClick={() => go("me")}
          className={`bb-bottom-item ${tab === "me" ? "active" : ""}`}
        >
          <span>👤</span>
          <small>Me</small>
        </button>

      </nav>
    </div>
  );
}
