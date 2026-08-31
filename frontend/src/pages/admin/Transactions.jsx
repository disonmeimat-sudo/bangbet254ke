import { useEffect, useState } from "react";
import {
  getAdminTransactions,
  updateTransaction,
} from "../../api/transactions";

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function badge(status) {
  const s = String(status || "").toLowerCase();

  if (s === "approved" || s === "completed")
    return { bg: "#dcfce7", color: "#166534" };

  if (s === "pending")
    return { bg: "#fef3c7", color: "#92400e" };

  if (s === "processing")
    return { bg: "#dbeafe", color: "#1d4ed8" };

  if (
    s === "rejected" ||
    s === "cancelled" ||
    s === "failed"
  )
    return { bg: "#fee2e2", color: "#991b1b" };

  return { bg: "#f1f5f9", color: "#475569" };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const params =
        filter === "all" ? {} : { status: filter };

      const data = await getAdminTransactions(params);
      setTransactions(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to load transactions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  async function action(transaction, status) {
    if (
      !window.confirm(
        status === "approved"
          ? "Approve this withdrawal and initiate the payout?"
          : `Mark transaction #${transaction.id} as ${status}?`
      )
    ) {
      return;
    }

    try {
      setActionLoading(`${transaction.id}-${status}`);
      setError("");
      setMessage("");

      await updateTransaction(transaction.id, {
        status,
      });

      setMessage(
        `Transaction #${transaction.id} updated successfully.`
      );

      await loadTransactions();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to update transaction."
      );
    } finally {
      setActionLoading(null);
    }
  }

  const filters = [
    ["all", "📋 All"],
    ["pending", "🟠 Pending"],
    ["processing", "🔵 Processing"],
    ["approved", "🟢 Approved"],
    ["rejected", "🔴 Rejected"],
    ["cancelled", "⚫ Cancelled"],
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "15px 10px 35px",
        background:
          "linear-gradient(135deg,#eff6ff,#f5f3ff,#fff7ed)",
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "1050px",
          margin: "auto",
        }}
      >
        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "18px",
            marginBottom: "12px",
            boxShadow: "0 6px 20px rgba(0,0,0,.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "24px",
                  color: "#0f172a",
                }}
              >
                💳 Transactions
              </h1>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Deposits and withdrawal management
              </p>
            </div>

            <button
              onClick={loadTransactions}
              disabled={loading}
              style={{
                border: 0,
                borderRadius: "9px",
                padding: "9px 12px",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </section>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "11px",
              borderRadius: "10px",
              marginBottom: "12px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "11px",
              borderRadius: "10px",
              marginBottom: "12px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ✅ {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "7px",
            marginBottom: "12px",
          }}
        >
          {filters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: "9px 5px",
                borderRadius: "9px",
                border:
                  filter === value
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                background:
                  filter === value
                    ? "#eff6ff"
                    : "#fff",
                color:
                  filter === value
                    ? "#1d4ed8"
                    : "#475569",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "35px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "35px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "35px" }}>💳</div>
            <strong>No transactions found</strong>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "10px",
            }}
          >
            {transactions.map((transaction) => {
              const type = String(
                transaction.transaction_type || ""
              ).toLowerCase();

              const status = String(
                transaction.status || ""
              ).toLowerCase();

              const withdrawal =
                type === "withdrawal";

              const pending =
                status === "pending";

              const statusColors =
                badge(status);

              return (
                <article
                  key={transaction.id}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "13px",
                    borderLeft: withdrawal
                      ? "4px solid #ef4444"
                      : "4px solid #22c55e",
                    boxShadow:
                      "0 5px 16px rgba(0,0,0,.06)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <strong>
                        Transaction #{transaction.id}
                      </strong>

                      <div
                        style={{
                          marginTop: "3px",
                          fontSize: "11px",
                          color: "#64748b",
                        }}
                      >
                        User #{transaction.user_id}
                      </div>
                    </div>

                    <span
                      style={{
                        background:
                          statusColors.bg,
                        color:
                          statusColors.color,
                        padding: "5px 8px",
                        borderRadius: "20px",
                        fontSize: "10px",
                        fontWeight: 800,
                        textTransform:
                          "uppercase",
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "10px",
                        }}
                      >
                        {withdrawal
                          ? "Withdrawal"
                          : "Deposit"}
                      </div>

                      <strong
                        style={{
                          fontSize: "20px",
                          color: withdrawal
                            ? "#dc2626"
                            : "#16a34a",
                        }}
                      >
                        {money(
                          transaction.amount
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          color: "#64748b",
                        }}
                      >
                        Fee
                      </div>

                      <strong>
                        {money(
                          transaction.fee
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: "6px",
                      marginTop: "10px",
                      fontSize: "11px",
                    }}
                  >
                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    >
                      Wallet #{transaction.wallet_id}
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    >
                      {transaction.payment_method ||
                        "-"}
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    >
                      Total:{" "}
                      <strong>
                        {money(
                          transaction.total_debit
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        background: "#f8fafc",
                        padding: "8px",
                        borderRadius: "8px",
                      }}
                    >
                      {date(
                        transaction.created_at
                      )}
                    </div>
                  </div>

                  {transaction.reference && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "10px",
                        color: "#64748b",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      Reference:{" "}
                      <strong>
                        {transaction.reference}
                      </strong>
                    </div>
                  )}

                  {transaction.description && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        color: "#475569",
                        fontSize: "10px",
                      }}
                    >
                      {transaction.description}
                    </div>
                  )}

                  {pending && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          withdrawal
                            ? "1fr 1fr 1fr"
                            : "1fr 1fr",
                        gap: "6px",
                        marginTop: "10px",
                      }}
                    >
                      {withdrawal && (
                        <button
                          onClick={() =>
                            action(
                              transaction,
                              "approved"
                            )
                          }
                          disabled={
                            actionLoading !== null
                          }
                          style={{
                            border: 0,
                            borderRadius: "8px",
                            padding: "9px 4px",
                            background:
                              "#16a34a",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "10px",
                          }}
                        >
                          {actionLoading ===
                          `${transaction.id}-approved`
                            ? "..."
                            : "✓ Approve"}
                        </button>
                      )}

                      <button
                        onClick={() =>
                          action(
                            transaction,
                            "rejected"
                          )
                        }
                        disabled={
                          actionLoading !== null
                        }
                        style={{
                          border: 0,
                          borderRadius: "8px",
                          padding: "9px 4px",
                          background: "#dc2626",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "10px",
                        }}
                      >
                        {actionLoading ===
                        `${transaction.id}-rejected`
                          ? "..."
                          : "✕ Reject"}
                      </button>

                      <button
                        onClick={() =>
                          action(
                            transaction,
                            "cancelled"
                          )
                        }
                        disabled={
                          actionLoading !== null
                        }
                        style={{
                          border: 0,
                          borderRadius: "8px",
                          padding: "9px 4px",
                          background: "#475569",
                          color: "#fff",
                          fontWeight: 800,
                          fontSize: "10px",
                        }}
                      >
                        {actionLoading ===
                        `${transaction.id}-cancelled`
                          ? "..."
                          : "Cancel"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
