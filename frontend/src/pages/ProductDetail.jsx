import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge, SeverityBadge, RecStatusBadge, HealthMeter, FadeIn, EmptyState } from "@/components/widgets";
import { fmtMoney, timeAgo, healthBarColor } from "@/lib/status";
import { ArrowLeft, MessageSquare, Layers, DollarSign, Users, ShieldAlert, ClipboardCheck } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, LineChart, Line, CartesianGrid } from "recharts";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const currency = user?.default_currency || "USD";

  useEffect(() => {
    API.get(`/products/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <EmptyState
        title="Product not found"
        description="This product may have been removed."
        action={<Button variant="outline" onClick={() => navigate("/products")}>Back to products</Button>}
        testId="product-not-found"
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const { product, complaints, insights, recommendations, main_category, impact } = data;

  // complaints per week for mini chart
  const buckets = {};
  complaints.forEach((c) => {
    const d = new Date(c.created_at);
    const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000);
    const week = Math.min(3, Math.floor(daysAgo / 7));
    const label = week === 0 ? "This wk" : `${week} wk ago`;
    buckets[label] = (buckets[label] || 0) + 1;
  });
  const chartData = ["3 wk ago", "2 wk ago", "1 wk ago", "This wk"].map((label) => ({ label, count: buckets[label] || 0 }));

  // health score trend from history
  const trendData = (product.health_history || []).map((h) => ({
    label: new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: h.score,
  }));

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`${product.platform}${product.supplier_name ? ` · Supplier: ${product.supplier_name}` : ""}`}
        testId="product-detail-header"
        actions={
          <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={() => navigate("/products")} data-testid="product-back-button">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> All products
          </Button>
        }
      />

      {/* Health header */}
      <FadeIn>
        <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
          <CardContent className="p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Health Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-5xl font-bold tabular-nums" style={{ color: healthBarColor(product.health_score) }} data-testid="product-health-score">
                    {product.health_score}
                  </p>
                  <span className="text-sm text-muted-foreground font-semibold">/100</span>
                </div>
                <HealthMeter score={product.health_score} className="mt-3" />
                <div className="mt-3">
                  <StatusBadge status={product.status} testId="product-status-badge" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Main Failure Pattern</p>
                <p className="text-sm font-bold text-foreground mt-1.5" data-testid="product-main-pattern">{product.main_pattern || main_category}</p>
                <p className="text-xs text-muted-foreground mt-1">Dominant category: {main_category}</p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground">{complaints.length}</span> complaints ·
                  <Layers className="h-3.5 w-3.5" />
                  <span className="font-semibold text-foreground" data-testid="product-similar-cases">{impact.similar_case_count}</span> similar cases
                </div>
              </div>
              <div className="h-28">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Complaint Timeline</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip cursor={{ fill: "hsl(210 40% 96%)" }} contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", fontSize: 12 }} />
                    <Bar dataKey="count" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Impact cards */}
      <FadeIn delay={0.08}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-4">
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
            <CardContent className="p-4">
              <DollarSign className="h-4 w-4 text-[hsl(0_74%_42%)]" />
              <p className="text-xl font-bold tabular-nums mt-1.5" data-testid="product-monthly-loss">{fmtMoney(impact.estimated_monthly_loss, currency)}</p>
              <p className="text-[11px] text-muted-foreground">Est. monthly revenue loss</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
            <CardContent className="p-4">
              <Users className="h-4 w-4 text-[hsl(142_72%_29%)]" />
              <p className="text-xl font-bold tabular-nums mt-1.5">{impact.estimated_future_complaints_prevented}</p>
              <p className="text-[11px] text-muted-foreground">Future complaints prevented</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
            <CardContent className="p-4">
              <ShieldAlert className="h-4 w-4 text-[hsl(32_81%_29%)]" />
              <p className="text-xl font-bold tabular-nums mt-1.5">{fmtMoney(impact.estimated_refund_exposure, currency)}</p>
              <p className="text-[11px] text-muted-foreground">Est. refund exposure</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 italic">Estimates are directional and based on your settings.</p>
      </FadeIn>

      {/* Health score trend */}
      {trendData.length >= 2 && (
        <FadeIn delay={0.1}>
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)] mt-4">
            <CardHeader className="pb-1"><CardTitle className="text-sm font-bold">Health Score Trend</CardTitle></CardHeader>
            <CardContent className="pt-1">
              <div className="h-40" data-testid="product-health-trend">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(214 32% 93%)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke={healthBarColor(product.health_score)} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: healthBarColor(product.health_score) }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Each point is a health snapshot — new complaints lower the score based on severity.</p>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Tabs */}
      <FadeIn delay={0.12}>
        <Tabs defaultValue="timeline" className="mt-5">
          <TabsList className="rounded-lg">
            <TabsTrigger value="timeline" className="text-xs font-bold rounded-md" data-testid="product-tab-timeline">Timeline</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs font-bold rounded-md" data-testid="product-tab-recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="raw" className="text-xs font-bold rounded-md" data-testid="product-tab-raw">Raw Complaints</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardContent className="p-5">
                {complaints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No complaints recorded yet.</p>
                ) : (
                  <div className="space-y-0" data-testid="product-complaint-timeline">
                    {complaints.map((c, i) => (
                      <div key={c.id} className="flex gap-3.5 group">
                        <div className="flex flex-col items-center">
                          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${c.insight?.severity === "Critical" ? "bg-[hsl(var(--pp-critical))]" : c.insight?.severity === "High" ? "bg-orange-500" : c.insight?.severity === "Medium" ? "bg-[hsl(38_92%_50%)]" : "bg-slate-300"}`} />
                          {i < complaints.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-foreground">{c.source}</p>
                            <span className="text-[11px] text-muted-foreground">· {c.platform} · {timeAgo(c.created_at)}</span>
                            {c.insight?.severity && <SeverityBadge severity={c.insight.severity} />}
                            {c.insight?.failure_category && (
                              <span className="text-[11px] font-semibold text-primary bg-primary/8 bg-primary/10 rounded-full px-2 py-0.5">{c.insight.failure_category}</span>
                            )}
                          </div>
                          <p className="text-sm text-foreground mt-1.5 leading-relaxed">“{c.raw_message}”</p>
                          {c.insight?.root_cause && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed"><span className="font-bold">Root cause:</span> {c.insight.root_cause}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <div className="space-y-3" data-testid="product-recommendation-history">
              {recommendations.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No recommendations yet" description="Save an insight for this product to generate recommendations." />
              ) : (
                recommendations.map((r) => (
                  <Card key={r.id} className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
                        </div>
                        <RecStatusBadge status={r.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                        <span>Est. impact: <span className="font-bold text-foreground tabular-nums">{fmtMoney(r.estimated_impact, currency)}/mo</span></span>
                        <span>· Created {timeAgo(r.created_at)}</span>
                        {r.approved_at && <span>· Approved {timeAgo(r.approved_at)}</span>}
                        {r.completed_at && <span>· Completed {timeAgo(r.completed_at)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardContent className="p-5 space-y-3" data-testid="product-raw-complaints">
                {complaints.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed">“{c.raw_message}”</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">{c.source} · {c.platform} · {timeAgo(c.created_at)}</p>
                  </div>
                ))}
                {complaints.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No raw complaints yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
