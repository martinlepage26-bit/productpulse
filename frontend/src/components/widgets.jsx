import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  statusClasses,
  severityClasses,
  recStatusClasses,
  healthLabel,
  healthBarColor,
} from "@/lib/status";
import { Sparkles } from "lucide-react";

export const PageHeader = ({ title, subtitle, actions, testId }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6" data-testid={testId}>
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

export const KpiCard = ({ label, value, icon: Icon, tone = "default", hint, testId }) => {
  const toneClasses = {
    default: "text-primary bg-primary/8",
    critical: "text-[hsl(var(--pp-critical))] bg-[hsl(var(--pp-critical-bg))]",
    success: "text-[hsl(142_72%_29%)] bg-[hsl(var(--pp-success-bg))]",
    warning: "text-[hsl(32_81%_29%)] bg-[hsl(var(--pp-warning-bg))]",
  };
  return (
    <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)] hover:shadow-[var(--pp-shadow-md)] hover:border-primary/30 transition-shadow duration-200" data-testid={testId}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          {Icon && (
            <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", toneClasses[tone])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="text-2xl md:text-3xl font-bold tabular-nums mt-2 text-foreground">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
};

export const HealthScoreChip = ({ score, testId }) => {
  const label = healthLabel(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums",
        statusClasses[label]
      )}
      data-testid={testId}
      title={`Health ${score}/100 — 80-100 Healthy · 50-79 Watch · 0-49 Critical`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: healthBarColor(score) }}
      />
      {score}
    </span>
  );
};

export const HealthMeter = ({ score, className }) => (
  <div className={cn("h-2 w-full rounded-full bg-secondary overflow-hidden", className)}>
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${score}%`, backgroundColor: healthBarColor(score) }}
    />
  </div>
);

export const StatusBadge = ({ status, testId }) => (
  <Badge variant="outline" className={cn("font-semibold rounded-full", statusClasses[status] || statusClasses.Watch)} data-testid={testId}>
    {status}
  </Badge>
);

export const SeverityBadge = ({ severity, testId }) => (
  <Badge variant="outline" className={cn("font-semibold rounded-full", severityClasses[severity] || severityClasses.Low)} data-testid={testId}>
    {severity}
  </Badge>
);

export const RecStatusBadge = ({ status, testId }) => (
  <Badge variant="outline" className={cn("font-semibold rounded-full whitespace-nowrap", recStatusClasses[status] || recStatusClasses["Needs Review"])} data-testid={testId}>
    {status}
  </Badge>
);

const AI_STAGES = [
  "Parsing complaint…",
  "Classifying failure mode…",
  "Clustering similar cases…",
  "Estimating impact & severity…",
  "Drafting operational fix…",
  "Finalizing insight…",
];

export const StagedAiLoader = ({ testId }) => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((s) => Math.min(s + 1, AI_STAGES.length - 1));
    }, 2200);
    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 7 + 2, 94));
    }, 500);
    return () => {
      clearInterval(stageTimer);
      clearInterval(progressTimer);
    };
  }, []);

  return (
    <Card className="rounded-xl border-border shadow-[var(--pp-shadow-sm)]" data-testid={testId}>
      <CardContent className="p-8 md:p-12 flex flex-col items-center text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-5"
        >
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </motion.div>
        <h3 className="text-lg font-bold text-foreground">Analyzing complaint</h3>
        <p className="text-sm text-muted-foreground mt-1 min-h-[20px]" data-testid="ai-loader-stage">
          {AI_STAGES[stage]}
        </p>
        <div className="w-full max-w-sm mt-6">
          <Progress value={progress} className="h-2" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Claude is extracting structured product intelligence</p>
      </CardContent>
    </Card>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action, testId }) => (
  <Card className="rounded-xl border-dashed border-border" data-testid={testId}>
    <CardContent className="p-10 flex flex-col items-center text-center">
      {Icon && (
        <span className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </span>
      )}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </CardContent>
  </Card>
);

export const FadeIn = ({ children, delay = 0, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);
