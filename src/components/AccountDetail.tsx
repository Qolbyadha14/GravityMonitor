import React from "react";
import { AccountData } from "../types";
import {
  RefreshCw,
  Star,
  Sparkles,
  Database,
  Power,
  Trash2,
  Shield,
  ShieldAlert,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { cn } from "../utils/cn";

interface AccountDetailProps {
  account: AccountData | null;
  syncing: boolean;
  onSync: (email: string) => Promise<void>;
  onSwitch: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
}

export const AccountDetail: React.FC<AccountDetailProps> = ({
  account,
  syncing,
  onSync,
  onSwitch,
  onRemove,
}) => {
  // ── helpers ──────────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return {
          cls: "bg-success/12 text-success border-success/25",
          icon: <Shield size={12} />,
        };
      case "expired":
        return {
          cls: "bg-warning/12 text-warning border-warning/25",
          icon: <ShieldAlert size={12} />,
        };
      default:
        return {
          cls: "bg-danger/12 text-danger border-danger/25",
          icon: <AlertCircle size={12} />,
        };
    }
  };

  const getQuotaBarColor = (pct: number | undefined | null, isExh: boolean) => {
    if (isExh || pct === 0) return "bg-danger";
    if (pct === undefined || pct === null) return "bg-muted";
    if (pct >= 0.75) return "bg-success";
    if (pct >= 0.5) return "bg-warning";
    if (pct >= 0.25) return "bg-warning/80";
    return "bg-danger";
  };

  const getQuotaTextColor = (pct: number | undefined | null, isExh: boolean) => {
    if (isExh || pct === 0) return "text-danger";
    if (pct === undefined || pct === null) return "text-muted-foreground";
    if (pct >= 0.75) return "text-success";
    if (pct >= 0.5) return "text-warning";
    if (pct >= 0.25) return "text-warning";
    return "text-danger";
  };

  const formatTime = (ms: number | undefined | null) => {
    if (ms === undefined || ms === null || ms <= 0) return null;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // ── empty state ───────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10 select-none">
        <div className="h-14 w-14 rounded-xl bg-secondary/60 border border-border flex items-center justify-center">
          <User size={24} className="text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-card-foreground">No account selected</p>
          <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
            Select an account from the list to view quota details.
          </p>
        </div>
      </div>
    );
  }

  const snapshot = account.cachedSnapshot;
  const credits = account.cachedCredits;
  const allModels = snapshot?.models ?? [];
  const chatModels = allModels.filter((m) => !m.isAutocompleteOnly);
  const autocompleteModels = allModels.filter((m) => m.isAutocompleteOnly);
  const statusBadge = getStatusBadge(account.status);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-start justify-between gap-3">
          {/* Left: email + badges */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1",
                  statusBadge.cls
                )}
              >
                {statusBadge.icon}
                {account.status.toUpperCase()}
              </span>
              {account.isActive && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold flex items-center gap-1">
                  <Star size={9} className="fill-current" />
                  ACTIVE
                </span>
              )}
              {snapshot?.planType && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-secondary/50 text-muted-foreground font-medium capitalize">
                  {snapshot.planType} Plan
                </span>
              )}
            </div>
            <h2
              className="text-sm font-bold text-card-foreground truncate max-w-[340px]"
              title={account.email}
            >
              {account.email}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock size={11} />
              <span>
                Last synced:{" "}
                {snapshot?.timestamp
                  ? new Date(snapshot.timestamp).toLocaleTimeString()
                  : "Never"}
              </span>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                if (confirm(`Remove account session for ${account.email}?`)) {
                  onRemove(account.email);
                }
              }}
              className="inline-flex items-center justify-center p-1.5 border border-border hover:bg-destructive/10 hover:border-destructive/20 text-muted-foreground hover:text-danger rounded-md transition cursor-pointer"
              title="Remove session"
            >
              <Trash2 size={13} />
            </button>
            <button
              onClick={() => onSync(account.email)}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary text-card-foreground rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={12} className={cn(syncing && "animate-spin")} />
              Sync
            </button>
            {!account.isActive && (
              <button
                onClick={() => onSwitch(account.email)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold transition cursor-pointer"
              >
                <Power size={12} />
                Set Active
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Prompt Credits */}
        {credits && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Database size={12} />
              <span>Prompt Credits</span>
            </div>
            <div className="border border-border bg-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly Available</span>
                <span className="font-mono font-bold text-card-foreground">
                  {credits.available}{" "}
                  <span className="text-muted-foreground font-normal">/ {credits.monthly}</span>
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${credits.remainingPercentage * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Used: {Math.round(credits.usedPercentage * 100)}%</span>
                <span>Remaining: {Math.round(credits.remainingPercentage * 100)}%</span>
              </div>
            </div>
          </section>
        )}

        {/* Agent / Chat Model Quotas */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Agent Quotas</span>
            {chatModels.length > 0 && (
              <span className="ml-auto normal-case font-medium text-muted-foreground/70 tracking-normal">
                {chatModels.length} model{chatModels.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {chatModels.length > 0 ? (
            <div className="space-y-2">
              {chatModels.map((model) => {
                const pct = model.remainingPercentage;
                const isExh = model.isExhausted;
                const resetLabel = formatTime(model.timeUntilResetMs);

                return (
                  <div
                    key={model.modelId}
                    className="border border-border bg-card rounded-lg p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-card-foreground truncate" title={model.label}>
                          {model.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {model.modelId}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold font-mono shrink-0",
                          getQuotaTextColor(pct, isExh)
                        )}
                      >
                        {isExh
                          ? "EXHAUSTED"
                          : pct !== undefined && pct !== null
                          ? `${Math.round(pct * 100)}%`
                          : "N/A"}
                      </span>
                    </div>

                    {pct !== undefined && pct !== null && (
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            getQuotaBarColor(pct, isExh)
                          )}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    )}

                    {resetLabel && (
                      <p className="text-[10px] text-warning font-medium text-right">
                        Resets in {resetLabel}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg py-8 text-center text-xs text-muted-foreground bg-secondary/10">
              No agent quota data cached. Click Sync to fetch.
            </div>
          )}
        </section>

        {/* Autocomplete Models (collapsed by default, shown if exist) */}
        {autocompleteModels.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>Autocomplete Quotas</span>
              <span className="ml-auto normal-case font-medium text-muted-foreground/70 tracking-normal">
                {autocompleteModels.length} model{autocompleteModels.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {autocompleteModels.map((model) => {
                const pct = model.remainingPercentage;
                const isExh = model.isExhausted;
                const resetLabel = formatTime(model.timeUntilResetMs);

                return (
                  <div
                    key={model.modelId}
                    className="border border-border/60 bg-secondary/20 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground truncate" title={model.label}>
                        {model.label}
                      </span>
                      <span className={cn("text-xs font-bold font-mono shrink-0", getQuotaTextColor(pct, isExh))}>
                        {isExh ? "EXHAUSTED" : pct !== undefined && pct !== null ? `${Math.round(pct * 100)}%` : "N/A"}
                      </span>
                    </div>
                    {pct !== undefined && pct !== null && (
                      <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", getQuotaBarColor(pct, isExh))}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                    )}
                    {resetLabel && (
                      <p className="text-[10px] text-warning font-medium text-right">
                        Resets in {resetLabel}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Account metadata */}
        <section className="space-y-2">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Account Info
          </div>
          <div className="border border-border bg-card rounded-lg divide-y divide-border/60">
            <div className="flex justify-between items-center px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate max-w-[220px]" title={account.email}>
                {account.email}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium">
                {account.addedAt ? new Date(account.addedAt).toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Last Synced</span>
              <span className="font-medium">
                {snapshot?.timestamp
                  ? new Date(snapshot.timestamp).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">Auth Status</span>
              <span className={cn("font-semibold capitalize", statusBadge.cls.replace(/bg-\S+\s?/, "").replace(/border-\S+\s?/, "").trim())}>
                {account.status}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
