import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Matches from "./pages/Matches";
import Live from "./pages/Live";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Wallet from "./pages/user/Wallet";
import Transactions from "./pages/user/Transactions";
import Profile from "./pages/user/Profile";
import UserDashboard from "./pages/user/Dashboard";
import MyBets from "./pages/user/MyBets";

import Dashboard from "./pages/admin/Dashboard";
import Leagues from "./pages/admin/Leagues";
import Teams from "./pages/admin/Teams";
import AdminMatches from "./pages/admin/Matches";
import Markets from "./pages/admin/Markets";
import Odds from "./pages/admin/Odds";
import Users from "./pages/admin/Users";
import AdminTransactions from "./pages/admin/Transactions";

import AdminRoute from "./components/layout/AdminRoute";
import AdminLayout from "./components/layout/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/live" element={<Live />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/my-bets" element={<MyBets />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/profile" element={<Profile />} />

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/leagues" element={<Leagues />} />
            <Route path="/admin/teams" element={<Teams />} />
            <Route path="/admin/matches" element={<AdminMatches />} />
            <Route path="/admin/markets" element={<Markets />} />
            <Route path="/admin/odds" element={<Odds />} />
            <Route path="/admin/users" element={<Users />} />
            <Route
              path="/admin/transactions"
              element={<AdminTransactions />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
