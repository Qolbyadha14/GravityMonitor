import React from "react";
import { Clock } from "lucide-react";
import { cn } from "../utils/cn";

interface QuotaIndicatorProps {
  fiveHourRemaining: number | null;
  fiveHourResetIn: string;
  weeklyRemaining: number | null;
  weeklyResetIn: string;
  status: "healthy" | "caution" | "critical";
}

const statusColors = {
  healthy: { bg: "bg-emerald-50", bar: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-200" },
  caution: { bg: "bg-amber-50", bar: "bg-amber-600", text: "text-amber-600", border: "border-amber-200" },
  critical: { bg: "bg-red-50", bar: "bg-red-600", text: "text-red-600", border: "border-red-200" },
};

export const QuotaIndicator: React.FC<QuotaIndicatorProps> = ({
  fiveHourRemaining,
  fiveHourResetIn,
  weeklyRemaining,
  weeklyResetIn,
  status,
}) => {
  const colors = statusColors[status];

  const renderQuotaRow = (label: string, remaining: number | null, resetIn: string) => {
    const pct = remaining !== null ? Math.round(remaining * 100) : null;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-card-foreground">{label}</span>
          <span className={cn("font-mono font-semibold", colors.text)}>
            {pct !== null ? `${pct}%` : "N/A"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", colors.bar)}
              style={{ width: remaining !== null ? `${remaining * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono shrink-0 w-14 text-right">{resetIn}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("border rounded-lg p-3.5 space-y-3", colors.border, colors.bg)}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.text.replace("text-", "") }}>
        <Clock size={12} />
        <span>Quota Status</span>
      </div>
      <div className="space-y-3">
        {renderQuotaRow("5-Hour Limit", fiveHourRemaining, fiveHourResetIn)}
        {renderQuotaRow("Weekly Limit", weeklyRemaining, weeklyResetIn)}
      </div>
    </div>
  );
};
