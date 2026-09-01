import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBetSlip } from "../context/BetSlipContext";
import MatchCard from "../components/matches/MatchCard";
import BetSlip from "../components/betting/BetSlip";
import { getPublicMatches } from "../api/matches";
import { useEffect, useMemo, useState } from "react";

function SportIcon({ icon, label }) {
  return (
    <button className="sport-item">
      <span className="sport-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function Home() {
  const { loading } = useAuth();
  const { selections = [] } = useBetSlip();
  const navigate = useNavigate();

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  async function loadMatches() {
    try {
      setMatchesLoading(true);

      const data = await getPublicMatches();

      setMatches(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (error) {
      console.error(
        "BangBet254 public matches error:",
        error
      );
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();

    const interval = setInterval(
      loadMatches,
      15000
    );

    return () => clearInterval(interval);
  }, []);

  const upcomingMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          !match.is_live &&
          match.is_betting_open !== false
      ),
    [matches]
  );

  const liveMatches = useMemo(
    () =>
      matches.filter(
        (match) => match.is_live
      ),
    [matches]
  );

  const displayTopMatches =
    upcomingMatches.slice(0, 12);

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
            <button className="bb-search-button" aria-label="Search">
              🔍
            </button>

            <Link to="/login" className="bb-login">
              Login
            </Link>

            <Link to="/register" className="bb-join">
              Sign Up
            </Link>
          </div>
        </div>

        <div className="bb-main-nav">
          <button className="bb-main-nav-item active">
            ⚽ Sports
          </button>
          <button className="bb-main-nav-item">
            🎰 Casino
          </button>

          <div className="bb-nav-search">
            <span>🔍</span>
            <input placeholder="Search teams, leagues..." />
          </div>
        </div>
      </header>

      {/* SPORTS SHORTCUTS */}
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

      {/* COMPETITIONS */}
      <section className="bb-content">
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

        {/* PROMO */}
        <div className="bb-promo">
          <div>
            <span className="bb-promo-small">BANGBET254</span>
            <strong>Bet on today's biggest matches</strong>
            <p>More matches. More markets. More excitement.</p>
          </div>

          <div className="bb-promo-ball">⚽</div>
        </div>

        {/* TOP MATCHES */}
        <section className="bb-section">
          <div className="bb-section-heading">
            <div>
              <span className="bb-section-kicker">TODAY</span>
              <h2>Top Matches</h2>
            </div>

            <Link to="/matches" className="bb-view-all">
              View all →
            </Link>
          </div>

          {matchesLoading ? (
            <div className="empty-state">
              <h2>Loading matches...</h2>
              <p>
                Getting the latest matches and odds.
              </p>
            </div>
          ) : displayTopMatches.length === 0 ? (
            <div className="empty-state">
              <h2>No matches available</h2>
              <p>
                Matches created by the admin will appear here.
              </p>
            </div>
          ) : (
            <div className="bb-matches-grid">
              {displayTopMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                />
              ))}
            </div>
          )}
        </section>

        {/* LIVE */}
        <section className="bb-section">
          <div className="bb-section-heading">
            <div className="bb-live-heading">
              <span className="bb-live-dot" />
              <div>
                <span className="bb-section-kicker">LIVE NOW</span>
                <h2>Live Football</h2>
              </div>
            </div>

            <Link to="/live" className="bb-view-all">
              All live →
            </Link>
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

        {/* QUICK LINKS */}
        <section className="bb-quick-links">
          <Link to="/wallet">
            <span>💰</span>
            <div>
              <strong>Wallet</strong>
              <small>Deposit & withdraw</small>
            </div>
          </Link>

          <Link to="/transactions">
            <span>📋</span>
            <div>
              <strong>Transactions</strong>
              <small>View your activity</small>
            </div>
          </Link>

          <Link to="/profile">
            <span>👤</span>
            <div>
              <strong>My Account</strong>
              <small>Manage profile</small>
            </div>
          </Link>
        </section>

      </section>

      {/* FLOATING BETSLIP */}
      <div className="bb-betslip-floating">
        <BetSlip />
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bb-bottom-nav">
        <Link to="/" className="bb-bottom-item active">
          <span>🏠</span>
          <small>Home</small>
        </Link>

        <Link to="/live" className="bb-bottom-item">
          <span>▶</span>
          <small>Live</small>
        </Link>

        <button className="bb-bottom-item bb-aviator">
          <span>✈️</span>
          <small>Aviator</small>
        </button>

        <Link to="/matches" className="bb-bottom-item bb-bets-nav">
          <span>📋</span>
          <small>My Bets</small>
          {selections.length > 0 && (
            <b>{selections.length}</b>
          )}
        </Link>

        <Link to="/profile" className="bb-bottom-item">
          <span>👤</span>
          <small>Me</small>
        </Link>
      </nav>
    </div>
  );
}
