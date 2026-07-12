import React, { createContext, useContext, useEffect, useState } from "react";
import API from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pp_user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("pp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    API.get("/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("pp_user", JSON.stringify(res.data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("pp_token", token);
    localStorage.setItem("pp_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("pp_token");
    localStorage.removeItem("pp_user");
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await API.get("/auth/me");
    setUser(res.data);
    localStorage.setItem("pp_user", JSON.stringify(res.data));
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
