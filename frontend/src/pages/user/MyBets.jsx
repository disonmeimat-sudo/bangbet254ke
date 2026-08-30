import { useBetSlip } from "../../context/BetSlipContext";

export default function MyBets() {
  const {
    selections = [],
    betHistory = [],
  } = useBetSlip();

  const totalOdds = selections.reduce(
    (total, item) => total * Number(item.odds || 1),
    1
  );

  return (
    <div className="bb-user-page">
      <div className="bb-user-page-header">
        <h1>My Bets</h1>
        <p>Your selections and betting history</p>
      </div>

      <section className="bb-user-card">
        <div className="bb-user-card-title">
          <div>
            <span>ACTIVE BETSLIP</span>
            <h2>Current Selections</h2>
          </div>

          <strong>{selections.length}</strong>
        </div>

        {selections.length === 0 ? (
          <div className="bb-empty-user-state">
            <div>🎟️</div>
            <strong>No selections yet</strong>
            <p>
              Select odds from a match and they will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="bb-my-selections">
              {selections.map((selection) => (
                <div
                  className="bb-my-selection"
                  key={selection.match_id}
                >
                  <div>
                    <small>
                      {selection.home_team} vs {selection.away_team}
                    </small>
                    <strong>{selection.selection}</strong>
                  </div>

                  <span>
                    {Number(selection.odds).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bb-my-bets-total">
              <span>Total Odds</span>
              <strong>{totalOdds.toFixed(2)}</strong>
            </div>
          </>
        )}
      </section>

      <section className="bb-user-card">
        <div className="bb-user-card-title">
          <div>
            <span>HISTORY</span>
            <h2>Bet History</h2>
          </div>
        </div>

        {betHistory.length === 0 ? (
          <div className="bb-empty-user-state compact">
            <div>📋</div>
            <strong>No betting history</strong>
            <p>Your placed bets will appear here.</p>
          </div>
        ) : (
          <div className="bb-history-list">
            {betHistory.map((bet) => (
              <div className="bb-history-item" key={bet.id}>
                <div>
                  <strong>
                    {bet.selections?.length || 0} selections
                  </strong>

                  <small>
                    {new Date(bet.created_at).toLocaleString("en-KE")}
                  </small>
                </div>

                <div>
                  <strong>
                    KSh {Number(bet.stake).toLocaleString()}
                  </strong>

                  <small>
                    Odds {Number(bet.total_odds).toFixed(2)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
