import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  PageHeader, KpiCard, HealthScoreChip, StatusBadge, SeverityBadge, FadeIn,
} from "@/components/widgets";
import { fmtMoney, timeAgo, healthBarColor } from "@/lib/status";
import {
  Package, AlertTriangle, ClipboardCheck, TrendingDown, Bell, ChevronRight, Plus,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    API.get("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard"));
  }, []);

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const { kpis, products, failure_trends, alerts } = data;
  const currency = user?.default_currency || "USD";

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${user?.store_name || "Seller"}`}
        subtitle="Here's your product health at a glance."
        testId="dashboard-header"
      />

      {/* KPI cards */}
      <FadeIn>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard label="Products Monitored" value={kpis.products_monitored} icon={Package} testId="dashboard-kpi-products-monitored" />
          <KpiCard label="Critical Products" value={kpis.critical_products} icon={AlertTriangle} tone="critical" testId="dashboard-kpi-critical-products" />
          <KpiCard label="Open Recommendations" value={kpis.open_recommendations} icon={ClipboardCheck} tone="warning" testId="dashboard-kpi-open-recommendations" />
          <KpiCard label="Est. Monthly Loss Prevented" value={fmtMoney(kpis.monthly_loss_prevented, currency)} icon={TrendingDown} tone="success" testId="dashboard-kpi-monthly-loss-prevented" />
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
        {/* Product Health */}
        <FadeIn delay={0.08} className="lg:col-span-2 order-2 lg:order-1">
          <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold">Product Health</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold h-7" onClick={() => navigate("/products")} data-testid="dashboard-view-all-products">
                View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold pl-5">Product</TableHead>
                      <TableHead className="text-xs font-bold text-center">Health</TableHead>
                      <TableHead className="text-xs font-bold">Main Failure Pattern</TableHead>
                      <TableHead className="text-xs font-bold text-right">Complaints</TableHead>
                      <TableHead className="text-xs font-bold text-center">Severity</TableHead>
                      <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-secondary/60"
                        onClick={() => navigate(`/products/${p.id}`)}
                        data-testid={`health-table-row-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <TableCell className="pl-5">
                          <p className="font-bold text-sm text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.platform}</p>
                        </TableCell>
                        <TableCell className="text-center"><HealthScoreChip score={p.health_score} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px]">{p.main_pattern || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-sm pr-6">{p.complaint_count}</TableCell>
                        <TableCell className="text-center"><SeverityBadge severity={p.severity} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={p.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden px-4 space-y-3 pb-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/products/${p.id}`)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 active:bg-secondary/50 transition-colors"
                    data-testid={`health-card-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{p.name}</p>
                      <HealthScoreChip score={p.health_score} />
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary mt-2.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.health_score}%`, backgroundColor: healthBarColor(p.health_score) }} />
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-xs text-muted-foreground truncate mr-2">{p.main_pattern}</p>
                      <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{p.complaint_count} complaints</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Right column: trends + alert feed */}
        <div className="space-y-4 md:space-y-6 order-1 lg:order-2">
          <FadeIn delay={0.12}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Top Failure Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5" data-testid="dashboard-failure-trends">
                {failure_trends.slice(0, 6).map((t) => (
                  <div key={t.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{t.category}</span>
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">{t.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
                {failure_trends.length === 0 && <p className="text-xs text-muted-foreground">No insights yet.</p>}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.16}>
            <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">Alert Feed</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold h-7" onClick={() => navigate("/alerts")} data-testid="dashboard-view-all-alerts">
                  View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-1 px-2 pb-3" data-testid="dashboard-alert-feed">
                {alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigate("/alerts")}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg px-3 py-2.5 hover:bg-secondary/70 transition-colors"
                  >
                    <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.severity === "Critical" ? "bg-[hsl(var(--pp-critical))]" : a.severity === "High" ? "bg-orange-500" : "bg-[hsl(38_92%_50%)]"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-snug">{a.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </button>
                ))}
                {alerts.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <Bell className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">No alerts yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <button
              onClick={() => navigate("/new-insight")}
              className="w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-4 flex items-center justify-center gap-2 text-primary font-bold text-sm"
              data-testid="dashboard-new-insight-cta"
            >
              <Plus className="h-4 w-4" /> Analyze a new complaint
            </button>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
