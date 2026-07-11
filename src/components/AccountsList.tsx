import React from "react";
import { AccountData } from "../types";
import { Star, Shield, ShieldAlert, AlertCircle, RefreshCw, Trash2, Power, Database, Sparkles } from "lucide-react";
import { cn } from "../utils/cn";

interface AccountsListProps {
  accounts: AccountData[];
  onSync: (email: string) => Promise<void>;
  onSwitch: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
  syncing: boolean;
}

export const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  onSync,
  onSwitch,
  onRemove,
  syncing,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <Shield className="text-success" size={13} />;
      case "expired":
        return <ShieldAlert className="text-warning" size={13} />;
      default:
        return <AlertCircle className="text-danger" size={13} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-success/15 text-success border-success/20";
      case "expired":
        return "bg-warning/15 text-warning border-warning/20";
      default:
        return "bg-danger/15 text-danger border-danger/20";
    }
  };

  const getQuotaColor = (pct: number | undefined | null, isExhausted: boolean) => {
    if (isExhausted || pct === 0) return "bg-danger";
    if (pct === undefined || pct === null) return "bg-muted";
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.5) return "bg-warning";
    if (pct >= 0.25) return "bg-warning/80"; // Warning Orange
    return "bg-danger";
  };

  const getQuotaTextColor = (pct: number | undefined | null, isExhausted: boolean) => {
    if (isExhausted || pct === 0) return "text-danger";
    if (pct === undefined || pct === null) return "text-muted-foreground";
    if (pct >= 0.75) return "text-success";
    if (pct >= 0.5) return "text-warning";
    if (pct >= 0.25) return "text-warning";
    return "text-danger";
  };

  const formatTime = (ms: number | undefined | null) => {
    if (ms === undefined || ms === null || ms <= 0) return "N/A";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-border py-12 px-4 text-center rounded-lg bg-card text-card-foreground">
        <AlertCircle className="text-muted-foreground mb-3" size={32} />
        <h3 className="text-sm font-semibold">No Accounts Connected</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Monitor your Google Antigravity quotas by connecting a Google account first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {accounts.map((account) => {
        const snapshot = account.cachedSnapshot;
        const credits = account.cachedCredits;
        
        // Filter out autocomplete models so card display is neat
        const models = snapshot?.models
          ? snapshot.models.filter((m) => !m.isAutocompleteOnly)
          : [];

        return (
          <div
            key={account.email}
            className={cn(
              "border border-border bg-card p-5 rounded-lg flex flex-col justify-between shadow-xs transition duration-150 relative",
              account.isActive ? "border-primary/45 ring-1 ring-primary/20" : "hover:border-muted-foreground/30"
            )}
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                <div className="space-y-1 truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm truncate" title={account.email}>
                      {account.email}
                    </h3>
                    {account.isActive && (
                      <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 border border-primary/20 bg-primary/10 text-primary rounded-md font-semibold select-none shrink-0">
                        <Star size={8} className="fill-current" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {snapshot?.planType ? `${snapshot.planType} Plan` : "No Quota Cached"}
                  </div>
                </div>
                <span className={cn("text-[9px] px-2 py-0.5 border rounded-full font-medium tracking-wider shrink-0 uppercase flex items-center gap-1", getStatusBadgeClass(account.status))}>
                  {getStatusIcon(account.status)}
                  {account.status}
                </span>
              </div>

              {/* Prompt Credits */}
              {credits && (
                <div className="space-y-1.5 bg-secondary/35 border border-border/40 p-3 rounded-md">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1">
                      <Database size={12} />
                      Credits
                    </span>
                    <span className="font-mono font-bold text-card-foreground">
                      {credits.available} / {credits.monthly}
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${credits.remainingPercentage * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Models Quota */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>Agent Quotas</span>
                </div>

                {models.length > 0 ? (
                  <div className="space-y-2.5">
                    {models.map((model) => {
                      const pct = model.remainingPercentage;
                      const isExh = model.isExhausted;
                      const resets = model.timeUntilResetMs;

                      return (
                        <div key={model.modelId} className="text-xs space-y-1">
                          <div className="flex justify-between items-center gap-2">
                            <span className="truncate max-w-[200px] font-medium" title={model.label}>
                              {model.label}
                            </span>
                            <span className={cn("font-mono font-bold shrink-0", getQuotaTextColor(pct, isExh))}>
                              {isExh ? "EXHAUSTED" : pct !== undefined && pct !== null ? `${Math.round(pct * 100)}%` : "N/A"}
                            </span>
                          </div>
                          
                          {pct !== undefined && pct !== null && (
                            <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-300", getQuotaColor(pct, isExh))}
                                style={{ width: `${pct * 100}%` }}
                              />
                            </div>
                          )}

                          {resets !== undefined && resets !== null && resets > 0 && (
                            <div className="text-[10px] text-warning font-medium flex justify-end -mt-0.5">
                              Resets: {formatTime(resets)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center border border-dashed border-border/80 py-6 rounded-md text-xs text-muted-foreground bg-secondary/15">
                    No active agent quotas cached. Click Sync.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 pt-3 flex items-center justify-between mt-5">
              <div className="text-[10px] text-muted-foreground font-medium">
                Sync: {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleTimeString() : "Never"}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Remove button */}
                <button
                  onClick={() => {
                    if (confirm(`Remove account session for ${account.email}?`)) {
                      onRemove(account.email);
                    }
                  }}
                  className="inline-flex items-center justify-center p-1.5 border border-border hover:bg-destructive/10 hover:border-destructive/20 text-muted-foreground hover:text-danger rounded-md transition cursor-pointer"
                  title="Remove Session"
                >
                  <Trash2 size={13} />
                </button>
                {/* Sync button */}
                <button
                  onClick={() => onSync(account.email)}
                  disabled={syncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-border hover:bg-secondary text-card-foreground hover:text-card-foreground rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                  title="Sync Quota"
                >
                  <RefreshCw size={12} className={cn(syncing && "animate-spin")} />
                  Sync
                </button>
                {/* Make Active button */}
                {!account.isActive && (
                  <button
                    onClick={() => onSwitch(account.email)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-md text-xs font-semibold transition cursor-pointer"
                    title="Make Active"
                  >
                    <Power size={12} />
                    Active
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
