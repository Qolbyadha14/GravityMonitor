import React from "react";
import { Star, Clock } from "lucide-react";
import { cn } from "../utils/cn";

interface AccountCardProps {
  email: string;
  status: "valid" | "expired" | "invalid";
  minQuotaRemaining: number | null;
  fiveHourResetIn?: string;
  isActive: boolean;
  onClick?: () => void;
}

const statusConfig = {
  valid: { dot: "bg-emerald-600", label: "Valid", color: "text-emerald-600" },
  expired: { dot: "bg-amber-600", label: "Expired", color: "text-amber-600" },
  invalid: { dot: "bg-red-600", label: "Invalid", color: "text-red-600" },
};

export const AccountCard: React.FC<AccountCardProps> = ({
  email,
  status,
  minQuotaRemaining,
  fiveHourResetIn,
  isActive,
  onClick,
}) => {
  const cfg = statusConfig[status];
  const quotaPct = minQuotaRemaining !== null ? Math.round(minQuotaRemaining * 100) : null;

  const quotaColor =
    minQuotaRemaining === null
      ? "text-muted-foreground"
      : minQuotaRemaining === 0
        ? "text-red-600"
        : minQuotaRemaining >= 0.75
          ? "text-emerald-600"
          : minQuotaRemaining >= 0.5
            ? "text-amber-600"
            : minQuotaRemaining >= 0.25
              ? "text-amber-600"
              : "text-red-600";

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-md border border-border hover:bg-secondary/60 transition-colors cursor-pointer group"
    >
      {/* Top: email + active badge */}
      <div className="flex items-center gap-2 min-w-0 mb-2">
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
        <span className="text-xs font-semibold text-card-foreground truncate flex-1">{email}</span>
        {isActive && <Star size={10} className="text-primary fill-primary shrink-0" />}
      </div>

      {/* Bottom: quota + reset timer */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Quota:</span>
          <span className={cn("font-mono font-semibold", quotaColor)}>
            {quotaPct !== null ? `${quotaPct}%` : "N/A"}
          </span>
        </div>
        {fiveHourResetIn && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock size={10} />
            <span className="text-[10px]">Reset: {fiveHourResetIn}</span>
          </div>
        )}
      </div>
    </button>
  );
};
