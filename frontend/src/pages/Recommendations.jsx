import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, RecStatusBadge, SeverityBadge, EmptyState, FadeIn } from "@/components/widgets";
import { fmtMoney, timeAgo } from "@/lib/status";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Timer, CheckCheck, ClipboardCheck, ExternalLink, Loader2 } from "lucide-react";

const FILTERS = ["All", "Needs Review", "Approved", "In Progress", "Done", "Rejected"];

export default function Recommendations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recs, setRecs] = useState(null);
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState(""); // `${id}:${status}`
  const currency = user?.default_currency || "USD";

  const load = () => API.get("/recommendations").then((res) => setRecs(res.data)).catch(() => setRecs([]));
  useEffect(() => { load(); }, []);

  const updateStatus = async (rec, status) => {
    setBusy(`${rec.id}:${status}`);
    try {
      const res = await API.patch(`/recommendations/${rec.id}/status`, { status });
      setRecs((rs) => rs.map((r) => (r.id === rec.id ? { ...r, ...res.data } : r)));
      toast.success(`“${rec.product_name}” recommendation ${status === "Needs Review" ? "reset" : `marked ${status}`}`);
    } catch {
      toast.error("Failed to update recommendation");
    } finally {
      setBusy("");
    }
  };

  const visible = recs?.filter((r) => filter === "All" || r.status === filter) || [];

  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle="Your operational fix approval queue."
        testId="recommendations-header"
      />

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" data-testid="recommendations-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors",
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-secondary"
            )}
            data-testid={`recommendations-filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {f}
            {recs && f !== "All" && (
              <span className="ml-1.5 tabular-nums">{recs.filter((r) => r.status === f).length}</span>
            )}
          </button>
        ))}
      </div>

      {!recs ? (
        <div className="space-y-3 mt-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardCheck}
            title={filter === "All" ? "No recommendations yet" : `Nothing ${filter.toLowerCase()}`}
            description="Analyze a customer complaint to generate operational recommendations."
            action={<Button onClick={() => navigate("/new-insight")} className="rounded-lg font-semibold">Analyze a complaint</Button>}
            testId="recommendations-empty"
          />
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          {visible.map((r, idx) => (
            <FadeIn key={r.id} delay={idx * 0.03}>
              <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]" data-testid={`recommendation-card-${idx}`}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                        onClick={() => navigate(`/products/${r.product_id}`)}
                        data-testid="recommendation-product-link"
                      >
                        {r.product_name} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {r.issue && <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">{r.issue}</span>}
                      {r.severity && <SeverityBadge severity={r.severity} />}
                    </div>
                    <RecStatusBadge status={r.status} testId={`recommendation-status-${idx}`} />
                  </div>

                  <p className="text-sm font-bold text-foreground mt-3">{r.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.description}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                    <span>Business impact: <span className="font-bold text-foreground tabular-nums">{fmtMoney(r.estimated_impact, currency)}/mo</span></span>
                    <span>· {timeAgo(r.created_at)}</span>
                  </div>

                  <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 mt-4">
                    {r.status !== "Approved" && r.status !== "Done" && (
                      <Button
                        size="sm"
                        className="h-10 rounded-lg font-bold bg-[hsl(142_71%_35%)] hover:bg-[hsl(142_71%_30%)] text-white"
                        onClick={() => updateStatus(r, "Approved")}
                        disabled={busy === `${r.id}:Approved`}
                        data-testid="recommendation-approve-button"
                      >
                        {busy === `${r.id}:Approved` ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                        Approve
                      </Button>
                    )}
                    {r.status !== "In Progress" && r.status !== "Done" && r.status !== "Rejected" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 rounded-lg font-semibold"
                        onClick={() => updateStatus(r, "In Progress")}
                        disabled={busy === `${r.id}:In Progress`}
                        data-testid="recommendation-in-progress-button"
                      >
                        {busy === `${r.id}:In Progress` ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Timer className="h-4 w-4 mr-1.5" />}
                        In Progress
                      </Button>
                    )}
                    {(r.status === "Approved" || r.status === "In Progress") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-10 rounded-lg font-semibold"
                        onClick={() => updateStatus(r, "Done")}
                        disabled={busy === `${r.id}:Done`}
                        data-testid="recommendation-done-button"
                      >
                        {busy === `${r.id}:Done` ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
                        Mark Done
                      </Button>
                    )}
                    {r.status !== "Rejected" && r.status !== "Done" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 rounded-lg font-semibold text-[hsl(0_74%_42%)] hover:bg-[hsl(var(--pp-critical-bg))]"
                        onClick={() => updateStatus(r, "Rejected")}
                        disabled={busy === `${r.id}:Rejected`}
                        data-testid="recommendation-reject-button"
                      >
                        {busy === `${r.id}:Rejected` ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                        Reject
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
