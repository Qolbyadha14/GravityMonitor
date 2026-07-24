import React from "react";
import { AccountData, ModelQuota } from "../types";
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

  // Helper to group models by provider family when there are many models
  const getModelDisplayItems = (models: ModelQuota[]) => {
    if (models.length <= 3) {
      return models.map((m) => {
        const isExh = m.isExhausted;
        const pct = isExh ? 0 : m.remainingPercentage;
        return {
          key: m.modelId,
          label: m.label || m.modelId,
          pct,
        };
      });
    }

    // Group by family (Claude, Gemini, GPT, etc.)
    const familyMap = new Map<string, { pcts: number[]; count: number }>();

    models.forEach((m) => {
      const isExh = m.isExhausted;
      const pct = isExh ? 0 : (m.remainingPercentage ?? null);
      const label = (m.label || m.modelId).toLowerCase();

      let family = "Other";
      if (label.includes("claude")) family = "Claude";
      else if (label.includes("gemini")) family = "Gemini";
      else if (label.includes("gpt")) family = "GPT";
      else if (m.label) family = m.label.split(" ")[0];

      if (!familyMap.has(family)) {
        familyMap.set(family, { pcts: [], count: 0 });
      }
      const entry = familyMap.get(family)!;
      entry.count += 1;
      if (pct !== null) entry.pcts.push(pct);
    });

    return Array.from(familyMap.entries()).map(([familyName, data]) => {
      const minPct = data.pcts.length > 0 ? Math.min(...data.pcts) : null;
      return {
        key: familyName,
        label: `${familyName} (${data.count})`,
        pct: minPct,
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
        const displayItems = getModelDisplayItems(chatModels);

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
                <div className="space-y-1">
                  {displayItems.map((item) => (
                    <div key={item.key} className="flex items-center gap-2 text-[10px]">
                      <span
                        className="font-medium text-muted-foreground truncate max-w-[90px] shrink-0"
                        title={item.label}
                      >
                        {item.label}
                      </span>
                      <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", getQuotaBarColor(item.pct))}
                          style={{ width: item.pct !== undefined && item.pct !== null ? `${item.pct * 100}%` : "0%" }}
                        />
                      </div>
                      <span className={cn("font-semibold shrink-0 font-mono text-[9.5px]", getQuotaLabelColor(item.pct))}>
                        {getQuotaLabel(item.pct)}
                      </span>
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
