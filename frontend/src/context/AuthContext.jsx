import { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("bangbet254_token");

    if (!token) {
      setLoading(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("bangbet254_token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const data = await loginUser(credentials);

    localStorage.setItem(
      "bangbet254_token",
      data.access_token
    );

    const currentUser = await getCurrentUser();
    setUser(currentUser);

    return currentUser;
  }

  async function register(data) {
    const response = await registerUser(data);

    localStorage.setItem(
      "bangbet254_token",
      response.access_token
    );

    setUser(response.user);

    return response.user;
  }

  function logout() {
    localStorage.removeItem("bangbet254_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: Boolean(user?.is_admin),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
