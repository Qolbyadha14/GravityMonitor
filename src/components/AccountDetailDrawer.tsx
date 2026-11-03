import React, { useState } from "react";
import { AccountData } from "../types";
import { groupModels, formatResetDuration } from "../utils/modelGrouping";
import { X, RefreshCw, Star, Sparkles, Database, Clock, CalendarClock } from "lucide-react";
import { cn } from "../utils/cn";
import { ConfirmModal } from "./ConfirmModal";

interface AccountDetailDrawerProps {
  account: AccountData | null;
  isOpen: boolean;
  onClose: () => void;
  onSync: (email: string) => Promise<void>;
  onSwitch: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
  syncing: boolean;
}

export const AccountDetailDrawer: React.FC<AccountDetailDrawerProps> = ({
  account,
  isOpen,
  onClose,
  onSync,
  onSwitch,
  onRemove,
  syncing,
}) => {
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  if (!isOpen || !account) return null;

  const snapshot = account.cachedSnapshot;
  const models = snapshot?.models || [];
  const credits = account.cachedCredits;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-success/15 text-success border-success/30";
      case "expired":
        return "bg-warning/15 text-warning border-warning/30";
      default:
        return "bg-danger/15 text-danger border-danger/30";
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


  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/55 animate-fade-in">
      {/* Backdrop click close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md border-l border-border bg-card p-6 shadow-xl h-full flex flex-col text-card-foreground animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold truncate max-w-[280px]">Account Details</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", getStatusColor(account.status))}>
                {account.status.toUpperCase()}
              </span>
              {account.isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-medium flex items-center gap-1">
                  <Star size={10} className="fill-current" /> ACTIVE
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-card-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
          {/* Metadata info */}
          <div className="bg-secondary/40 border border-border rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate max-w-[240px]">{account.email}</span>
            </div>
            {snapshot?.planType && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Plan Type:</span>
                <span className="font-medium capitalize">{snapshot.planType}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Added At:</span>
              <span className="font-medium">
                {account.addedAt ? new Date(account.addedAt).toLocaleString() : "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Last Checked:</span>
              <span className="font-medium">
                {snapshot?.timestamp ? new Date(snapshot.timestamp).toLocaleString() : "Never"}
              </span>
            </div>
          </div>

          {/* Prompt Credits */}
          {credits ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Database size={14} />
                <span>Prompt Credits</span>
              </div>
              <div className="border border-border bg-card p-4 rounded-lg space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Monthly Available</span>
                  <span className="font-mono font-semibold">
                    {credits.available} / {credits.monthly}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${credits.remainingPercentage * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Used: {Math.round(credits.usedPercentage * 100)}%</span>
                  <span>Remaining: {Math.round(credits.remainingPercentage * 100)}%</span>
                </div>
              </div>
            </div>
          ) : (
            snapshot && (
              <div className="text-xs text-muted-foreground text-center border border-dashed border-border py-4 rounded-lg">
                No prompt credits metadata returned by CLI.
              </div>
            )
          )}

          {/* Model Quotas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Model Quota Status</span>
            </div>

            {models.length > 0 ? (
              <div className="space-y-3">
                {groupModels(models, account.quotaSummary).map((group) => {
                  const hasDualLimits = !!(group.fiveHourBucket || group.weeklyBucket);
                  const fiveHourPct = group.fiveHourBucket?.remainingFraction ?? group.remainingPercentage;
                  const fiveHourExh = group.fiveHourBucket?.remainingFraction === 0 || group.isExhausted;
                  const fiveHourReset = formatResetDuration(group.fiveHourBucket?.resetTime, group.timeUntilResetMs);

                  const weeklyPct = group.weeklyBucket?.remainingFraction;
                  const weeklyExh = weeklyPct === 0;
                  const weeklyReset = formatResetDuration(group.weeklyBucket?.resetTime);

                  return (
                    <div key={group.name} className="border border-border p-4 rounded-lg space-y-3 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-card-foreground">{group.name} Quota</span>
                          {group.versionTag && (
                            <span className={cn(
                              "text-[9px] px-1.5 py-0.2 rounded font-semibold border",
                              group.versionTag === "Claude 5.5"
                                ? "bg-primary/15 text-primary border-primary/25"
                                : "bg-secondary text-muted-foreground border-border"
                            )}>
                              {group.versionTag}
                            </span>
                          )}
                          {group.name === "Claude / GPT" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                              Shared Quota
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dual limits */}
                      <div className="space-y-2">
                        {/* 5-Hour */}
                        <div className="bg-secondary/20 border border-border/50 rounded p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-card-foreground flex items-center gap-1 text-[11px]">
                              <Clock size={11} className="text-primary" /> 5-Hour Limit
                            </span>
                            <div className="flex items-center gap-1.5">
                              {fiveHourReset && (
                                <span className="text-[10px] text-warning font-medium">↻ {fiveHourReset}</span>
                              )}
                              <span className={cn("font-bold font-mono text-[11px]", getQuotaTextColor(fiveHourPct, fiveHourExh))}>
                                {fiveHourExh ? "EXHAUSTED" : fiveHourPct !== undefined && fiveHourPct !== null ? `${Math.round(fiveHourPct * 100)}%` : "N/A"}
                              </span>
                            </div>
                          </div>
                          {fiveHourPct !== undefined && fiveHourPct !== null && (
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", getQuotaColor(fiveHourPct, fiveHourExh))}
                                style={{ width: `${Math.max(0, Math.min(100, fiveHourPct * 100))}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Weekly */}
                        <div className="bg-secondary/20 border border-border/50 rounded p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-card-foreground flex items-center gap-1 text-[11px]">
                              <CalendarClock size={11} className="text-primary" /> Weekly Limit
                            </span>
                            <div className="flex items-center gap-1.5">
                              {weeklyReset && (
                                <span className="text-[10px] text-warning font-medium">↻ {weeklyReset}</span>
                              )}
                              <span className={cn("font-bold font-mono text-[11px]", getQuotaTextColor(weeklyPct, weeklyExh))}>
                                {weeklyExh ? "EXHAUSTED" : weeklyPct !== undefined && weeklyPct !== null ? `${Math.round(weeklyPct * 100)}%` : !hasDualLimits ? "Sync to view" : "N/A"}
                              </span>
                            </div>
                          </div>
                          {weeklyPct !== undefined && weeklyPct !== null && (
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", getQuotaColor(weeklyPct, weeklyExh))}
                                style={{ width: `${Math.max(0, Math.min(100, weeklyPct * 100))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {group.models.map((m) => (
                          <span key={m.modelId} className="text-[10px] text-muted-foreground font-mono bg-secondary/80 px-1.5 py-0.5 rounded border border-border/50">
                            {m.label || m.modelId}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center border border-dashed border-border py-8 rounded-lg text-sm text-muted-foreground">
                No active quota snapshots cached. Run Sync to fetch data.
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="border-t border-border pt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSync(account.email)}
              disabled={syncing}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-border hover:bg-secondary rounded-md text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
              Sync Account
            </button>
            <button
              onClick={() => onSwitch(account.email)}
              disabled={account.isActive}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-muted-foreground rounded-md text-sm font-medium transition cursor-pointer"
            >
              Make Active
            </button>
          </div>
          <button
            onClick={() => setShowConfirmRemove(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15 rounded-md text-sm font-medium transition cursor-pointer mt-2"
          >
            Remove Account Session
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmRemove}
        title="Remove Account Session"
        message={`Are you sure you want to remove the account session for ${account.email}?\n\nThis will remove local token files for this account.`}
        confirmText="Remove Account"
        isDanger={true}
        onConfirm={() => {
          onRemove(account.email);
          onClose();
        }}
        onClose={() => setShowConfirmRemove(false)}
      />
    </div>
  );
};
