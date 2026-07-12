import React, { useEffect, useState } from "react";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader, FadeIn } from "@/components/widgets";
import { PLATFORMS, CURRENCIES } from "@/lib/status";
import { toast } from "sonner";
import { Save, Loader2, Smartphone, Monitor, Wifi, WifiOff, CheckCircle2, LogOut, Share, MoreVertical, Bell, BellRing } from "lucide-react";

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [notifPermission, setNotifPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const isStandalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    API.get("/settings").then((res) => {
      const u = res.data;
      setForm({
        store_name: u.store_name || "",
        default_currency: u.default_currency || "USD",
        monthly_order_volume: u.monthly_order_volume ?? 0,
        average_order_value: u.average_order_value ?? 0,
        refund_cost_estimate: u.refund_cost_estimate ?? 0,
        enable_mobile_alerts: u.enable_mobile_alerts ?? true,
        default_platform: u.default_platform || "Shopify",
      });
    }).catch(() => toast.error("Failed to load settings"));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => setSwReady(!!reg));
    }
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser does not support notifications");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      toast.success("Browser notifications enabled");
      try {
        const reg = await navigator.serviceWorker?.ready;
        reg?.showNotification("ProductPulse AI", {
          body: "Notifications are on — you'll be alerted when a product turns Critical.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
        });
      } catch {
        /* no-op */
      }
    } else if (perm === "denied") {
      toast.error("Notifications blocked — enable them in your browser settings");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put("/settings", {
        ...form,
        monthly_order_volume: Number(form.monthly_order_volume) || 0,
        average_order_value: Number(form.average_order_value) || 0,
        refund_cost_estimate: Number(form.refund_cost_estimate) || 0,
      });
      await refreshUser();
      toast.success("Settings saved — impact estimates will use the new values");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="space-y-4"><div className="h-10 w-48 bg-secondary rounded-lg animate-pulse" /><div className="h-96 bg-secondary rounded-xl animate-pulse" /></div>;
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Configure your store profile and impact assumptions." testId="settings-header" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4">
          <FadeIn>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">Store Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Store name</Label>
                    <Input value={form.store_name} onChange={(e) => set("store_name", e.target.value)} className="h-11 rounded-xl bg-white" data-testid="settings-store-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Default platform</Label>
                    <Select value={form.default_platform} onValueChange={(v) => set("default_platform", v)}>
                      <SelectTrigger className="h-11 rounded-xl bg-white" data-testid="settings-default-platform"><SelectValue /></SelectTrigger>
                      <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Default currency</Label>
                    <Select value={form.default_currency} onValueChange={(v) => set("default_currency", v)}>
                      <SelectTrigger className="h-11 rounded-xl bg-white" data-testid="settings-currency"><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.06}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Business Assumptions</CardTitle>
                <p className="text-xs text-muted-foreground">Used to calculate estimated monthly loss, refund exposure, and complaints prevented.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Monthly order volume</Label>
                    <Input type="number" min="0" value={form.monthly_order_volume} onChange={(e) => set("monthly_order_volume", e.target.value)} className="h-11 rounded-xl bg-white tabular-nums" data-testid="settings-order-volume" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Average order value</Label>
                    <Input type="number" min="0" step="0.01" value={form.average_order_value} onChange={(e) => set("average_order_value", e.target.value)} className="h-11 rounded-xl bg-white tabular-nums" data-testid="settings-aov" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Refund cost estimate</Label>
                    <Input type="number" min="0" step="0.01" value={form.refund_cost_estimate} onChange={(e) => set("refund_cost_estimate", e.target.value)} className="h-11 rounded-xl bg-white tabular-nums" data-testid="settings-refund-cost" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 italic">Estimates are directional and based on your settings.</p>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enable mobile alerts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Show in-app alerts for critical products and repeated root causes.</p>
                  </div>
                  <Switch checked={form.enable_mobile_alerts} onCheckedChange={(v) => set("enable_mobile_alerts", v)} data-testid="settings-mobile-alerts-switch" />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Browser notifications</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notifPermission === "granted"
                        ? "Enabled — you'll get a notification when new alerts are created."
                        : notifPermission === "denied"
                        ? "Blocked by your browser — allow notifications for this site to enable."
                        : notifPermission === "unsupported"
                        ? "Not supported by this browser."
                        : "Get notified when a product turns Critical or an import finishes."}
                    </p>
                  </div>
                  {notifPermission === "granted" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(142_72%_29%)] bg-[hsl(var(--pp-success-bg))] border border-[hsl(var(--pp-success))]/25 rounded-full px-3 py-1.5 whitespace-nowrap" data-testid="settings-notifications-status">
                      <BellRing className="h-3.5 w-3.5" /> On
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" className="rounded-lg font-semibold whitespace-nowrap" onClick={enableNotifications} disabled={notifPermission === "unsupported" || notifPermission === "denied"} data-testid="settings-enable-notifications">
                      <Bell className="h-3.5 w-3.5 mr-1.5" /> Enable
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <div className="flex items-center gap-3">
            <Button className="h-11 px-6 rounded-xl font-bold" onClick={handleSave} disabled={saving} data-testid="settings-save-button">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save settings
            </Button>
            <Button variant="ghost" className="h-11 rounded-xl font-semibold text-[hsl(0_74%_42%)] hover:bg-[hsl(var(--pp-critical-bg))]" onClick={() => { logout(); navigate("/login"); }} data-testid="settings-logout-button">
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </Button>
          </div>
        </div>

        {/* PWA panel */}
        <div className="space-y-4">
          <FadeIn delay={0.08}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">App Status</CardTitle></CardHeader>
              <CardContent className="space-y-3" data-testid="settings-pwa-status">
                <div className="flex items-center gap-2.5 text-xs">
                  {online ? <Wifi className="h-4 w-4 text-[hsl(142_72%_29%)]" /> : <WifiOff className="h-4 w-4 text-[hsl(0_74%_42%)]" />}
                  <span className="font-semibold text-foreground">{online ? "Online" : "Offline"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <CheckCircle2 className={`h-4 w-4 ${swReady ? "text-[hsl(142_72%_29%)]" : "text-muted-foreground"}`} />
                  <span className="font-semibold text-foreground">{swReady ? "Offline-ready — service worker active" : "Service worker not registered yet"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  {isStandalone ? <Smartphone className="h-4 w-4 text-primary" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-foreground">{isStandalone ? "Running as installed app" : "Running in browser"}</span>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.12}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)] bg-secondary/40">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">Install ProductPulse</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed" data-testid="settings-install-instructions">
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> iPhone / iPad (Safari)</p>
                  <p className="mt-1">Tap the <Share className="h-3 w-3 inline" /> Share button, then choose <span className="font-semibold text-foreground">“Add to Home Screen”</span>.</p>
                </div>
                <Separator />
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Android (Chrome)</p>
                  <p className="mt-1">Tap the <MoreVertical className="h-3 w-3 inline" /> menu, then choose <span className="font-semibold text-foreground">“Install app”</span>.</p>
                </div>
                <Separator />
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Desktop (Chrome / Edge)</p>
                  <p className="mt-1">Click the install icon in the address bar, then <span className="font-semibold text-foreground">“Install”</span>.</p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
