import React from "react";
import { AccountData } from "../types";
import { Star, Shield, ShieldAlert, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";

interface AccountsListProps {
  accounts: AccountData[];
  selectedEmail: string | null;
  onSelect: (email: string) => void;
}

export const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  selectedEmail,
  onSelect,
}) => {
  const getStatusDot = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-success";
      case "expired":
        return "bg-warning";
      default:
        return "bg-danger";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <Shield className="text-success" size={11} />;
      case "expired":
        return <ShieldAlert className="text-warning" size={11} />;
      default:
        return <AlertCircle className="text-danger" size={11} />;
    }
  };

  const getMinQuotaPct = (account: AccountData): number | null => {
    const models = account.cachedSnapshot?.models?.filter((m) => !m.isAutocompleteOnly) ?? [];
    const pcts = models
      .filter((m) => m.remainingPercentage !== undefined && m.remainingPercentage !== null)
      .map((m) => m.remainingPercentage as number);
    if (pcts.length === 0) {
      if (models.some((m) => m.isExhausted)) return 0;
      return null;
    }
    return Math.min(...pcts);
  };

  const getQuotaBarColor = (pct: number | null): string => {
    if (pct === null) return "bg-muted-foreground/30";
    if (pct === 0) return "bg-danger";
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.5) return "bg-warning";
    if (pct >= 0.25) return "bg-warning/80";
    return "bg-danger";
  };

  const getQuotaLabel = (pct: number | null): string => {
    if (pct === null) return "No data";
    if (pct === 0) return "Exhausted";
    return `${Math.round(pct * 100)}% left`;
  };

  const getQuotaLabelColor = (pct: number | null): string => {
    if (pct === null) return "text-muted-foreground";
    if (pct === 0) return "text-danger";
    if (pct >= 0.75) return "text-success";
    if (pct >= 0.5) return "text-warning";
    if (pct >= 0.25) return "text-warning";
    return "text-danger";
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 py-10">
        <AlertCircle className="text-muted-foreground/50" size={28} />
        <div>
          <p className="text-xs font-semibold text-card-foreground">No Accounts</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Add a Google account to start monitoring quotas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-2 pb-2">
      {accounts.map((account) => {
        const isSelected = account.email === selectedEmail;
        const minQuota = getMinQuotaPct(account);
        const modelCount = account.cachedSnapshot?.models?.filter((m) => !m.isAutocompleteOnly).length ?? 0;

        return (
          <button
            key={account.email}
            onClick={() => onSelect(account.email)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 cursor-pointer group",
              isSelected
                ? "bg-primary/10 border border-primary/25 shadow-xs"
                : "hover:bg-secondary/70 border border-transparent"
            )}
          >
            {/* Top row: email + status */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Status dot */}
              <span
                className={cn("h-1.5 w-1.5 rounded-full shrink-0", getStatusDot(account.status))}
              />
              {/* Email */}
              <span
                className={cn(
                  "text-xs font-medium truncate flex-1 min-w-0",
                  isSelected ? "text-primary" : "text-card-foreground"
                )}
                title={account.email}
              >
                {account.email}
              </span>
              {/* Active badge */}
              {account.isActive && (
                <Star
                  size={10}
                  className="text-primary fill-primary shrink-0"
                  title="Active account"
                />
              )}
            </div>

            {/* Bottom row: plan + quota mini bar */}
            <div className="mt-2 space-y-1">
              {/* Mini quota bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", getQuotaBarColor(minQuota))}
                    style={{ width: minQuota !== null ? `${minQuota * 100}%` : "0%" }}
                  />
                </div>
                <span className={cn("text-[10px] font-semibold shrink-0 font-mono", getQuotaLabelColor(minQuota))}>
                  {getQuotaLabel(minQuota)}
                </span>
              </div>

              {/* Sub info row */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {getStatusIcon(account.status)}
                <span className="capitalize">{account.status}</span>
                {account.cachedSnapshot?.planType && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="capitalize">{account.cachedSnapshot.planType}</span>
                  </>
                )}
                {modelCount > 0 && (
                  <>
                    <span className="opacity-40">·</span>
                    <Sparkles size={9} className="shrink-0" />
                    <span>{modelCount} models</span>
                  </>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
