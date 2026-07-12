import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, SeverityBadge, EmptyState, FadeIn } from "@/components/widgets";
import { timeAgo } from "@/lib/status";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bell, BellOff, ArrowRight, AlertTriangle, TrendingUp, Repeat, DollarSign, ClipboardCheck, CheckCheck } from "lucide-react";

const TYPE_META = {
  critical_status: { label: "Critical status", icon: AlertTriangle },
  volume_increase: { label: "Complaint volume", icon: TrendingUp },
  repeated_root_cause: { label: "Repeated root cause", icon: Repeat },
  high_loss: { label: "High loss", icon: DollarSign },
  recommendation_pending: { label: "Awaiting approval", icon: ClipboardCheck },
};

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    API.get("/alerts").then((res) => setAlerts(res.data)).catch(() => setAlerts([]));
  }, []);

  const markAllRead = async () => {
    try {
      await API.post("/alerts/read-all");
      setAlerts((as) => as.map((a) => ({ ...a, read: true })));
      toast.success("All alerts marked as read");
    } catch {
      toast.error("Failed to mark alerts read");
    }
  };

  const openProduct = async (a) => {
    if (!a.read) {
      API.patch(`/alerts/${a.id}/read`).catch(() => {});
    }
    navigate(`/products/${a.product_id}`);
  };

  const unreadCount = alerts?.filter((a) => !a.read).length || 0;

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""} need your attention.` : "You're all caught up."}
        testId="alerts-header"
        actions={
          alerts?.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={markAllRead} disabled={unreadCount === 0} data-testid="alerts-mark-all-read">
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
            </Button>
          )
        }
      />

      {!alerts ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No alerts"
          description="When a product enters Critical status or a repeated root cause is detected, you'll see it here."
          testId="alerts-empty"
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a, idx) => {
            const meta = TYPE_META[a.type] || { label: "Alert", icon: Bell };
            const Icon = meta.icon;
            return (
              <FadeIn key={a.id} delay={idx * 0.04}>
                <Card
                  className={cn(
                    "rounded-xl shadow-[var(--pp-shadow-sm)] transition-colors",
                    a.read ? "border-border" : a.severity === "Critical" ? "border-[hsl(var(--pp-critical))]/40 bg-[hsl(var(--pp-critical-bg))]/30 bg-card" : "border-primary/30"
                  )}
                  data-testid={`alert-card-${idx}`}
                >
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-3.5">
                      <span className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        a.severity === "Critical" ? "bg-[hsl(var(--pp-critical-bg))] text-[hsl(0_74%_42%)]" :
                        a.severity === "High" ? "bg-orange-50 text-orange-600" : "bg-[hsl(var(--pp-warning-bg))] text-[hsl(32_81%_29%)]"
                      )}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{a.message}</p>
                          {!a.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" title="Unread" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <SeverityBadge severity={a.severity} />
                          <span className="text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{meta.label}</span>
                          <span className="text-[11px] text-muted-foreground">{a.product_name} · {timeAgo(a.created_at)}</span>
                        </div>
                        {a.explanation && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.explanation}</p>}
                        {a.recommended_action && (
                          <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                            <span className="font-bold">Recommended action:</span> {a.recommended_action}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-9 rounded-lg font-semibold"
                          onClick={() => openProduct(a)}
                          data-testid="alert-open-product-button"
                        >
                          Open Product <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
