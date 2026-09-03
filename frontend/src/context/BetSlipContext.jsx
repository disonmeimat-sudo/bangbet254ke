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

      const balance = Number(wallet?.balance ?? 0);

      setWalletBalance(balance);

      return wallet;
    } catch (error) {
      console.error("Could not refresh wallet:", error);
      return null;
    }
  }

  async function refreshBets() {
    try {
      const bets = await getMyBets();

      setBetHistory(
        Array.isArray(bets) ? bets : []
      );
    } catch (error) {
      console.error("Could not load bets:", error);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(
      "bangbet254_token"
    );

    if (token) {
      refreshWallet();
      refreshBets();
    }
  }, []);

  /*
   * Add an odd.
   *
   * Important betting behavior:
   *
   * - Same match + same selection = REMOVE it.
   * - Same match + different selection = REPLACE it.
   * - Different match = ADD it.
   *
   * This gives the user true select/deselect behavior.
   */
  function toggleSelection(selection) {
    setBetError("");
    setBetSuccess("");

    setSelections((current) => {
      const existing = current.find(
        (item) =>
          Number(item.match_id) ===
          Number(selection.match_id)
      );

      if (!existing) {
        return [...current, selection];
      }

      const sameSelection =
        existing.selection === selection.selection;

      if (sameSelection) {
        const updated = current.filter(
          (item) =>
            Number(item.match_id) !==
            Number(selection.match_id)
        );

        if (updated.length === 0) {
          setSlipOpen(false);
        }

        return updated;
      }

      return current.map((item) =>
        Number(item.match_id) ===
        Number(selection.match_id)
          ? selection
          : item
      );
    });
  }

  /*
   * Keep addSelection available so existing components
   * don't break.
   */
  function addSelection(selection) {
    toggleSelection(selection);
  }

  function removeSelection(matchId) {
    setSelections((current) =>
      current.filter(
        (item) =>
          Number(item.match_id) !== Number(matchId)
      )
    );
  }

  function clearSelections() {
    setSelections([]);
    setBetError("");
    setBetSuccess("");
  }

  /*
   * Check whether a particular odd is selected.
   */
  function isSelected(matchId, selection) {
    return selections.some(
      (item) =>
        Number(item.match_id) === Number(matchId) &&
        item.selection === selection
    );
  }

  async function placeBet(stake) {
    const numericStake = Number(stake);

    if (!numericStake || numericStake <= 0) {
      setBetError("Enter a valid stake.");
      return null;
    }

    if (selections.length === 0) {
      setBetError("Your bet has been placed successfully.");
      return null;
    }

    /*
     * Client-side check for a faster UX.
     * The backend remains authoritative.
     */
    if (
      walletBalance !== null &&
      numericStake > Number(walletBalance)
    ) {
      setBetError(
        `Insufficient wallet balance. Your balance is KSh ${Number(
          walletBalance
        ).toLocaleString("en-KE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`
      );

      await refreshWallet();

      return null;
    }

    setPlacingBet(true);
    setBetError("");
    setBetSuccess("");

    try {
      const bet = await placeBetApi({
        stake: numericStake,

        selections: selections.map(
          (selection) => ({
            match_id: Number(selection.match_id),
            home_team: selection.home_team,
            away_team: selection.away_team,
            selection: selection.selection,
            odds: Number(selection.odds),
          })
        ),
      });

      /*
       * Add the newly placed bet to history.
       */
      setBetHistory((current) => [
        bet,
        ...current,
      ]);

      /*
       * Server is authoritative.
       *
       * The backend has already deducted the stake.
       * Use the returned balance immediately, then
       * refresh from /api/wallet to guarantee sync.
       */
      if (
        bet?.wallet_balance !== null &&
        bet?.wallet_balance !== undefined
      ) {
        setWalletBalance(
          Number(bet.wallet_balance)
        );
      }

      await refreshWallet();

      /*
       * Bet has been successfully placed.
       */
      setSelections([]);

      setBetSuccess(
        "Bet placed successfully."
      );

      /*
       * Close the betslip after successful bet.
       */
      setSlipOpen(false);

      return bet;
    } catch (error) {
      const message =
        error?.response?.data?.detail ||
        "Unable to place bet. Please try again.";

      setBetError(message);

      /*
       * Always synchronize with the backend after
       * a failed transaction.
       */
      await refreshWallet();

      return null;
    } finally {
      setPlacingBet(false);
    }
  }

  const totalOdds = selections.reduce(
    (total, item) =>
      total * Number(item.odds || 1),
    1
  );

  return (
    <BetSlipContext.Provider
      value={{
        selections,
        betHistory,
        walletBalance,

        totalOdds,

        slipOpen,
        setSlipOpen,

        placingBet,
        betError,
        betSuccess,

        addSelection,
        toggleSelection,
        removeSelection,
        clearSelections,
        isSelected,

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
