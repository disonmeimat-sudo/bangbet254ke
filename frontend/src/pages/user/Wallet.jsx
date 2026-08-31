import { useEffect, useState } from "react";
import { getWallet } from "../../api/wallet";

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadWallet() {
    try {
      setError("");
      const data = await getWallet();
      setWallet(data);
    } catch (err) {
      console.error("WALLET ERROR:", err);
      setError(
        err?.response?.data?.detail ||
        "Unable to load wallet balance."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  function toggleBalance() {
    setVisible((current) => !current);
  }

  const balance = Number(wallet?.balance ?? 0);

  return (
    <div className="page">
      <main
        className="container"
        style={{
          padding: "40px 20px",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          className="bb-balance-card"
          onClick={toggleBalance}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              toggleBalance();
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <span>★ WALLET BALANCE</span>

          {loading ? (
            <strong>Loading...</strong>
          ) : error ? (
            <strong>Unable to load</strong>
          ) : visible ? (
            <strong>
              KSh{" "}
              {balance.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          ) : (
            <strong>••••••••</strong>
          )}

          <small>
            {visible
              ? "Tap Wallet to hide balance"
              : "Tap Wallet to show balance"}
          </small>
        </div>

        {error && (
          <button
            type="button"
            onClick={loadWallet}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "0",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Retry
          </button>
        )}

        <div style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => alert("Deposit flow coming next.")}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: "12px",
              border: "0",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: "15px",
            }}
          >
            + Deposit
          </button>
        </div>
      </main>
    </div>
  );
}
