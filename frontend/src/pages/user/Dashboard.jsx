import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBetSlip } from "../../context/BetSlipContext";
import MatchCard from "../../components/matches/MatchCard";
import BetSlip from "../../components/betting/BetSlip";
import { getPublicMatches } from "../../api/matches";

function SportIcon({ icon, label }) {
  return (
    <button className="sport-item" type="button">
      <span className="sport-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function normalizeMatch(match) {
  return {
    ...match,

    league:
      match.league ||
      match.league_name ||
      {
        name: match.league?.name || match.league_name || "Football",
      },

    home_team:
      typeof match.home_team === "string"
        ? match.home_team
        : match.home_team?.name ||
          match.home_team_name ||
          "Home",

    away_team:
      typeof match.away_team === "string"
        ? match.away_team
        : match.away_team?.name ||
          match.away_team_name ||
          "Away",

    home_score: Number(match.home_score ?? 0),
    away_score: Number(match.away_score ?? 0),

    is_live:
      Boolean(match.is_live) ||
      String(match.status || "").toLowerCase() === "live",

    is_betting_open:
      match.is_betting_open !== false,

    markets: Array.isArray(match.markets)
      ? match.markets
      : [],

    odds: Array.isArray(match.odds)
      ? match.odds
      : [],
  };
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();

  const {
    selections = [],
    betHistory = [],
    setSlipOpen,
  } = useBetSlip();

  const navigate = useNavigate();

  const [tab, setTab] = useState("home");
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");

  async function loadMatches() {
    try {
      setMatchesLoading(true);
      setMatchesError("");

      const data = await getPublicMatches();

      const normalized = Array.isArray(data)
        ? data.map(normalizeMatch)
        : [];

      setMatches(normalized);
    } catch (err) {
      console.error("BangBet254 public matches error:", err);

      setMatchesError(
        err.response?.data?.detail ||
        "Unable to load matches from BangBet254."
      );

      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();

    const interval = setInterval(() => {
      loadMatches();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const liveMatches = useMemo(
    () => matches.filter((match) => match.is_live),
    [matches]
  );

  const upcomingMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          !match.is_live &&
          match.is_betting_open !== false
      ),
    [matches]
  );

  /*
   * TOP MATCHES
   *
   * Every upcoming/betting-open match returned by the
   * public matches API should appear on the main dashboard.
   *
   * "is_featured" is NOT required for a match to appear here.
   * Featured matches can still be used later for ordering.
   */
  const displayTopMatches = useMemo(
    () => upcomingMatches.slice(0, 12),
    [upcomingMatches]
  );

  const balance =
    user?.balance ??
    user?.wallet_balance ??
    user?.available_balance ??
    0;

  function go(section) {
    setTab(section);

    if (section === "win") {
      setSlipOpen(true);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

            <button
              className="bb-search-button"
              type="button"
            >
              🔍
            </button>

            <button
              className="bb-account"
              type="button"
              onClick={() => go("me")}
            >
              <span className="bb-avatar">
                👤
              </span>

              <span className="bb-account-info">
                <strong>
                  {user?.full_name || "Account"}
                </strong>

                <small>
                  KSh{" "}
                  {Number(balance).toLocaleString(
                    "en-KE"
                  )}
                </small>
              </span>
            </button>

          </div>
        </div>

        <div className="bb-main-nav">

          <button
            className={`bb-main-nav-item ${
              tab === "home" ? "active" : ""
            }`}
            type="button"
            onClick={() => go("home")}
          >
            ⚽ Sports
          </button>

          <button
            className={`bb-main-nav-item ${
              tab === "live" ? "active" : ""
            }`}
            type="button"
            onClick={() => go("live")}
          >
            🔴 Live
            {liveMatches.length > 0 && (
              <b>{liveMatches.length}</b>
            )}
          </button>

          <div className="bb-nav-search">
            <span>🔍</span>
            <input
              placeholder="Search teams, leagues..."
            />
          </div>

        </div>
      </header>

      {/* HOME */}
      {tab === "home" && (
        <>
          <section className="bb-sports-strip">
            <div className="bb-sports-scroll">

              <SportIcon
                icon="⚽"
                label="Football"
              />

              <SportIcon
                icon="🏆"
                label="Jackpot"
              />

              <SportIcon
                icon="🎯"
                label="Virtuals"
              />

              <SportIcon
                icon="🎟️"
                label="Pick12"
              />

              <SportIcon
                icon="🤝"
                label="Affiliate"
              />

              <SportIcon
                icon="🔥"
                label="Popular"
              />

              <SportIcon
                icon="▦"
                label="All Sports"
              />

            </div>
          </section>

          <main className="bb-content">

            {/* COMPETITIONS */}
            <div className="bb-competition-scroll">

              <button
                className="bb-competition active"
                type="button"
              >
                Today's Football
              </button>

              <button
                className="bb-competition"
                type="button"
              >
                Euro Top 5
              </button>

              <button
                className="bb-competition"
                type="button"
              >
                Champions League
              </button>

              <button
                className="bb-competition"
                type="button"
              >
                Premier League
              </button>

              <button
                className="bb-competition"
                type="button"
              >
                La Liga
              </button>

            </div>

            {/* PROMO */}
            <div className="bb-promo">
              <div>
                <span className="bb-promo-small">
                  BANGBET254
                </span>

                <strong>
                  Bet on today's biggest matches
                </strong>

                <p>
                  Matches and odds are managed from the
                  BangBet254 admin panel.
                </p>
              </div>

              <div className="bb-promo-ball">
                ⚽
              </div>
            </div>

            {/* LOADING */}
            {matchesLoading && (
              <section className="bb-section">
                <div className="bb-page-title">
                  <span className="bb-section-kicker">
                    BANGBET254
                  </span>

                  <h2>
                    Loading matches...
                  </h2>

                  <p>
                    Getting the latest games and betting
                    markets.
                  </p>
                </div>
              </section>
            )}

            {/* ERROR */}
            {!matchesLoading && matchesError && (
              <section className="bb-section">

                <div className="bb-empty-history">
                  <div>⚠️</div>

                  <strong>
                    Unable to load matches
                  </strong>

                  <p>
                    {matchesError}
                  </p>

                  <button
                    type="button"
                    onClick={loadMatches}
                  >
                    Try Again
                  </button>
                </div>

              </section>
            )}

            {/* TOP MATCHES */}
            {!matchesLoading &&
              !matchesError && (
                <section className="bb-section">

                  <div className="bb-section-heading">

                    <div>
                      <span className="bb-section-kicker">
                        TODAY
                      </span>

                      <h2>
                        Top Matches
                      </h2>
                    </div>

                    <button
                      className="bb-view-all"
                      type="button"
                      onClick={() =>
                        navigate("/matches")
                      }
                    >
                      View all →
                    </button>

                  </div>

                  {displayTopMatches.length === 0 ? (
                    <div className="bb-empty-history">

                      <div>⚽</div>

                      <strong>
                        No matches available
                      </strong>

                      <p>
                        Games created and activated by
                        the BangBet254 admin will appear
                        here automatically.
                      </p>

                    </div>
                  ) : (
                    <div className="bb-matches-grid">

                      {displayTopMatches.map(
                        (match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                          />
                        )
                      )}

                    </div>
                  )}

                </section>
              )}

            {/* LIVE MATCHES */}
            {!matchesLoading &&
              !matchesError &&
              liveMatches.length > 0 && (
                <section className="bb-section">

                  <div className="bb-section-heading">

                    <div className="bb-live-heading">

                      <span className="bb-live-dot" />

                      <div>
                        <span className="bb-section-kicker">
                          LIVE NOW
                        </span>

                        <h2>
                          Live Football
                        </h2>
                      </div>

                    </div>

                    <button
                      className="bb-view-all"
                      type="button"
                      onClick={() => go("live")}
                    >
                      All live →
                    </button>

                  </div>

                  <div className="bb-live-grid">

                    {liveMatches.map(
                      (match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          live
                        />
                      )
                    )}

                  </div>

                </section>
              )}

            {/* NO LIVE */}
            {!matchesLoading &&
              !matchesError &&
              liveMatches.length === 0 && (
                <section className="bb-section">

                  <div className="bb-section-heading">

                    <div>
                      <span className="bb-section-kicker">
                        LIVE NOW
                      </span>

                      <h2>
                        Live Football
                      </h2>
                    </div>

                  </div>

                  <div className="bb-empty-history">

                    <div>🔴</div>

                    <strong>
                      No live matches
                    </strong>

                    <p>
                      Live games will appear here when
                      the admin marks a match as live.
                    </p>

                  </div>

                </section>
              )}

          </main>
        </>
      )}

      {/* LIVE TAB */}
      {tab === "live" && (
        <main className="bb-content bb-dashboard-page">

          <div className="bb-page-title">

            <span className="bb-section-kicker">
              LIVE NOW
            </span>

            <h1>
              Live Matches 🔴
            </h1>

            <p>
              Live matches and their current scores and
              betting markets.
            </p>

          </div>

          {matchesLoading ? (
            <div className="bb-empty-history">
              <div>⏳</div>
              <strong>
                Loading live matches...
              </strong>
            </div>
          ) : matchesError ? (
            <div className="bb-empty-history">
              <div>⚠️</div>
              <strong>
                Unable to load live matches
              </strong>
              <p>{matchesError}</p>
              <button
                type="button"
                onClick={loadMatches}
              >
                Try Again
              </button>
            </div>
          ) : liveMatches.length === 0 ? (
            <div className="bb-empty-history">
              <div>🔴</div>
              <strong>
                No live matches
              </strong>
              <p>
                Matches marked LIVE by the admin will
                automatically appear here.
              </p>
            </div>
          ) : (
            <div className="bb-live-grid">

              {liveMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  live
                />
              ))}

            </div>
          )}

        </main>
      )}

      {/* WIN / BETSLIP */}
      {tab === "win" && (
        <main className="bb-content bb-dashboard-page">

          <div className="bb-page-title">

            <span className="bb-section-kicker">
              YOUR BET
            </span>

            <h1>
              Your Bet 🎯
            </h1>

            <p>
              Your selected matches and odds.
            </p>

          </div>

          <div className="bb-dashboard-betslip">
            <BetSlip fullPage />
          </div>

        </main>
      )}

      {/* MY BETS */}
      {tab === "mybets" && (
        <main className="bb-content bb-dashboard-page">

          <div className="bb-page-title">

            <span className="bb-section-kicker">
              BETTING
            </span>

            <h1>
              My Bets 📋
            </h1>

            <p>
              Your selected odds and betting history.
            </p>

          </div>

          <section className="bb-my-bets-card">

            <div className="bb-my-bets-header">
              <strong>
                Current selections
              </strong>

              <span>
                {selections.length}
              </span>
            </div>

            {selections.length === 0 ? (
              <div className="bb-empty-history">

                <div>🎟️</div>

                <strong>
                  No selections yet
                </strong>

                <p>
                  Select odds from the matches to build
                  your bet.
                </p>

                <button
                  type="button"
                  onClick={() => go("home")}
                >
                  Browse Matches
                </button>

              </div>
            ) : (
              <div className="bb-selection-list">

                {selections.map(
                  (selection) => (
                    <div
                      className="bb-history-row"
                      key={
                        selection.match_id
                      }
                    >

                      <div>
                        <strong>
                          {selection.home_team}{" "}
                          vs{" "}
                          {selection.away_team}
                        </strong>

                        <small>
                          {selection.selection}
                        </small>
                      </div>

                      <strong>
                        {Number(
                          selection.odds
                        ).toFixed(2)}
                      </strong>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          <section className="bb-my-bets-card">

            <div className="bb-my-bets-header">
              <strong>
                Bet history
              </strong>

              <span>
                {betHistory.length}
              </span>
            </div>

            {betHistory.length === 0 ? (
              <div className="bb-empty-history">

                <div>📊</div>

                <strong>
                  No bets yet
                </strong>

                <p>
                  Bets you place will appear here with
                  all selected matches and odds.
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
                        <strong>
                          {bet.id}
                        </strong>

                        <small>
                          {new Date(
                            bet.created_at
                          ).toLocaleString(
                            "en-KE",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            }
                          )}
                        </small>
                      </div>

                      <span className="bb-bet-status">
                        {bet.status ||
                          "Pending"}
                      </span>

                    </div>

                    <div className="bb-bet-history-selections">

                      {bet.selections?.map(
                        (
                          selection,
                          index
                        ) => (
                          <div
                            className="bb-bet-history-selection"
                            key={`${bet.id}-${selection.match_id}-${index}`}
                          >

                            <div>

                              <strong>
                                {
                                  selection.home_team
                                }{" "}
                                vs{" "}
                                {
                                  selection.away_team
                                }
                              </strong>

                              <small>
                                {
                                  selection.selection
                                }
                              </small>

                            </div>

                            <strong>
                              {Number(
                                selection.odds
                              ).toFixed(2)}
                            </strong>

                          </div>
                        )
                      )}

                    </div>

                    <div className="bb-bet-history-summary">

                      <div>
                        <span>
                          Stake
                        </span>

                        <strong>
                          KSh{" "}
                          {Number(
                            bet.stake
                          ).toLocaleString(
                            "en-KE",
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Total Odds
                        </span>

                        <strong>
                          {Number(
                            bet.total_odds
                          ).toFixed(2)}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Possible Win
                        </span>

                        <strong>
                          KSh{" "}
                          {Number(
                            bet.possible_win
                          ).toLocaleString(
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

            <div className="bb-profile-avatar">
              👤
            </div>

            <div>

              <span>
                Welcome back
              </span>

              <h1>
                {user?.full_name ||
                  "User"}
              </h1>

              <small>
                {user?.email || ""}
              </small>

            </div>

          </div>

          <div className="bb-balance-card">

            <span>
              AVAILABLE BALANCE
            </span>

            <strong>
              KSh{" "}
              {Number(
                balance
              ).toLocaleString()}
            </strong>

            <div className="bb-wallet-actions">

              <button
                type="button"
                onClick={() =>
                  navigate("/wallet")
                }
              >
                💰 Wallet
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/wallet?action=deposit")
                }
              >
                ➕ Deposit
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/wallet?action=withdraw")
                }
              >
                ↗ Withdraw
              </button>

            </div>

          </div>

          <div className="bb-account-menu">

            <button
              type="button"
              onClick={() =>
                navigate("/profile")
              }
            >
              <span>👤</span>

              <div>
                <strong>
                  Profile
                </strong>

                <small>
                  Manage your account
                </small>
              </div>

              <b>›</b>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/wallet")
              }
            >
              <span>💰</span>

              <div>
                <strong>
                  Wallet
                </strong>

                <small>
                  Deposit and withdraw
                </small>
              </div>

              <b>›</b>
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/transactions")
              }
            >
              <span>📋</span>

              <div>
                <strong>
                  Transactions
                </strong>

                <small>
                  View account activity
                </small>
              </div>

              <b>›</b>
            </button>

            <button
              type="button"
              onClick={handleLogout}
            >
              <span>🚪</span>

              <div>
                <strong>
                  Logout
                </strong>

                <small>
                  Sign out of BangBet254
                </small>
              </div>

              <b>›</b>
            </button>

          </div>

        </main>
      )}

      {/* DESKTOP BETSLIP */}
      {tab === "home" && selections.length > 0 && (
        <div className="bb-betslip-floating bb-desktop-betslip">
          <BetSlip
            onOpenWin={() => {
              setSlipOpen(true);
              setTab("win");
            }}
          />
        </div>
      )}

      {/* MOBILE FLOATING BET BUTTON */}
      {tab === "home" && selections.length > 0 && (
        <button
          type="button"
          className="bb-mobile-floating-bet"
          onClick={() => {
            setSlipOpen(true);
            setTab("win");
          }}
          aria-label={`Open bet slip with ${selections.length} selections`}
        >
          <span className="bb-mobile-floating-icon">
            🎟️
          </span>

          <span className="bb-mobile-floating-count">
            {selections.length}
          </span>
        </button>
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
          zIndex: 999999999,
        }}
      >

        <button
          type="button"
          onClick={() => go("home")}
          className={`bb-bottom-item ${
            tab === "home"
              ? "active"
              : ""
          }`}
        >
          <span>🏠</span>
          <small>
            Home
          </small>
        </button>

        <button
          type="button"
          onClick={() => go("live")}
          className={`bb-bottom-item ${
            tab === "live"
              ? "active"
              : ""
          }`}
        >
          <span>🔴</span>
          <small>
            Live
          </small>

          {liveMatches.length > 0 && (
            <b>
              {liveMatches.length}
            </b>
          )}
        </button>

        <button
          type="button"
          onClick={() => go("win")}
          className={`bb-bottom-item bb-win-nav ${
            tab === "win"
              ? "active"
              : ""
          }`}
        >
          <span>🎯</span>

          <small>
            Win
          </small>

          {selections.length > 0 && (
            <b>
              {selections.length}
            </b>
          )}

        </button>

        <button
          type="button"
          onClick={() => go("mybets")}
          className={`bb-bottom-item ${
            tab === "mybets"
              ? "active"
              : ""
          }`}
        >
          <span>📋</span>

          <small>
            My Bets
          </small>
        </button>

        <button
          type="button"
          onClick={() => go("me")}
          className={`bb-bottom-item ${
            tab === "me"
              ? "active"
              : ""
          }`}
        >
          <span>👤</span>

          <small>
            Me
          </small>
        </button>

      </nav>

    </div>
  );
}
