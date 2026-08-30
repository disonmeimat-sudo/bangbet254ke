import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <main
        className="container"
        style={{
          padding: "60px 20px",
        }}
      >
        <div
          style={{
            marginBottom: "35px",
          }}
        >
          <p
            style={{
              color: "#22c55e",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            BANGBET254
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              color: "#ffffff",
            }}
          >
            Welcome, {user?.full_name || "Player"}
          </h1>

          <p
            style={{
              color: "#94a3b8",
              marginTop: "10px",
            }}
          >
            Ready to see today's matches and place your bets?
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
          }}
        >
          <Link to="/matches" style={cardStyle}>
            <div style={iconStyle}>⚽</div>
            <h2 style={titleStyle}>Matches</h2>
            <p style={textStyle}>
              Browse upcoming matches and available betting markets.
            </p>
          </Link>

          <Link to="/live" style={cardStyle}>
            <div style={iconStyle}>🔴</div>
            <h2 style={titleStyle}>Live Betting</h2>
            <p style={textStyle}>
              Follow matches that are currently live.
            </p>
          </Link>

          <Link to="/wallet" style={cardStyle}>
            <div style={iconStyle}>💰</div>
            <h2 style={titleStyle}>Wallet</h2>
            <p style={textStyle}>
              Check your balance, deposit and manage withdrawals.
            </p>
          </Link>

          <Link to="/transactions" style={cardStyle}>
            <div style={iconStyle}>📋</div>
            <h2 style={titleStyle}>Transactions</h2>
            <p style={textStyle}>
              View your deposits, withdrawals and transaction history.
            </p>
          </Link>

          <Link to="/profile" style={cardStyle}>
            <div style={iconStyle}>👤</div>
            <h2 style={titleStyle}>Profile</h2>
            <p style={textStyle}>
              Manage your BangBet254 account.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}

const cardStyle = {
  display: "block",
  padding: "26px",
  borderRadius: "16px",
  background: "#0d1b2d",
  border: "1px solid rgba(148, 163, 184, 0.12)",
  color: "#ffffff",
  textDecoration: "none",
  transition: "transform 0.2s ease",
};

const iconStyle = {
  fontSize: "30px",
  marginBottom: "14px",
};

const titleStyle = {
  margin: "0 0 8px",
  fontSize: "21px",
};

const textStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.6,
  fontSize: "14px",
};
