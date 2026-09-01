import { useState } from "react";
import { useBetSlip } from "../../context/BetSlipContext";

export default function BetSlip({ onOpenWin }) {
  const {
    selections = [],
    removeSelection,
    clearSelections,
    placeBet,
    walletBalance,
    totalOdds,
    slipOpen,
    setSlipOpen,
    placingBet,
    betError,
    betSuccess,
  } = useBetSlip();

  const [stake, setStake] = useState("");

  const possibleWin =
    Number(stake || 0) * Number(totalOdds || 1);

  // Floating YOUR BET button.
  if (!slipOpen) {
    return (
      <button
        type="button"
        className="bb-floating-bet"
        onClick={() => {
          if (typeof onOpenWin === "function") {
            onOpenWin();
          } else {
            setSlipOpen(true);
          }
        }}
      >
        <span className="bb-floating-bet-icon">🎟️</span>

        <span className="bb-floating-bet-info">
          <strong>YOUR BET</strong>
          <small>
            {selections.length} selection
            {selections.length === 1 ? "" : "s"}
          </small>
        </span>

        <span className="bb-floating-bet-win">
          <small>Win</small>
          <strong>
            KSh{" "}
            {possibleWin.toLocaleString("en-KE", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </strong>
        </span>

        <span className="bb-floating-arrow">⌃</span>
      </button>
    );
  }

  return (
    <div className="bb-betslip bb-betslip-floating">
      <div className="bb-betslip-header">
        <div>
          <strong>YOUR BET</strong>
          <span>
            {selections.length} selection
            {selections.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="bb-betslip-actions">
          {selections.length > 0 && (
            <button type="button" onClick={clearSelections}>
              Clear
            </button>
          )}

          <button
            type="button"
            className="bb-betslip-close"
            onClick={() => setSlipOpen(false)}
            aria-label="Close betslip"
          >
            ×
          </button>
        </div>
      </div>

      {selections.length === 0 ? (
        <div className="bb-betslip-empty">
          <div className="bb-betslip-icon">🎟️</div>

          <strong>Your betslip is empty</strong>

          <p>
            Click on any odds to add a selection.
          </p>
        </div>
      ) : (
        <>
          <div className="bb-betslip-selections">
            {selections.map((selection) => (
              <div
                className="bb-bet-selection"
                key={selection.match_id}
              >
                <div className="bb-bet-selection-info">
                  <small>
                    {selection.home_team} vs{" "}
                    {selection.away_team}
                  </small>

                  <strong>
                    {selection.selection}
                  </strong>
                </div>

                <strong className="bb-bet-odd">
                  {Number(selection.odds).toFixed(2)}
                </strong>

                <button
                  type="button"
                  className="bb-remove-bet"
                  onClick={() =>
                    removeSelection(selection.match_id)
                  }
                  aria-label="Remove selection"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="bb-betslip-summary">
            <div>
              <span>Total Odds</span>
              <strong>
                {Number(totalOdds).toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Wallet Balance</span>
              <strong>
                KSh{" "}
                {Number(walletBalance ?? 0).toLocaleString(
                  "en-KE",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <label>
              <span>Stake</span>

              <div className="bb-stake">
                <span>KSh</span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={stake}
                  disabled={placingBet}
                  onChange={(event) => {
                    setStake(event.target.value);
                  }}
                />
              </div>
            </label>

            <div>
              <span>Possible Win</span>

              <strong>
                KSh{" "}
                {possibleWin.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>

          {betError && (
            <div className="bb-bet-error">
              {betError}
            </div>
          )}

          {betSuccess && (
            <div className="bb-bet-success">
              {betSuccess}
            </div>
          )}

          <button
            type="button"
            className="bb-place-bet"
            disabled={
              placingBet ||
              !stake ||
              Number(stake) <= 0
            }
            onClick={async () => {
              const bet = await placeBet(stake);

              if (bet) {
                setStake("");
              }
            }}
          >
            {placingBet
              ? "PLACING BET..."
              : "PLACE BET"}
          </button>
        </>
      )}
    </div>
  );
}
