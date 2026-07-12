// Consistent status + severity mapping used across the entire app.

export const healthTone = (score) => {
  if (score >= 80) return "healthy";
  if (score >= 50) return "watch";
  return "critical";
};

export const healthLabel = (score) => {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Watch";
  return "Critical";
};

export const statusClasses = {
  Healthy: "bg-[hsl(var(--pp-success-bg))] text-[hsl(142_72%_29%)] border border-[hsl(var(--pp-success))]/25",
  Watch: "bg-[hsl(var(--pp-warning-bg))] text-[hsl(32_81%_29%)] border border-[hsl(var(--pp-warning))]/30",
  Critical: "bg-[hsl(var(--pp-critical-bg))] text-[hsl(0_74%_42%)] border border-[hsl(var(--pp-critical))]/25",
};

export const severityClasses = {
  Low: "bg-secondary text-secondary-foreground border border-border",
  Medium: "bg-[hsl(var(--pp-warning-bg))] text-[hsl(32_81%_29%)] border border-[hsl(var(--pp-warning))]/30",
  High: "bg-[hsl(24_95%_94%)] text-[hsl(17_88%_40%)] border border-[hsl(24_95%_53%)]/30",
  Critical: "bg-[hsl(var(--pp-critical-bg))] text-[hsl(0_74%_42%)] border border-[hsl(var(--pp-critical))]/25",
};

export const recStatusClasses = {
  "Needs Review": "bg-secondary text-secondary-foreground border border-border",
  Approved: "bg-[hsl(var(--pp-success-bg))] text-[hsl(142_72%_29%)] border border-[hsl(var(--pp-success))]/25",
  "In Progress": "bg-blue-50 text-blue-700 border border-blue-200",
  Done: "bg-[hsl(var(--pp-success-bg))] text-[hsl(142_72%_29%)] border border-[hsl(var(--pp-success))]/25",
  Rejected: "bg-[hsl(var(--pp-critical-bg))] text-[hsl(0_74%_42%)] border border-[hsl(var(--pp-critical))]/25",
};

export const healthBarColor = (score) => {
  if (score >= 80) return "hsl(var(--pp-success))";
  if (score >= 50) return "hsl(38 92% 50%)";
  return "hsl(var(--pp-critical))";
};

export const fmtMoney = (value, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    return `$${Math.round(value || 0).toLocaleString()}`;
  }
};

export const timeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export const PLATFORMS = ["TikTok Shop", "Shopify", "Amazon", "Etsy", "Other"];
export const SOURCES = [
  "Return request",
  "Review",
  "Email",
  "Support chat",
  "Social media comment",
  "Marketplace message",
];
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];
