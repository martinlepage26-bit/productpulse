import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, Zap, ShieldCheck, TrendingDown, Loader2, Sparkles } from "lucide-react";

const DEMO_EMAIL = "demo@productpulse.ai";
const DEMO_PASSWORD = "demo123";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const doLogin = async (e, p) => {
    const res = await API.post("/auth/login", { email: e, password: p });
    login(res.data.token, res.data.user);
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await doLogin(email, password);
        toast.success("Welcome back");
      } else {
        const res = await API.post("/auth/register", { email, password, store_name: storeName || "My Store" });
        login(res.data.token, res.data.user);
        toast.success("Account created");
        navigate("/");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
      toast.success("Logged in with the demo account");
    } catch {
      toast.error("Demo login failed. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <span className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </span>
            <div>
              <p className="font-extrabold text-lg tracking-tight text-foreground">ProductPulse AI</p>
              <p className="text-xs text-muted-foreground font-medium">Product Intelligence for Sellers</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
            Every customer complaint becomes <span className="text-primary">product intelligence</span>.
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Detect product failures early — turn complaints into root-cause analysis, severity scores, and recommended operational fixes.
          </p>

          <Button
            className="w-full mt-7 h-11 rounded-xl font-bold text-base"
            onClick={handleDemo}
            disabled={demoLoading || loading}
            data-testid="login-demo-button"
          >
            {demoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Try the live demo
          </Button>
          <div className="mt-2 rounded-lg bg-secondary/80 border border-border px-3 py-2 text-center" data-testid="login-demo-credentials">
            <p className="text-xs text-muted-foreground">
              Demo credentials: <span className="font-bold text-foreground">{DEMO_EMAIL}</span> / <span className="font-bold text-foreground">{DEMO_PASSWORD}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or sign in with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="store" className="text-xs font-semibold">Store name</Label>
                <Input id="store" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Awesome Store" className="h-11 rounded-xl bg-white" data-testid="login-store-input" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@store.com" className="h-11 rounded-xl bg-white" data-testid="login-email-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 rounded-xl bg-white" data-testid="login-password-input" />
            </div>
            <Button type="submit" variant="outline" className="w-full h-11 rounded-xl font-bold" disabled={loading || demoLoading} data-testid="login-submit-button">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-5">
            {mode === "login" ? "New to ProductPulse?" : "Already have an account?"}{" "}
            <button className="font-bold text-primary hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")} data-testid="login-mode-toggle">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: hero panel (desktop only) */}
      <div className="hidden lg:flex w-[46%] pp-hero-wash bg-secondary/40 border-l border-border items-center justify-center p-12">
        <div className="max-w-md w-full space-y-4">
          <Card className="rounded-2xl shadow-[var(--pp-shadow-md)] border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Health</p>
                  <p className="font-bold text-foreground mt-0.5">Wireless Earbuds</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[hsl(var(--pp-critical-bg))] text-[hsl(0_74%_42%)]">Critical · 38</span>
              </div>
              <div className="h-2 rounded-full bg-secondary mt-3 overflow-hidden">
                <div className="h-full w-[38%] rounded-full bg-[hsl(var(--pp-critical))]" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">27 similar component-failure cases · est. $3,861/mo at risk</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-[var(--pp-shadow-sm)] border-border">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Zap className="h-4.5 w-4.5 h-[18px] w-[18px]" /></span>
              <div>
                <p className="text-sm font-bold text-foreground">AI recommended fix</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Pause advertising for Wireless Earbuds and inspect Supplier B batch before accepting new orders.</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl shadow-[var(--pp-shadow-sm)] border-border">
              <CardContent className="p-4">
                <TrendingDown className="h-4 w-4 text-[hsl(142_72%_29%)]" />
                <p className="text-lg font-bold tabular-nums mt-1.5">$4,862</p>
                <p className="text-[11px] text-muted-foreground">monthly loss prevented</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-[var(--pp-shadow-sm)] border-border">
              <CardContent className="p-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-lg font-bold tabular-nums mt-1.5">96%</p>
                <p className="text-[11px] text-muted-foreground">classification confidence</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
