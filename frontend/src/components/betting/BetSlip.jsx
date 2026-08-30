import { useState } from "react";
import { useBetSlip } from "../../context/BetSlipContext";

export default function BetSlip() {
  const {
    selections = [],
    removeSelection,
    clearSelections,
    placeBet,
  } = useBetSlip();

  const [stake, setStake] = useState("");

  const totalOdds = selections.reduce(
    (total, item) => total * Number(item.odds || 1),
    1
  );

  const possibleWin =
    Number(stake || 0) * totalOdds;

  return (
    <div className="bb-betslip">
      <div className="bb-betslip-header">
        <div>
          <strong>BETSLIP</strong>
          <span>{selections.length} selection(s)</span>
        </div>

        {selections.length > 0 && (
          <button onClick={clearSelections}>
            Clear
          </button>
        )}
      </div>

      {selections.length === 0 ? (
        <div className="bb-betslip-empty">
          <div className="bb-betslip-icon">🎟️</div>

          <strong>Your betslip is empty</strong>

          <p>
            Click on any odds to add a selection
            to your betslip.
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
                {totalOdds.toFixed(2)}
              </strong>
            </div>

            <label>
              <span>Stake</span>

              <div className="bb-stake">
                <span>KSh</span>

                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  value={stake}
                  onChange={(event) =>
                    setStake(event.target.value)
                  }
                />
              </div>
            </label>

            <div>
              <span>Possible Win</span>
              <strong>
                KSh{" "}
                {possibleWin.toLocaleString(
                  "en-KE",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>
          </div>

          <button
            className="bb-place-bet"
            disabled={!stake || Number(stake) <= 0}
            onClick={() => {
              const placed = placeBet(stake);

              if (placed) {
                setStake("");
                alert("Bet placed successfully!");
              }
            }}
          >
            Place Bet
          </button>
        </>
      )}
    </div>
  );
}
