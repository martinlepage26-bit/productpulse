import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PageHeader, StagedAiLoader, SeverityBadge, FadeIn } from "@/components/widgets";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { fmtMoney, PLATFORMS, SOURCES } from "@/lib/status";
import {
  Sparkles, Copy, Save, CheckCircle2, Timer, ArrowRight, RotateCcw, Lightbulb,
  Target, Layers, DollarSign, Users, ShieldAlert, Loader2, Wrench,
} from "lucide-react";

const EXAMPLES = [
  {
    label: "Earbuds · left speaker died",
    product: "Wireless Earbuds", platform: "TikTok Shop", source: "Return request",
    message: "The headphones arrived working, but after three days the left speaker stopped working.",
  },
  {
    label: "Yoga mat · thinner than photos",
    product: "Yoga Mat", platform: "Amazon", source: "Review",
    message: "The photos made this mat look thick and cushioned but it's paper thin. My knees hurt during practice.",
  },
  {
    label: "Charger · cable broke in a week",
    product: "Phone Charger", platform: "Shopify", source: "Support chat",
    message: "The cable started fraying near the connector and completely broke after just one week of normal use.",
  },
];

export default function NewInsight() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // form | analyzing | result
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_name: "", platform: user?.default_platform || "TikTok Shop",
    source: "Return request", raw_message: "", internal_notes: "",
  });
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState(null); // {insight, recommendation, product}
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const currency = user?.default_currency || "USD";

  useEffect(() => {
    API.get("/products").then((res) => setProducts(res.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fillExample = (ex) => {
    setForm((f) => ({ ...f, product_name: ex.product, platform: ex.platform, source: ex.source, raw_message: ex.message }));
  };

  const handleAnalyze = async () => {
    if (!form.product_name.trim()) return toast.error("Enter a product name");
    if (!form.raw_message.trim()) return toast.error("Paste the customer message");
    setStep("analyzing");
    try {
      const res = await API.post("/insights/analyze", form);
      setAnalysis(res.data);
      setSaved(null);
      setStep("result");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analysis failed. Please try again.");
      setStep("form");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.post("/insights/save", { ...form, analysis });
      setSaved(res.data);
      toast.success("Insight saved — dashboard updated", {
        description: `${res.data.product.name} health is now ${res.data.product.health_score} (${res.data.product.status})`,
      });
      // PWA local notification for any newly created alerts
      if ("Notification" in window && Notification.permission === "granted" && res.data.alerts?.length) {
        navigator.serviceWorker?.ready.then((reg) =>
          reg.showNotification("ProductPulse AI — New alert", {
            body: res.data.alerts[0].message,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
          })
        ).catch(() => {});
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save insight");
    } finally {
      setSaving(false);
    }
  };

  const handleRecAction = async (status) => {
    if (!saved?.recommendation) return;
    setActionLoading(status);
    try {
      const res = await API.patch(`/recommendations/${saved.recommendation.id}/status`, { status });
      setSaved((s) => ({ ...s, recommendation: res.data }));
      toast.success(`Recommendation marked ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading("");
    }
  };

  const copySummary = async () => {
    const a = analysis;
    const text = [
      `ProductPulse AI Insight — ${form.product_name}`,
      `Failure Category: ${a.failure_category}`,
      `Severity: ${a.severity} | Confidence: ${a.confidence_score}%`,
      `Root Cause: ${a.root_cause}`,
      `Similar Cases: ${a.similar_case_count} (${a.cluster_status})`,
      `Est. Monthly Loss: ${fmtMoney(a.estimated_monthly_loss, currency)}`,
      `Est. Refund Exposure: ${fmtMoney(a.estimated_refund_exposure, currency)}`,
      `Recommended Fix: ${a.recommended_fix}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied to clipboard");
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  const reset = () => {
    setStep("form");
    setAnalysis(null);
    setSaved(null);
    setForm((f) => ({ ...f, raw_message: "", internal_notes: "" }));
  };

  // ---------------- RESULT VIEW ----------------
  if (step === "result" && analysis) {
    const a = analysis;
    return (
      <div>
        <PageHeader
          title="Insight Result"
          subtitle={`AI analysis for ${form.product_name} · ${form.platform} · ${form.source}`}
          testId="insight-result-header"
          actions={
            <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={reset} data-testid="insight-analyze-another">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Analyze another
            </Button>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: analysis */}
          <div className="lg:col-span-2 space-y-4">
            <FadeIn>
              <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold" data-testid="insight-result-category">
                      <Target className="h-4 w-4" /> {a.failure_category}
                    </span>
                    <SeverityBadge severity={a.severity} testId="insight-result-severity-badge" />
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-secondary rounded-full px-2.5 py-1" data-testid="insight-result-confidence">
                      <ShieldAlert className="h-3.5 w-3.5" /> {a.confidence_score}% confidence
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Root Cause</p>
                    <p className="text-base md:text-lg font-semibold text-foreground mt-1.5 leading-relaxed" data-testid="insight-result-root-cause">{a.root_cause}</p>
                  </div>

                  <Separator className="my-5" />

                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Extracted Facts</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="insight-result-facts">
                    {[
                      ["Issue", a.facts?.product_issue],
                      ["Timing", a.facts?.timing],
                      ["Defect", a.facts?.defect_description],
                      ["Customer expected", a.facts?.customer_expectation],
                      ["Affected area", a.facts?.affected_area],
                    ].map(([k, v]) => v && (
                      <div key={k} className="rounded-lg bg-secondary/60 border border-border px-3 py-2.5">
                        <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                        <p className="text-xs text-foreground mt-0.5 leading-relaxed">{v}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.08}>
              <Card className="rounded-xl border-primary/25 bg-primary/[0.03] shadow-[var(--pp-shadow-sm)]">
                <CardContent className="p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                      <Wrench className="h-5 w-5 text-primary-foreground" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wide">Recommended Fix</p>
                      <p className="text-sm md:text-base font-semibold text-foreground mt-1 leading-relaxed" data-testid="insight-result-recommended-fix">{a.recommended_fix}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.12}>
              <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Estimated Business Impact</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <DollarSign className="h-4 w-4 text-[hsl(0_74%_42%)]" />
                      <p className="text-xl font-bold tabular-nums mt-1.5" data-testid="insight-result-monthly-loss">{fmtMoney(a.estimated_monthly_loss, currency)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Est. monthly revenue loss</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <Users className="h-4 w-4 text-[hsl(142_72%_29%)]" />
                      <p className="text-xl font-bold tabular-nums mt-1.5" data-testid="insight-result-prevented">{a.estimated_future_complaints_prevented}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Future complaints prevented</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                      <ShieldAlert className="h-4 w-4 text-[hsl(32_81%_29%)]" />
                      <p className="text-xl font-bold tabular-nums mt-1.5" data-testid="insight-result-exposure">{fmtMoney(a.estimated_refund_exposure, currency)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Est. refund exposure</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 italic" data-testid="insight-result-disclaimer">Estimates are directional and based on your settings.</p>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          {/* Right: cluster + actions */}
          <div className="space-y-4">
            <FadeIn delay={0.1}>
              <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Similar Complaint Cluster</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold tabular-nums text-foreground" data-testid="insight-result-similar-cases">{a.similar_case_count}</p>
                    <p className="text-sm text-muted-foreground font-medium">similar cases</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{a.pattern_label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className={`font-bold capitalize ${a.cluster_status === "established" ? "text-[hsl(0_74%_42%)]" : "text-[hsl(32_81%_29%)]"}`}>{a.cluster_status}</span>
                      <span className="text-muted-foreground">pattern</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.14}>
              <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2.5">
                  {!saved ? (
                    <>
                      <Button className="w-full h-11 rounded-xl font-bold" onClick={handleSave} disabled={saving} data-testid="insight-save-button">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Insight
                      </Button>
                      <Button variant="outline" className="w-full h-11 rounded-xl font-semibold" onClick={copySummary} data-testid="insight-copy-summary-button">
                        <Copy className="h-4 w-4 mr-2" /> Copy Summary
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center pt-1">Saving updates product health, creates a recommendation, and triggers alerts.</p>
                    </>
                  ) : (
                    <>
                      <div className="rounded-lg bg-[hsl(var(--pp-success-bg))] border border-[hsl(var(--pp-success))]/25 px-3 py-2.5 flex items-center gap-2" data-testid="insight-saved-confirmation">
                        <CheckCircle2 className="h-4 w-4 text-[hsl(142_72%_29%)] shrink-0" />
                        <p className="text-xs font-semibold text-[hsl(142_72%_29%)]">
                          Saved — {saved.product.name} health: {saved.product.health_score} ({saved.product.status})
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/70 border border-border px-3 py-2">
                        <p className="text-[11px] font-bold text-muted-foreground">Recommendation status</p>
                        <p className="text-xs font-bold text-foreground mt-0.5" data-testid="insight-rec-status">{saved.recommendation.status}</p>
                      </div>
                      <Button
                        className="w-full h-11 rounded-xl font-bold bg-[hsl(142_71%_35%)] hover:bg-[hsl(142_71%_30%)] text-white"
                        onClick={() => handleRecAction("Approved")}
                        disabled={!!actionLoading || saved.recommendation.status === "Approved"}
                        data-testid="insight-approve-button"
                      >
                        {actionLoading === "Approved" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Approve Recommendation
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-11 rounded-xl font-semibold"
                        onClick={() => handleRecAction("In Progress")}
                        disabled={!!actionLoading || saved.recommendation.status === "In Progress"}
                        data-testid="insight-in-progress-button"
                      >
                        {actionLoading === "In Progress" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Timer className="h-4 w-4 mr-2" />}
                        Mark In Progress
                      </Button>
                      <Button variant="outline" className="w-full h-11 rounded-xl font-semibold" onClick={copySummary} data-testid="insight-copy-summary-button">
                        <Copy className="h-4 w-4 mr-2" /> Copy Summary
                      </Button>
                      <Button variant="ghost" className="w-full h-10 rounded-xl font-semibold text-primary" onClick={() => navigate(`/products/${saved.product.id}`)} data-testid="insight-view-product-button">
                        View {saved.product.name} <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- ANALYZING ----------------
  if (step === "analyzing") {
    return (
      <div className="max-w-2xl mx-auto pt-6">
        <StagedAiLoader testId="insight-ai-loader" />
      </div>
    );
  }

  // ---------------- FORM ----------------
  return (
    <div>
      <PageHeader
        title="New Insight"
        subtitle="Paste a customer complaint and let AI turn it into product intelligence."
        testId="new-insight-header"
        actions={<ImportCsvDialog onCompleted={() => API.get("/products").then((res) => setProducts(res.data)).catch(() => {})} />}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <Card className="lg:col-span-2 rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
          <CardContent className="p-5 md:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Product name</Label>
                <Input
                  value={form.product_name}
                  onChange={(e) => set("product_name", e.target.value)}
                  placeholder="e.g. Wireless Earbuds"
                  list="pp-products"
                  className="h-11 rounded-xl bg-white"
                  data-testid="insight-product-input"
                />
                <datalist id="pp-products">
                  {products.map((p) => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Platform</Label>
                <Select value={form.platform} onValueChange={(v) => set("platform", v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white" data-testid="insight-platform-select">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Complaint source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger className="h-11 rounded-xl bg-white" data-testid="insight-source-select">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Customer message</Label>
              <Textarea
                value={form.raw_message}
                onChange={(e) => set("raw_message", e.target.value)}
                placeholder='e.g. "The headphones arrived working, but after three days the left speaker stopped working."'
                rows={5}
                className="rounded-xl bg-white resize-none text-sm leading-relaxed"
                data-testid="insight-message-textarea"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Internal notes <span className="text-muted-foreground font-medium">(optional)</span></Label>
              <Textarea
                value={form.internal_notes}
                onChange={(e) => set("internal_notes", e.target.value)}
                placeholder="Anything your team should know — batch numbers, supplier context…"
                rows={2}
                className="rounded-xl bg-white resize-none text-sm"
                data-testid="insight-notes-textarea"
              />
            </div>
            <Button className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-base" onClick={handleAnalyze} data-testid="insight-analyze-button">
              <Sparkles className="h-4 w-4 mr-2" /> Analyze Complaint
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" /> Try an example
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => fillExample(ex)}
                  className="w-full text-left rounded-lg border border-border bg-secondary/50 hover:bg-secondary px-3 py-2.5 transition-colors"
                  data-testid={`insight-example-${ex.product.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <p className="text-xs font-bold text-foreground">{ex.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{ex.message}</p>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)] bg-secondary/40">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-foreground mb-2">What the AI does</p>
              <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                <li>1. Extracts structured facts from the message</li>
                <li>2. Identifies the likely root cause</li>
                <li>3. Clusters it against your saved complaints</li>
                <li>4. Recommends one specific operational fix</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
