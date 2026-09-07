import React from "react";
import { AccountData, ModelQuota } from "../types";
import { groupModels } from "../utils/modelGrouping";
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

  // Helper to group models by quota provider family (Claude / GPT combined, Gemini, etc.)
  const getModelDisplayItems = (models: ModelQuota[], quotaSummary?: AccountData["quotaSummary"]) => {
    const groups = groupModels(models, quotaSummary);
    return groups.map((group) => {
      const fiveHourPct = group.fiveHourBucket?.remainingFraction ?? group.remainingPercentage;
      const weeklyPct = group.weeklyBucket?.remainingFraction;
      return {
        key: group.name,
        name: group.name,
        label: `${group.name} (${group.models.length})`,
        fiveHourPct,
        weeklyPct,
        hasDual: !!(group.fiveHourBucket || group.weeklyBucket),
      };
    });
  };

  const getQuotaBarColor = (pct: number | null | undefined): string => {
    if (pct === null || pct === undefined) return "bg-muted-foreground/30";
    if (pct === 0) return "bg-danger";
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.5) return "bg-warning";
    if (pct >= 0.25) return "bg-warning/80";
    return "bg-danger";
  };

  const getQuotaLabel = (pct: number | null | undefined): string => {
    if (pct === null || pct === undefined) return "No data";
    if (pct === 0) return "Exhausted";
    return `${Math.round(pct * 100)}% left`;
  };

  const getQuotaLabelColor = (pct: number | null | undefined): string => {
    if (pct === null || pct === undefined) return "text-muted-foreground";
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
        const chatModels = account.cachedSnapshot?.models?.filter((m) => !m.isAutocompleteOnly) ?? [];
        const modelCount = chatModels.length;
        const displayItems = getModelDisplayItems(chatModels, account.quotaSummary);

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
                />
              )}
            </div>

            {/* Bottom row: plan + per-model quota mini bars */}
            <div className="mt-2 space-y-1.5">
              {displayItems.length > 0 ? (
                <div className="space-y-1.5">
                  {displayItems.map((item) => (
                    <div key={item.key} className="space-y-0.5 text-[10px]">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="font-medium text-muted-foreground truncate max-w-[95px]"
                          title={item.label}
                        >
                          {item.name}
                        </span>
                        {item.hasDual ? (
                          <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                            5h <strong className={getQuotaLabelColor(item.fiveHourPct)}>{item.fiveHourPct !== null && item.fiveHourPct !== undefined ? `${Math.round(item.fiveHourPct * 100)}%` : "N/A"}</strong>
                            {" · "}
                            Wk <strong className={getQuotaLabelColor(item.weeklyPct)}>{item.weeklyPct !== null && item.weeklyPct !== undefined ? `${Math.round(item.weeklyPct * 100)}%` : "N/A"}</strong>
                          </span>
                        ) : (
                          <span className={cn("font-semibold font-mono text-[9.5px] shrink-0", getQuotaLabelColor(item.fiveHourPct))}>
                            {getQuotaLabel(item.fiveHourPct)}
                          </span>
                        )}
                      </div>
                      {item.hasDual ? (
                        <div className="flex gap-1 items-center">
                          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden" title="5-Hour Limit">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", getQuotaBarColor(item.fiveHourPct))}
                              style={{ width: item.fiveHourPct !== undefined && item.fiveHourPct !== null ? `${item.fiveHourPct * 100}%` : "0%" }}
                            />
                          </div>
                          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden" title="Weekly Limit">
                            <div
                              className={cn("h-full rounded-full transition-all duration-300", getQuotaBarColor(item.weeklyPct))}
                              style={{ width: item.weeklyPct !== undefined && item.weeklyPct !== null ? `${item.weeklyPct * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-300", getQuotaBarColor(item.fiveHourPct))}
                            style={{ width: item.fiveHourPct !== undefined && item.fiveHourPct !== null ? `${item.fiveHourPct * 100}%` : "0%" }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-muted-foreground/30 w-0" />
                  </div>
                  <span className="text-[10px] font-semibold shrink-0 text-muted-foreground font-mono">
                    No data
                  </span>
                </div>
              )}

              {/* Sub info row */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-0.5">
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
