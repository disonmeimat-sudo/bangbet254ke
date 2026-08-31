import { useBetSlip } from "../../context/BetSlipContext";

export default function MatchCard({ match, live = false }) {
  const betSlip = useBetSlip();

  const leagueName =
    typeof match.league === "object"
      ? match.league?.name
      : match.league;

  const homeTeamName =
    typeof match.home_team === "object"
      ? match.home_team?.name
      : match.home_team;

  const awayTeamName =
    typeof match.away_team === "object"
      ? match.away_team?.name
      : match.away_team;

  function addBet(type, odd) {
    const selection = {
      match_id: match.id,
      market: type,
      selection: type,
      odds: Number(odd),
      home_team: homeTeamName,
      away_team: awayTeamName,
    };

    if (typeof betSlip?.addSelection === "function") {
      betSlip.addSelection(selection);
      return;
    }

    if (typeof betSlip?.addBet === "function") {
      betSlip.addBet(selection);
    }
  }

  return (
    <article className={`bb-match-card ${live ? "is-live" : ""}`}>
      <div className="bb-match-card-top">
        <span className="bb-league">
          {live && <i className="bb-live-dot small" />}
          {leagueName || "Football"}
        </span>

        <span
          className={
            live ? "bb-match-time live-time" : "bb-match-time"
          }
        >
          {match.time}
        </span>
      </div>

      <div className="bb-teams">
        <div className="bb-team">
          <div className="bb-team-logo">
            {homeTeamName?.charAt(0) || "H"}
          </div>

          <strong>{homeTeamName || "Home"}</strong>

          {live && (
            <b className="bb-live-score">
              {match.home_score}
            </b>
          )}
        </div>

        <div className="bb-vs">
          {live ? "LIVE" : "VS"}
        </div>

        <div className="bb-team away">
          <div className="bb-team-logo">
            {awayTeamName?.charAt(0) || "A"}
          </div>

          <strong>{awayTeamName || "Away"}</strong>

          {live && (
            <b className="bb-live-score">
              {match.away_score}
            </b>
          )}
        </div>
      </div>

      <div className="bb-market-label">
        <span>1X2</span>
        <span>Match Result</span>
      </div>

      <div className="bb-odds">
        <button onClick={() => addBet("HOME", match.home_odds)}>
          <small>1</small>
          <strong>{match.home_odds}</strong>
        </button>

        <button onClick={() => addBet("DRAW", match.draw_odds)}>
          <small>X</small>
          <strong>{match.draw_odds}</strong>
        </button>

        <button onClick={() => addBet("AWAY", match.away_odds)}>
          <small>2</small>
          <strong>{match.away_odds}</strong>
        </button>

        <button className="bb-more-odds">
          <strong>+12</strong>
          <small>markets</small>
        </button>
      </div>
    </article>
  );
}
