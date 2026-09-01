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

  const selections = betSlip?.selections || [];

  /*
   * The public API returns:
   *
   * match.markets[].odds[]
   *
   * Find the 1X2 / Match Result market first.
   */
  const markets = Array.isArray(match.markets)
    ? match.markets
    : [];

  const resultMarket =
    markets.find((market) => {
      const name = String(
        market.name || ""
      ).toLowerCase();

      const type = String(
        market.market_type || ""
      ).toLowerCase();

      return (
        type === "1x2" ||
        type === "match_result" ||
        type === "match result" ||
        name === "1x2" ||
        name.includes("match result")
      );
    }) || markets[0];

  const marketOdds = Array.isArray(resultMarket?.odds)
    ? resultMarket.odds.filter(
        (odd) => odd && odd.is_active !== false
      )
    : [];

  /*
   * Match admin-created odds to HOME / DRAW / AWAY.
   *
   * This supports common names such as:
   * Home, Draw, Away
   * 1, X, 2
   * Chelsea, Draw, Brighton
   */
  function findOdd(type) {
    const normalizedHome = String(
      homeTeamName || ""
    )
      .trim()
      .toLowerCase();

    const normalizedAway = String(
      awayTeamName || ""
    )
      .trim()
      .toLowerCase();

    return marketOdds.find((odd) => {
      const name = String(
        odd.name || ""
      )
        .trim()
        .toLowerCase();

      if (type === "HOME") {
        return (
          name === "1" ||
          name === "home" ||
          name === normalizedHome ||
          name.includes("home")
        );
      }

      if (type === "DRAW") {
        return (
          name === "x" ||
          name === "draw" ||
          name.includes("draw")
        );
      }

      if (type === "AWAY") {
        return (
          name === "2" ||
          name === "away" ||
          name === normalizedAway ||
          name.includes("away")
        );
      }

      return false;
    });
  }

  const homeOdd = findOdd("HOME");
  const drawOdd = findOdd("DRAW");
  const awayOdd = findOdd("AWAY");

  const homeOdds =
    homeOdd?.value !== undefined
      ? Number(homeOdd.value)
      : null;

  const drawOdds =
    drawOdd?.value !== undefined
      ? Number(drawOdd.value)
      : null;

  const awayOdds =
    awayOdd?.value !== undefined
      ? Number(awayOdd.value)
      : null;

  function formatOdd(value) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "—";
    }

    return Number(value).toFixed(2);
  }

  function isSelected(type) {
    return selections.some(
      (item) =>
        Number(item.match_id) === Number(match.id) &&
        item.selection === type
    );
  }

  function addBet(type, odd, oddObject) {
    if (
      odd === null ||
      odd === undefined ||
      !Number.isFinite(Number(odd)) ||
      Number(odd) <= 0
    ) {
      return;
    }

    const selection = {
      match_id: match.id,
      market_id: resultMarket?.id || null,
      odd_id: oddObject?.id || null,
      market:
        resultMarket?.market_type ||
        resultMarket?.name ||
        "1X2",
      selection: type,
      odds: Number(odd),
      home_team: homeTeamName,
      away_team: awayTeamName,
    };

    if (
      typeof betSlip?.toggleSelection ===
      "function"
    ) {
      betSlip.toggleSelection(selection);
      return;
    }

    if (
      typeof betSlip?.addSelection ===
      "function"
    ) {
      betSlip.addSelection(selection);
    }
  }

  const scheduledTime =
    match.time ||
    (match.scheduled_at
      ? new Date(
          match.scheduled_at
        ).toLocaleTimeString(
          "en-KE",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )
      : "");

  return (
    <article
      className={`bb-match-card ${
        live ? "is-live" : ""
      }`}
    >
      <div className="bb-match-card-top">
        <span className="bb-league">
          {live && (
            <i className="bb-live-dot small" />
          )}

          {leagueName || "Football"}
        </span>

        <span
          className={
            live
              ? "bb-match-time live-time"
              : "bb-match-time"
          }
        >
          {live
            ? "LIVE"
            : scheduledTime || "—"}
        </span>
      </div>

      <div className="bb-teams">
        <div className="bb-team">
          <div className="bb-team-logo">
            {homeTeamName?.charAt(0) || "H"}
          </div>

          <strong>
            {homeTeamName || "Home"}
          </strong>

          {live && (
            <b className="bb-live-score">
              {match.home_score ?? 0}
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

          <strong>
            {awayTeamName || "Away"}
          </strong>

          {live && (
            <b className="bb-live-score">
              {match.away_score ?? 0}
            </b>
          )}
        </div>
      </div>

      <div className="bb-market-label">
        <span>1X2</span>
        <span>
          {resultMarket?.name ||
            "Match Result"}
        </span>
      </div>

      <div className="bb-odds">
        <button
          type="button"
          disabled={homeOdds === null}
          className={
            isSelected("HOME")
              ? "bb-odd-selected"
              : ""
          }
          onClick={() =>
            addBet(
              "HOME",
              homeOdds,
              homeOdd
            )
          }
        >
          <small>1</small>
          <strong>
            {formatOdd(homeOdds)}
          </strong>
        </button>

        <button
          type="button"
          disabled={drawOdds === null}
          className={
            isSelected("DRAW")
              ? "bb-odd-selected"
              : ""
          }
          onClick={() =>
            addBet(
              "DRAW",
              drawOdds,
              drawOdd
            )
          }
        >
          <small>X</small>
          <strong>
            {formatOdd(drawOdds)}
          </strong>
        </button>

        <button
          type="button"
          disabled={awayOdds === null}
          className={
            isSelected("AWAY")
              ? "bb-odd-selected"
              : ""
          }
          onClick={() =>
            addBet(
              "AWAY",
              awayOdds,
              awayOdd
            )
          }
        >
          <small>2</small>
          <strong>
            {formatOdd(awayOdds)}
          </strong>
        </button>

        <button
          type="button"
          className="bb-more-odds"
        >
          <strong>
            +{Math.max(
              0,
              markets.reduce(
                (total, market) =>
                  total +
                  (Array.isArray(
                    market.odds
                  )
                    ? market.odds.length
                    : 0),
                0
              ) - 3
            )}
          </strong>

          <small>markets</small>
        </button>
      </div>
    </article>
  );
}
