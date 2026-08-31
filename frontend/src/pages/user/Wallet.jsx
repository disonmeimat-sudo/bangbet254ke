import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getWallet } from "../../api/wallet";
import {
  createDeposit,
  createWithdrawal,
} from "../../api/transactions";

export default function Wallet() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialAction =
    searchParams.get("action") === "withdraw"
      ? "withdraw"
      : searchParams.get("action") === "deposit"
        ? "deposit"
        : null;

  const [wallet, setWallet] = useState(null);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [action, setAction] = useState(initialAction);

  const [message, setMessage] = useState("");
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

  function openAction(nextAction) {
    setError("");
    setMessage("");
    setAmount("");
    setPhoneNumber("");
    setAction(nextAction);

    setSearchParams({
      action: nextAction,
    });
  }

  function closeAction() {
    if (processing) return;

    setError("");
    setMessage("");
    setAmount("");
    setPhoneNumber("");
    setAction(null);

    setSearchParams({});
  }

  function toggleBalance() {
    setVisible((current) => !current);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const numericAmount = Number(amount);
    const cleanPhone = phoneNumber.trim();

    if (!numericAmount || numericAmount <= 0) {
      setError(
        action === "withdraw"
          ? "Enter a valid withdrawal amount."
          : "Enter a valid deposit amount."
      );
      return;
    }

    if (!cleanPhone) {
      setError("Enter the M-Pesa phone number.");
      return;
    }

    setProcessing(true);

    try {
      let transaction;

      if (action === "deposit") {
        transaction = await createDeposit({
          amount: numericAmount,
          phone_number: cleanPhone,
          payment_method: "mpesa_stk",
        });

        console.log("DEPOSIT TRANSACTION:", transaction);

        setMessage(
          `STK Push sent to ${cleanPhone}. Enter your M-Pesa PIN on your phone to complete the deposit.`
        );
      } else {
        transaction = await createWithdrawal({
          amount: numericAmount,
          phone_number: cleanPhone,
          payment_method: "mpesa_b2c",
        });

        console.log("WITHDRAWAL TRANSACTION:", transaction);

        setMessage(
          `Withdrawal request for KSh ${numericAmount.toLocaleString("en-KE")} sent for processing. Funds will be sent to ${cleanPhone} after approval.`
        );
      }

      setAmount("");
      await loadWallet();
    } catch (err) {
      console.error(
        `${action?.toUpperCase()} ERROR:`,
        err
      );

      setError(
        err?.response?.data?.detail ||
        `Unable to start the ${action}. Please try again.`
      );
    } finally {
      setProcessing(false);
    }
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
          ) : error && !wallet ? (
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

        {error && !action && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              borderRadius: "10px",
            }}
          >
            {error}
          </div>
        )}

        {!action ? (
          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => openAction("deposit")}
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

            <button
              type="button"
              onClick={() => openAction("withdraw")}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "15px",
              }}
            >
              ↗ Withdraw
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              marginTop: "20px",
              padding: "20px",
              borderRadius: "14px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {action === "deposit"
                ? "Deposit Funds"
                : "Withdraw Funds"}
            </h2>

            <p>
              {action === "deposit"
                ? "Enter the amount and the M-Pesa number where the STK Push should be sent."
                : "Enter the amount and the M-Pesa number where you want to receive your withdrawal."}
            </p>

            <label
              htmlFor="transactionPhone"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 800,
              }}
            >
              M-Pesa Phone Number
            </label>

            <input
              id="transactionPhone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(event.target.value)
              }
              placeholder="0712345678"
              disabled={processing}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                fontSize: "16px",
                marginBottom: "15px",
              }}
            />

            <label
              htmlFor="transactionAmount"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 800,
              }}
            >
              Amount (KSh)
            </label>

            <input
              id="transactionAmount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Enter amount"
              disabled={processing}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                fontSize: "16px",
                marginBottom: "15px",
              }}
            />

            {action === "withdraw" && (
              <p>
                Your available balance is{" "}
                <strong>
                  KSh{" "}
                  {balance.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
                . A withdrawal fee may apply.
              </p>
            )}

            {error && (
              <div
                style={{
                  marginBottom: "15px",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "15px",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={processing}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                border: "0",
                cursor: processing ? "wait" : "pointer",
                fontWeight: 900,
                fontSize: "15px",
              }}
            >
              {processing
                ? action === "deposit"
                  ? "Starting M-Pesa STK..."
                  : "Submitting Withdrawal..."
                : action === "deposit"
                  ? "Send STK Push"
                  : "Request Withdrawal"}
            </button>

            <button
              type="button"
              onClick={closeAction}
              disabled={processing}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "10px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
