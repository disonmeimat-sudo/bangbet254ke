import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getWallet } from "../../api/wallet";
import {
  createDeposit,
  createWithdrawal,
} from "../../api/transactions";

const PRESET_AMOUNTS = [
  100,
  200,
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
  50000,
];

const DEPOSIT_TAX_RATE = 0.05;

function formatKES(value) {
  return Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getPossiblePhone(wallet) {
  const candidates = [
    wallet?.phone_number,
    wallet?.phone,
    wallet?.user?.phone_number,
    wallet?.user?.phone,
    wallet?.account_number,
  ];

  const value = candidates.find(
    (item) => item !== undefined && item !== null && String(item).trim()
  );

  return value ? String(value).trim() : "";
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/\s+/g, "");

  if (phone.startsWith("+254")) {
    return phone.substring(1);
  }

  if (phone.startsWith("254")) {
    return phone;
  }

  if (phone.startsWith("07") || phone.startsWith("01")) {
    return `254${phone.substring(1)}`;
  }

  return phone;
}

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

  const [amount, setAmount] = useState(
    initialAction === "deposit" ? "500" : ""
  );

  const [phoneNumber, setPhoneNumber] = useState("");
  const [action, setAction] = useState(initialAction);

  const [paymentMethod, setPaymentMethod] = useState("mpesa");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadWallet() {
    try {
      setError("");

      const data = await getWallet();
      setWallet(data);

      const possiblePhone = getPossiblePhone(data);

      if (possiblePhone && !phoneNumber) {
        setPhoneNumber(possiblePhone);
      }
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

  const accountNumber = useMemo(() => {
    return (
      wallet?.account_number ||
      wallet?.phone_number ||
      wallet?.phone ||
      wallet?.user?.phone_number ||
      wallet?.user?.phone ||
      "Your account"
    );
  }, [wallet]);

  const numericAmount = Number(amount || 0);

  const depositTax =
    numericAmount > 0
      ? numericAmount * DEPOSIT_TAX_RATE
      : 0;

  function openAction(nextAction) {
    setError("");
    setMessage("");

    if (nextAction === "deposit") {
      setAmount("500");

      const possiblePhone = getPossiblePhone(wallet);

      if (possiblePhone) {
        setPhoneNumber(possiblePhone);
      }
    } else {
      setAmount("");
    }

    setPaymentMethod("mpesa");
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

    setAction(null);

    setSearchParams({});
  }

  function toggleBalance() {
    setVisible((current) => !current);
  }

  function selectAmount(value) {
    setAmount(String(value));
    setError("");
    setMessage("");
  }

  async function handleDeposit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const numeric = Number(amount);
    const cleanPhone = normalizePhone(phoneNumber);

    if (!numeric || numeric <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    if (!cleanPhone) {
      setError("Enter the M-Pesa phone number.");
      return;
    }

    if (!/^254(7|1)\d{8}$/.test(cleanPhone)) {
      setError(
        "Enter a valid Kenyan M-Pesa number, for example 254712345678."
      );
      return;
    }

    setProcessing(true);

    try {
      /*
       * The screenshot has M-PESA selected.
       *
       * The existing backend deposit endpoint expects
       * payment_method: "mpesa_stk".
       */
      const transaction = await createDeposit({
        amount: numeric,
        phone_number: cleanPhone,
        payment_method: "mpesa_stk",
      });

      console.log("DEPOSIT TRANSACTION:", transaction);

      setMessage(
        `STK Push sent to ${cleanPhone}. Enter your M-Pesa PIN on your phone to complete the deposit.`
      );

      await loadWallet();
    } catch (err) {
      console.error("DEPOSIT ERROR:", err);

      setError(
        err?.response?.data?.detail ||
          "Unable to start the deposit. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleWithdrawal(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const numeric = Number(amount);
    const cleanPhone = normalizePhone(phoneNumber);

    if (!numeric || numeric <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }

    if (!cleanPhone) {
      setError("Enter the M-Pesa phone number.");
      return;
    }

    setProcessing(true);

    try {
      const transaction = await createWithdrawal({
        amount: numeric,
        phone_number: cleanPhone,
        payment_method: "mpesa_b2c",
      });

      console.log("WITHDRAWAL TRANSACTION:", transaction);

      setMessage(
        `Withdrawal request for KSh ${formatKES(
          numeric
        )} sent for processing.`
      );

      setAmount("");

      await loadWallet();
    } catch (err) {
      console.error("WITHDRAWAL ERROR:", err);

      setError(
        err?.response?.data?.detail ||
          "Unable to start the withdrawal. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  }

  const balance = Number(wallet?.balance ?? 0);

  return (
    <div className="page bb-wallet-page">

      {/* =====================================================
          NORMAL WALLET PAGE
      ===================================================== */}

      <main className="container bb-wallet-container">

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
        >
          <span>★ WALLET BALANCE</span>

          {loading ? (
            <strong>Loading...</strong>
          ) : error && !wallet ? (
            <strong>Unable to load</strong>
          ) : visible ? (
            <strong>
              KSh {formatKES(balance)}
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
          <div className="bb-wallet-error">
            {error}
          </div>
        )}

        {!action && (
          <div className="bb-wallet-actions">
            <button
              type="button"
              onClick={() => openAction("deposit")}
              className="bb-wallet-deposit-button"
            >
              <span>＋</span>
              Deposit
            </button>

            <button
              type="button"
              onClick={() => openAction("withdraw")}
              className="bb-wallet-withdraw-button"
            >
              <span>↗</span>
              Withdraw
            </button>
          </div>
        )}

      </main>


      {/* =====================================================
          DEPOSIT SCREEN
      ===================================================== */}

      {action === "deposit" && (
        <div className="bb-deposit-overlay">

          <section
            className="bb-deposit-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Deposit"
          >

            {/* HEADER */}

            <header className="bb-deposit-header">
              <h1>Deposit</h1>

              <button
                type="button"
                className="bb-deposit-close"
                onClick={closeAction}
                disabled={processing}
                aria-label="Close deposit"
              >
                ×
              </button>
            </header>


            {/* ACCOUNT */}

            <div className="bb-deposit-account">
              <span>To Account:</span>{" "}
              <strong>{accountNumber}</strong>
            </div>


            {/* PAYMENT METHOD */}

            <div className="bb-deposit-section">

              <h2>Payment Method</h2>

              <div className="bb-payment-methods">

                <button
                  type="button"
                  className={`bb-payment-method ${
                    paymentMethod === "mpesa"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setPaymentMethod("mpesa");
                    setError("");
                  }}
                  disabled={processing}
                >
                  <div className="bb-method-logo bb-mpesa-logo">
                    <span>₿</span>
                  </div>

                  <span>M-PESA</span>
                </button>


                <button
                  type="button"
                  className={`bb-payment-method ${
                    paymentMethod === "airtel"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setPaymentMethod("airtel");
                    setError(
                      "Airtel deposits are not connected yet. Please use M-PESA."
                    );
                  }}
                  disabled={processing}
                >
                  <div className="bb-method-logo bb-airtel-logo">
                    <span>◒</span>
                  </div>

                  <span>Airtel</span>
                </button>

              </div>
            </div>


            {/* AMOUNTS */}

            <form onSubmit={handleDeposit}>

              <div className="bb-deposit-section bb-amount-section">

                <h2>Amount</h2>

                <div className="bb-amount-grid">

                  {PRESET_AMOUNTS.map((preset) => {
                    const selected =
                      Number(amount) === preset;

                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          selectAmount(preset)
                        }
                        className={`bb-amount-card ${
                          selected ? "active" : ""
                        }`}
                      >
                        <span className="bb-amount-value">
                          {preset.toLocaleString("en-KE")}
                        </span>

                        <span className="bb-bonus-strip">
                          +200%
                        </span>
                      </button>
                    );
                  })}

                </div>


                {/* CUSTOM AMOUNT */}

                <div className="bb-custom-amount">

                  <input
                    id="transactionAmount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    disabled={processing}
                    placeholder="Enter amount"
                    required
                  />

                  {amount && (
                    <button
                      type="button"
                      className="bb-clear-amount"
                      onClick={() => setAmount("")}
                      disabled={processing}
                      aria-label="Clear amount"
                    >
                      ×
                    </button>
                  )}

                </div>

              </div>


              {/* PHONE NUMBER */}

              <div className="bb-deposit-phone-wrap">

                <label htmlFor="transactionPhone">
                  M-Pesa Number
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
                />

              </div>


              {/* TAX */}

              <div className="bb-deposit-info-row">

                <span className="bb-info-icon tax-icon">
                  ▱
                </span>

                <span>
                  Deposit Tax{" "}
                  <strong>
                    {formatKES(depositTax)}
                  </strong>{" "}
                  (Tax Rate 5%)
                </span>

              </div>


              {/* REWARD */}

              <div className="bb-deposit-info-row">

                <span className="bb-info-icon reward-icon">
                  ▰
                </span>

                <span>
                  Extra{" "}
                  <strong className="bb-reward-text">
                    KSH 1,000 Rewards
                  </strong>{" "}
                  will be credited after deposit.
                </span>

                <button
                  type="button"
                  className="bb-info-button"
                  aria-label="Reward information"
                >
                  i
                </button>

              </div>


              {/* ERROR */}

              {error && (
                <div className="bb-deposit-message bb-deposit-error">
                  {error}
                </div>
              )}


              {/* SUCCESS */}

              {message && (
                <div className="bb-deposit-message bb-deposit-success">
                  {message}
                </div>
              )}


              {/* PAY */}

              <button
                type="submit"
                className="bb-pay-button"
                disabled={
                  processing ||
                  paymentMethod !== "mpesa"
                }
              >
                {processing
                  ? "Processing..."
                  : "Pay"}
              </button>

            </form>


            {/* HELP */}

            <div className="bb-help-section">

              <h2>Help</h2>

              <button
                type="button"
                className="bb-help-row"
              >
                <span className="bb-help-icon">
                  i
                </span>

                <span className="bb-help-text">
                  Pay with M-PESA Paybill 569699
                </span>

                <span className="bb-help-chevron">
                 ⌃
                </span>
              </button>

            </div>

          </section>

        </div>
      )}


      {/* =====================================================
          WITHDRAWAL SCREEN
      ===================================================== */}

      {action === "withdraw" && (
        <div className="bb-deposit-overlay">

          <section className="bb-withdraw-panel">

            <header className="bb-deposit-header">
              <h1>Withdraw</h1>

              <button
                type="button"
                className="bb-deposit-close"
                onClick={closeAction}
                disabled={processing}
              >
                ×
              </button>
            </header>

            <div className="bb-withdraw-content">

              <p className="bb-withdraw-balance">
                Available balance:{" "}
                <strong>
                  KSh {formatKES(balance)}
                </strong>
              </p>

              <form onSubmit={handleWithdrawal}>

                <label htmlFor="withdrawPhone">
                  M-Pesa Phone Number
                </label>

                <input
                  id="withdrawPhone"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(event) =>
                    setPhoneNumber(event.target.value)
                  }
                  placeholder="0712345678"
                  disabled={processing}
                  required
                />

                <label htmlFor="withdrawAmount">
                  Amount
                </label>

                <input
                  id="withdrawAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="Enter amount"
                  disabled={processing}
                  required
                />

                {error && (
                  <div className="bb-deposit-message bb-deposit-error">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="bb-deposit-message bb-deposit-success">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="bb-pay-button"
                  disabled={processing}
                >
                  {processing
                    ? "Submitting..."
                    : "Request Withdrawal"}
                </button>

              </form>

            </div>

          </section>

        </div>
      )}

    </div>
  );
}
