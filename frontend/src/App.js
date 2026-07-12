import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import NewInsight from "@/pages/NewInsight";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Recommendations from "@/pages/Recommendations";
import Alerts from "@/pages/Alerts";
import Settings from "@/pages/Settings";
import { Activity } from "lucide-react";

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <span className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
        <Activity className="h-6 w-6 text-primary-foreground" />
      </span>
      <p className="text-sm text-muted-foreground font-medium">Loading ProductPulse AI…</p>
    </div>
  </div>
);

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-insight" element={<NewInsight />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
