import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { placeBet as placeBetApi, getMyBets } from "../api/bets";
import { getWallet } from "../api/wallet";

const BetSlipContext = createContext(null);

export function BetSlipProvider({ children }) {
  const [selections, setSelections] = useState([]);
  const [betHistory, setBetHistory] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);

  const [slipOpen, setSlipOpen] = useState(false);
  const [placingBet, setPlacingBet] = useState(false);
  const [betError, setBetError] = useState("");
  const [betSuccess, setBetSuccess] = useState("");

  async function refreshWallet() {
    try {
      const wallet = await getWallet();
      setWalletBalance(Number(wallet.balance ?? 0));
      return wallet;
    } catch (error) {
      console.error("Could not refresh wallet:", error);
      return null;
    }
  }

  async function refreshBets() {
    try {
      const bets = await getMyBets();
      setBetHistory(Array.isArray(bets) ? bets : []);
    } catch (error) {
      console.error("Could not load bets:", error);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("bangbet254_token");

    if (token) {
      refreshWallet();
      refreshBets();
    }
  }, []);

  function addSelection(selection) {
    setBetError("");
    setBetSuccess("");

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

    setSlipOpen(true);
  }

  function removeSelection(matchId) {
    setSelections((current) =>
      current.filter((item) => item.match_id !== matchId)
    );
  }

  function clearSelections() {
    setSelections([]);
    setBetError("");
    setBetSuccess("");
  }

  async function placeBet(stake) {
    const numericStake = Number(stake);

    if (!numericStake || numericStake <= 0) {
      setBetError("Enter a valid stake.");
      return null;
    }

    if (selections.length === 0) {
      setBetError("Your betslip is empty.");
      return null;
    }

    setPlacingBet(true);
    setBetError("");
    setBetSuccess("");

    try {
      const bet = await placeBetApi({
        stake: numericStake,
        selections: selections.map((selection) => ({
          match_id: Number(selection.match_id),
          home_team: selection.home_team,
          away_team: selection.away_team,
          selection: selection.selection,
          odds: Number(selection.odds),
        })),
      });

      setBetHistory((current) => [bet, ...current]);
      setSelections([]);

      if (bet.wallet_balance !== null && bet.wallet_balance !== undefined) {
        setWalletBalance(Number(bet.wallet_balance));
      } else {
        await refreshWallet();
      }

      setBetSuccess("Bet placed successfully.");

      return bet;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        "Unable to place bet. Please try again.";

      setBetError(message);

      // Refresh because the server is authoritative.
      await refreshWallet();

      return null;
    } finally {
      setPlacingBet(false);
    }
  }

  const totalOdds = selections.reduce(
    (total, item) => total * Number(item.odds || 1),
    1
  );

  const possibleWin =
    selections.length > 0
      ? Number(totalOdds)
      : 0;

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        betHistory,
        walletBalance,
        totalOdds,
        possibleWin,

        slipOpen,
        setSlipOpen,

        placingBet,
        betError,
        betSuccess,

        addSelection,
        removeSelection,
        clearSelections,
        placeBet,

        refreshWallet,
        refreshBets,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  return useContext(BetSlipContext);
}
