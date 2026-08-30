import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    ["Dashboard", "/admin"],
    ["Users", "/admin/users"],
    ["Leagues", "/admin/leagues"],
    ["Teams", "/admin/teams"],
    ["Matches", "/admin/matches"],
    ["Markets", "/admin/markets"],
    ["Odds", "/admin/odds"],
    ["Transactions", "/admin/transactions"],
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          background: "#111827",
          color: "#fff",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: "20px" }}>
          BangBet254 Admin
        </strong>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span>{user?.full_name || "Administrator"}</span>

          <button
            onClick={handleLogout}
            style={{
              border: "1px solid #fff",
              background: "transparent",
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <nav
        style={{
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          padding: "12px 20px",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {links.map(([label, path]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/admin"}
            style={({ isActive }) => ({
              padding: "9px 13px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              color: isActive ? "#fff" : "#374151",
              background: isActive ? "#111827" : "transparent",
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
