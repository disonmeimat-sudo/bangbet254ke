import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useBetSlip } from "../../context/BetSlipContext";

const MARKET_GROUPS = [
  {
    key: "result",
    title: "1X2",
    match: (name, type) =>
      type === "1x2" ||
      type === "match_result" ||
      type === "match result" ||
      name === "1x2" ||
      name.includes("match result"),
  },
  {
    key: "btts",
    title: "Both Teams To Score (GG/NG)",
    match: (name, type) =>
      name.includes("both teams") ||
      name.includes("gg/ng") ||
      name.includes("gg ng") ||
      name.includes("both to score") ||
      type.includes("btts"),
  },
  {
    key: "double",
    title: "Double Chance",
    match: (name, type) =>
      name.includes("double chance") ||
      type.includes("double_chance") ||
      type.includes("double chance"),
  },
  {
    key: "total",
    title: "Total",
    match: (name, type) =>
      name === "total" ||
      name.includes("total goals") ||
      name.includes("over/under") ||
      name.includes("over under") ||
      type.includes("over_under") ||
      type.includes("over/under") ||
      type === "total",
  },
  {
    key: "handicap",
    title: "Handicap",
    match: (name, type) =>
      name.includes("handicap") ||
      name.includes("asian handicap") ||
      type.includes("handicap"),
  },
  {
    key: "correct",
    title: "Correct Score",
    match: (name, type) =>
      name.includes("correct score") ||
      type.includes("correct_score") ||
      type.includes("correct score"),
  },
  {
    key: "halftime",
    title: "Half Time",
    match: (name, type) =>
      name.includes("half time") ||
      name.includes("1st half") ||
      name.includes("first half") ||
      type.includes("half_time") ||
      type.includes("first_half"),
  },
];

function getGroup(market) {
  const name = String(market?.name || "").trim().toLowerCase();
  const type = String(market?.market_type || "").trim().toLowerCase();

  const found = MARKET_GROUPS.find((group) =>
    group.match(name, type)
  );

  return found || {
    key: "other",
    title: "Other Markets",
    match: () => false,
  };
}

function formatOdd(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "—";
  }

  return number.toFixed(2);
}

function getTeamName(team, fallback) {
  if (typeof team === "object") {
    return team?.name || fallback;
  }

  return team || fallback;
}

export default function MatchMarkets() {
  const navigate = useNavigate();
  const location = useLocation();
  const { matchId } = useParams();
  const betSlip = useBetSlip();

  const [activeTab, setActiveTab] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [match, setMatch] = useState(
    location.state?.match || null
  );

  /*
   * Save the selected match locally so the market page
   * survives a browser refresh.
   */
  useEffect(() => {
    if (location.state?.match) {
      setMatch(location.state.match);

      try {
        sessionStorage.setItem(
          `bangbet254_market_match_${matchId}`,
          JSON.stringify(location.state.match)
        );
      } catch (error) {
        console.warn(
          "Could not save market match:",
          error
        );
      }

      return;
    }

    try {
      const saved = sessionStorage.getItem(
        `bangbet254_market_match_${matchId}`
      );

      if (saved) {
        setMatch(JSON.parse(saved));
      }
    } catch (error) {
      console.warn(
        "Could not restore market match:",
        error
      );
    }
  }, [location.state, matchId]);

  const markets = useMemo(() => {
    if (!Array.isArray(match?.markets)) {
      return [];
    }

    return match.markets
      .filter((market) => market)
      .map((market, index) => ({
        ...market,
        __index: index,
        odds: Array.isArray(market.odds)
          ? market.odds.filter(
              (odd) =>
                odd &&
                odd.is_active !== false
            )
          : [],
      }))
      .filter((market) => market.odds.length > 0);
  }, [match]);

  const groupedMarkets = useMemo(() => {
    const groups = {};

    markets.forEach((market) => {
      const group = getGroup(market);

      if (!groups[group.key]) {
        groups[group.key] = {
          key: group.key,
          title: group.title,
          markets: [],
        };
      }

      groups[group.key].markets.push(market);
    });

    return Object.values(groups);
  }, [markets]);

  const mainGroups = useMemo(
    () =>
      groupedMarkets.filter((group) =>
        [
          "result",
          "btts",
          "double",
          "total",
          "handicap",
        ].includes(group.key)
      ),
    [groupedMarkets]
  );

  const firstHalfGroups = useMemo(
    () =>
      groupedMarkets.filter((group) =>
        group.key === "halftime" ||
        group.title.toLowerCase().includes("half")
      ),
    [groupedMarkets]
  );

  function visibleGroups() {
    if (activeTab === "main") {
      return mainGroups;
    }

    if (activeTab === "first") {
      return firstHalfGroups;
    }

    return groupedMarkets;
  }

  function toggleMarket(key) {
    setExpanded((current) => ({
      ...current,
      [key]: current[key] === false
        ? true
        : false,
    }));
  }

  function isOddSelected(market, odd) {
    return betSlip?.selections?.some(
      (selection) =>
        Number(selection.match_id) ===
          Number(match?.id) &&
        (
          Number(selection.odd_id) ===
            Number(odd?.id) ||
          (
            selection.market_id &&
            Number(selection.market_id) ===
              Number(market?.id)
          )
        )
    );
  }

  function selectOdd(market, odd) {
    const value = Number(
      odd?.value ??
      odd?.odds ??
      odd?.price
    );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return;
    }

    const homeTeam = getTeamName(
      match?.home_team,
      "Home"
    );

    const awayTeam = getTeamName(
      match?.away_team,
      "Away"
    );

    const selectionName =
      odd?.name ||
      odd?.label ||
      odd?.selection ||
      "Selection";

    const selection = {
      match_id: match.id,
      market_id: market?.id || null,
      odd_id: odd?.id || null,

      market:
        market?.market_type ||
        market?.name ||
        "Market",

      selection: selectionName,
      odds: value,

      home_team: homeTeam,
      away_team: awayTeam,
    };

    if (
      typeof betSlip?.toggleSelection ===
      "function"
    ) {
      betSlip.toggleSelection(selection);
    } else if (
      typeof betSlip?.addSelection ===
      "function"
    ) {
      betSlip.addSelection(selection);
    }
  }

  if (!match) {
    return (
      <main className="bb-markets-page">
        <div className="bb-markets-empty">
          <button
            type="button"
            className="bb-markets-back"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>

          <h2>Match markets unavailable</h2>

          <p>
            Please return to the matches page and
            open the market again.
          </p>
        </div>
      </main>
    );
  }

  const homeTeam = getTeamName(
    match.home_team,
    "Home"
  );

  const awayTeam = getTeamName(
    match.away_team,
    "Away"
  );

  const league =
    typeof match.league === "object"
      ? match.league?.name
      : match.league;

  const groups = visibleGroups();

  return (
    <main className="bb-markets-page">
      <header className="bb-markets-header">
        <button
          type="button"
          className="bb-markets-back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>

        <div className="bb-markets-title">
          <span>Match Markets</span>
          <small>
            {league || "Football"}
          </small>
        </div>

        <button
          type="button"
          className="bb-markets-slip-button"
          onClick={() => {
            if (
              typeof betSlip?.setSlipOpen ===
              "function"
            ) {
              betSlip.setSlipOpen(true);
            }
          }}
        >
          Bet Slip
          {betSlip?.selections?.length > 0 && (
            <b>
              {betSlip.selections.length}
            </b>
          )}
        </button>
      </header>

      <section className="bb-markets-match">
        <div className="bb-markets-team">
          <div className="bb-markets-team-logo">
            {homeTeam.charAt(0)}
          </div>
          <strong>{homeTeam}</strong>
        </div>

        <div className="bb-markets-vs">
          <span>
            {match.live ? "LIVE" : "VS"}
          </span>

          {match.scheduled_at && (
            <small>
              {new Date(
                match.scheduled_at
              ).toLocaleString(
                "en-KE",
                {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </small>
          )}
        </div>

        <div className="bb-markets-team">
          <div className="bb-markets-team-logo">
            {awayTeam.charAt(0)}
          </div>
          <strong>{awayTeam}</strong>
        </div>
      </section>

      <nav className="bb-market-tabs">
        <button
          type="button"
          className={
            activeTab === "all"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("all")}
        >
          My Favourites
        </button>

        <button
          type="button"
          className={
            activeTab === "all"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("all")}
        >
          All Markets
        </button>

        <button
          type="button"
          className={
            activeTab === "main"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("main")}
        >
          Main
        </button>

        <button
          type="button"
          className={
            activeTab === "first"
              ? "active"
              : ""
          }
          onClick={() => setActiveTab("first")}
        >
          First Half
        </button>
      </nav>

      <section className="bb-markets-list">
        {groups.length === 0 && (
          <div className="bb-markets-empty">
            <h3>No markets available</h3>
            <p>
              This match currently has no active
              betting markets.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <section
            className="bb-market-section"
            key={group.key}
          >
            {group.markets.map(
              (market, marketIndex) => {
                const marketKey =
                  `${group.key}-${market.id ?? market.__index}`;

                const isOpen =
                  expanded[marketKey] !== false;

                return (
                  <div
                    className="bb-market-block"
                    key={marketKey}
                  >
                    <button
                      type="button"
                      className="bb-market-heading"
                      onClick={() =>
                        toggleMarket(marketKey)
                      }
                    >
                      <span className="bb-market-heading-left">
                        <span className="bb-market-star">
                          ★
                        </span>

                        <strong>
                          {market.name ||
                            group.title}
                        </strong>
                      </span>

                      <span className="bb-market-heading-right">
                        <small>
                          {market.odds.length} odds
                        </small>

                        <span>
                          {isOpen ? "⌃" : "⌄"}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="bb-market-odds-grid">
                        {market.odds.map(
                          (odd, oddIndex) => {
                            const value =
                              odd?.value ??
                              odd?.odds ??
                              odd?.price;

                            const label =
                              odd?.name ||
                              odd?.label ||
                              odd?.selection ||
                              `Selection ${oddIndex + 1}`;

                            const selected =
                              isOddSelected(
                                market,
                                odd
                              );

                            return (
                              <button
                                type="button"
                                key={
                                  odd?.id ??
                                  `${marketIndex}-${oddIndex}`
                                }
                                className={
                                  selected
                                    ? "bb-market-odd selected"
                                    : "bb-market-odd"
                                }
                                disabled={
                                  !Number.isFinite(
                                    Number(value)
                                  ) ||
                                  Number(value) <= 0
                                }
                                onClick={() =>
                                  selectOdd(
                                    market,
                                    odd
                                  )
                                }
                              >
                                <span>
                                  {label}
                                </span>

                                <strong>
                                  {formatOdd(value)}
                                </strong>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </section>
        ))}
      </section>
    </main>
  );
}
