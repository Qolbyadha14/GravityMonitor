import React from "react";
import { Star, Clock, CalendarClock } from "lucide-react";
import { cn } from "../utils/cn";

interface AccountCardProps {
  email: string;
  status: "valid" | "expired" | "invalid";
  planType?: string | null;
  fiveHourPct: number | null;
  fiveHourResetIn?: string | null;
  weeklyPct: number | null;
  weeklyResetIn?: string | null;
  isActive: boolean;
  onClick?: () => void;
}

const statusConfig = {
  valid: { dot: "bg-success", label: "Valid", color: "text-success" },
  expired: { dot: "bg-warning", label: "Expired", color: "text-warning" },
  invalid: { dot: "bg-danger", label: "Invalid", color: "text-danger" },
};

const getBarColor = (pct: number | null) => {
  if (pct === null) return "bg-muted";
  if (pct === 0) return "bg-danger";
  if (pct >= 0.75) return "bg-success";
  if (pct >= 0.3) return "bg-warning";
  return "bg-danger";
};

const getTextColor = (pct: number | null) => {
  if (pct === null) return "text-muted-foreground";
  if (pct === 0) return "text-danger";
  if (pct >= 0.75) return "text-success";
  if (pct >= 0.3) return "text-warning";
  return "text-danger";
};

export const AccountCard: React.FC<AccountCardProps> = ({
  email,
  status,
  planType,
  fiveHourPct,
  fiveHourResetIn,
  weeklyPct,
  weeklyResetIn,
  isActive,
  onClick,
}) => {
  const cfg = statusConfig[status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-lg border bg-card hover:bg-secondary/40 transition-all duration-150 cursor-pointer shadow-xs flex flex-col justify-between gap-3 relative group",
        isActive
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border hover:border-border/80"
      )}
    >
      {/* Top: Email + Badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
            <span
              className="text-xs font-bold text-card-foreground truncate block"
              title={email}
            >
              {email}
            </span>
          </div>
          {isActive && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/25 shrink-0">
              <Star size={10} className="fill-current" />
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {planType && (
            <span className="capitalize px-1.5 py-0.5 rounded bg-secondary font-medium border border-border/60">
              {planType}
            </span>
          )}
          <span className="capitalize font-medium">{cfg.label}</span>
        </div>
      </div>

      {/* Middle: Quota indicators */}
      <div className="space-y-2 pt-1 border-t border-border/50 text-xs">
        {/* 5-Hour */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Clock size={11} className="text-primary" />
              5-Hour Limit
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              {fiveHourResetIn && (
                <span className="text-[10px] text-muted-foreground font-sans">
                  ↻ {fiveHourResetIn}
                </span>
              )}
              <span className={cn("font-bold", getTextColor(fiveHourPct))}>
                {fiveHourPct !== null ? `${Math.round(fiveHourPct * 100)}%` : "N/A"}
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", getBarColor(fiveHourPct))}
              style={{ width: `${fiveHourPct !== null ? Math.max(0, Math.min(100, fiveHourPct * 100)) : 0}%` }}
            />
          </div>
        </div>

        {/* Weekly */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <CalendarClock size={11} className="text-primary" />
              Weekly Limit
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              {weeklyResetIn && (
                <span className="text-[10px] text-muted-foreground font-sans">
                  ↻ {weeklyResetIn}
                </span>
              )}
              <span className={cn("font-bold", getTextColor(weeklyPct))}>
                {weeklyPct !== null ? `${Math.round(weeklyPct * 100)}%` : "N/A"}
              </span>
            </div>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-300", getBarColor(weeklyPct))}
              style={{ width: `${weeklyPct !== null ? Math.max(0, Math.min(100, weeklyPct * 100)) : 0}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
};
