import { createContext, useContext, useEffect, useState } from "react";

const BetSlipContext = createContext(null);

const BET_HISTORY_KEY = "bangbet254_bet_history";

export function BetSlipProvider({ children }) {
  const [selections, setSelections] = useState([]);
  const [betHistory, setBetHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(BET_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        BET_HISTORY_KEY,
        JSON.stringify(betHistory)
      );
    } catch (error) {
      console.error("Could not save bet history:", error);
    }
  }, [betHistory]);

  function addSelection(selection) {
    setSelections((current) => {
      const exists = current.some(
        (item) => item.match_id === selection.match_id
      );

      if (exists) {
        return current.map((item) =>
          item.match_id === selection.match_id
            ? selection
            : item
        );
      }

      return [...current, selection];
    });
  }

  function removeSelection(matchId) {
    setSelections((current) =>
      current.filter((item) => item.match_id !== matchId)
    );
  }

  function clearSelections() {
    setSelections([]);
  }

  function placeBet(stake) {
    const numericStake = Number(stake);

    if (
      !numericStake ||
      numericStake <= 0 ||
      selections.length === 0
    ) {
      return false;
    }

    const totalOdds = selections.reduce(
      (total, item) => total * Number(item.odds || 1),
      1
    );

    const bet = {
      id: `BB-${Date.now()}`,
      created_at: new Date().toISOString(),
      stake: numericStake,
      total_odds: totalOdds,
      possible_win: numericStake * totalOdds,
      status: "Pending",
      selections: selections.map((selection) => ({
        match_id: selection.match_id,
        home_team: selection.home_team,
        away_team: selection.away_team,
        selection: selection.selection,
        odds: Number(selection.odds),
      })),
    };

    setBetHistory((current) => [bet, ...current]);
    setSelections([]);

    return true;
  }

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        betHistory,
        addSelection,
        removeSelection,
        clearSelections,
        placeBet,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  return useContext(BetSlipContext);
}
