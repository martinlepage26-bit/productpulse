import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader, HealthScoreChip, StatusBadge, SeverityBadge, HealthMeter, EmptyState, FadeIn } from "@/components/widgets";
import { Package, ChevronRight, Plus } from "lucide-react";

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    API.get("/products").then((res) => setProducts(res.data)).catch(() => setProducts([]));
  }, []);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Health scores and failure patterns across your catalog."
        testId="products-header"
        actions={
          <Button size="sm" className="rounded-lg font-semibold" onClick={() => navigate("/new-insight")} data-testid="products-new-insight-button">
            <Plus className="h-4 w-4 mr-1.5" /> New Insight
          </Button>
        }
      />

      {!products ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Analyze your first customer complaint and ProductPulse will start monitoring the product automatically."
          action={<Button onClick={() => navigate("/new-insight")} className="rounded-lg font-semibold" data-testid="products-empty-cta">Analyze a complaint</Button>}
          testId="products-empty"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {products.map((p, idx) => (
            <FadeIn key={p.id} delay={idx * 0.04}>
              <Card
                className="rounded-xl border-border shadow-[var(--pp-shadow-sm)] hover:shadow-[var(--pp-shadow-md)] hover:border-primary/30 transition-shadow duration-200 cursor-pointer h-full"
                onClick={() => navigate(`/products/${p.id}`)}
                data-testid={`product-card-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.platform}{p.supplier_name ? ` · ${p.supplier_name}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <HealthScoreChip score={p.health_score} />
                    <HealthMeter score={p.health_score} className="flex-1" />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="min-w-0 mr-2">
                      <p className="text-[11px] text-muted-foreground">Main pattern</p>
                      <p className="text-xs font-semibold text-foreground truncate">{p.main_pattern || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SeverityBadge severity={p.severity} />
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">{p.complaint_count}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
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
