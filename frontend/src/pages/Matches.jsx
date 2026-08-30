import { useEffect, useState } from "react";
import { getPublicMatches } from "../api/matches";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMatches() {
    try {
      setLoading(true);
      setError("");

      const data = await getPublicMatches();

      console.log("BangBet254 matches:", data);

      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("BangBet254 matches error:", err);

      if (err.response) {
        setError(
          `API error ${err.response.status}: ${
            err.response.data?.detail || "Unable to load matches."
          }`
        );
      } else {
        setError(
          "Cannot connect to the BangBet254 API. Make sure the backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <main className="page">
      <div className="page-header">
        <span className="eyebrow">KENYA'S BETTING PLATFORM</span>

        <h1>Matches</h1>

        <p>
          Choose a match and explore the available markets.
        </p>
      </div>

      {loading && (
        <div className="empty-state">
          <h2>Loading matches...</h2>
          <p>Please wait while we connect to BangBet254.</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-box">
          <h2>Connection problem</h2>
          <p>{error}</p>

          <button onClick={loadMatches}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="empty-state">
          <h2>No matches available</h2>

          <p>
            There are currently no matches available for betting.
          </p>

          <small>
            Matches added by the BangBet254 admin will appear here.
          </small>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="matches-grid">
          {matches.map((match) => (
            <article className="match-card" key={match.id}>
              <div className="match-card-top">
                <span>
                  {match.league?.name ||
                    match.league_name ||
                    "Football"}
                </span>

                {match.is_live && (
                  <strong className="live-badge">
                    LIVE
                  </strong>
                )}
              </div>

              <div className="teams">
                <div>
                  <strong>
                    {match.home_team?.name ||
                      match.home_team_name ||
                      "Home"}
                  </strong>

                  <span>HOME</span>
                </div>

                <div className="vs">
                  {match.is_live
                    ? `${match.home_score ?? 0} - ${
                        match.away_score ?? 0
                      }`
                    : "VS"}
                </div>

                <div>
                  <strong>
                    {match.away_team?.name ||
                      match.away_team_name ||
                      "Away"}
                  </strong>

                  <span>AWAY</span>
                </div>
              </div>

              <div className="match-meta">
                <span>
                  {match.status || "scheduled"}
                </span>

                {match.scheduled_at && (
                  <span>
                    {new Date(
                      match.scheduled_at
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
