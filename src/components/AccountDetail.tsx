import React, { useState } from "react";
import { AccountData } from "../types";
import { useApp } from "../context/AppContext";
import { groupModels, formatResetDuration } from "../utils/modelGrouping";
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
  Cpu,
  Globe,
  HardDrive,
  CalendarClock,
  Tag,
  ToggleLeft,
  ToggleRight,
  Flame,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "../utils/cn";

import { ConfirmModal } from "./ConfirmModal";

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
  const { wakeupStatus, refreshWakeup } = useApp();
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [syncingWakeup, setSyncingWakeup] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return { cls: "bg-success/12 text-success border-success/25", icon: <Shield size={11} /> };
      case "expired":
        return { cls: "bg-warning/12 text-warning border-warning/25", icon: <ShieldAlert size={11} /> };
      default:
        return { cls: "bg-danger/12 text-danger border-danger/25", icon: <AlertCircle size={11} /> };
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
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDateTime = (tsOrMs: string | number | null | undefined) => {
    if (!tsOrMs) return "N/A";
    const d = typeof tsOrMs === "number" ? new Date(tsOrMs) : new Date(tsOrMs);
    return d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getMethodBadge = (method: string | undefined) => {
    switch (method) {
      case "google":
        return { label: "Google API", cls: "bg-primary/10 text-primary border-primary/20", icon: <Globe size={10} /> };
      case "local":
        return { label: "Local Cache", cls: "bg-secondary text-muted-foreground border-border", icon: <HardDrive size={10} /> };
      default:
        return { label: method ?? "Auto", cls: "bg-secondary text-muted-foreground border-border", icon: <Cpu size={10} /> };
    }
  };

  const getPlanBadge = (planType: string | undefined | null) => {
    if (!planType) return null;
    const lower = planType.toLowerCase();
    if (lower.includes("pro") || lower.includes("premium")) {
      return { label: planType, cls: "bg-primary/10 text-primary border-primary/20" };
    }
    if (lower.includes("free")) {
      return { label: planType, cls: "bg-secondary/80 text-muted-foreground border-border" };
    }
    return { label: planType, cls: "bg-secondary/80 text-muted-foreground border-border" };
  };

  const handleRefreshWakeup = async () => {
    setSyncingWakeup(true);
    try {
      await refreshWakeup();
    } finally {
      setSyncingWakeup(false);
    }
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
  const methodBadge = getMethodBadge(snapshot?.method);
  const planBadge = getPlanBadge(snapshot?.planType);

  // Token expiry countdown
  const now = Date.now();
  const tokenExpMs = account.tokenExpiresAt ? account.tokenExpiresAt - now : null;
  const tokenExpLabel = tokenExpMs !== null && tokenExpMs > 0
    ? formatTime(tokenExpMs) + " remaining"
    : tokenExpMs !== null ? "Expired" : null;
  const tokenIsExpiringSoon = tokenExpMs !== null && tokenExpMs > 0 && tokenExpMs < 30 * 60 * 1000; // < 30min

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-card/50">
        <div className="flex items-start justify-between gap-3">
          {/* Left: email + badges */}
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Auth status */}
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1", statusBadge.cls)}>
                {statusBadge.icon}
                {account.status.toUpperCase()}
              </span>

              {/* Active badge */}
              {account.isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary font-semibold flex items-center gap-1">
                  <Star size={9} className="fill-current" /> ACTIVE
                </span>
              )}

              {/* Plan Type */}
              {planBadge && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 capitalize", planBadge.cls)}>
                  <Tag size={9} />
                  {planBadge.label}
                </span>
              )}

              {/* Data method */}
              {snapshot && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1", methodBadge.cls)}>
                  {methodBadge.icon}
                  {methodBadge.label}
                </span>
              )}
            </div>

            <h2 className="text-sm font-bold text-card-foreground truncate max-w-[340px]" title={account.email}>
              {account.email}
            </h2>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              {snapshot?.timestamp && (
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  Synced {new Date(snapshot.timestamp).toLocaleTimeString()}
                </span>
              )}
              {tokenExpLabel && (
                <span className={cn("flex items-center gap-1 font-medium", tokenIsExpiringSoon ? "text-warning" : "")}>
                  <CalendarClock size={10} />
                  Token: {tokenExpLabel}
                </span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowConfirmRemove(true)}
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

        {/* ── Account Overview Cards (Plan + Credits summary) ─────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Plan Type card */}
          <div className="border border-border bg-card rounded-lg p-3.5 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Tag size={10} /> Plan Type
            </p>
            <p className={cn("text-base font-bold capitalize", planBadge ? planBadge.cls.match(/text-\S+/)?.[0] : "text-card-foreground")}>
              {snapshot?.planType ?? <span className="text-muted-foreground text-xs font-normal">Not available</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">
              via {methodBadge.label}
            </p>
          </div>

          {/* Token Expiry card */}
          <div className={cn(
            "border rounded-lg p-3.5 space-y-1",
            tokenIsExpiringSoon ? "border-warning/30 bg-warning/5" : "border-border bg-card"
          )}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CalendarClock size={10} /> Token Expiry
            </p>
            <p className={cn("text-sm font-bold", tokenIsExpiringSoon ? "text-warning" : "text-card-foreground")}>
              {tokenExpLabel ?? "N/A"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {account.tokenExpiresAt ? formatDateTime(account.tokenExpiresAt) : "No token data"}
            </p>
          </div>
        </div>

        {/* ── Prompt Credits ──────────────────────────────────────────── */}
        {credits && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Database size={12} />
              <span>Prompt Credits</span>
            </div>
            <div className="border border-border bg-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xl font-bold font-mono text-card-foreground">
                    {credits.available.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    of {credits.monthly.toLocaleString()} monthly
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-lg font-bold font-mono", getQuotaTextColor(credits.remainingPercentage, credits.remainingPercentage === 0))}>
                    {Math.round(credits.remainingPercentage * 100)}%
                  </p>
                  <p className="text-[11px] text-muted-foreground">remaining</p>
                </div>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", getQuotaBarColor(credits.remainingPercentage, credits.remainingPercentage === 0))}
                  style={{ width: `${credits.remainingPercentage * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Used {Math.round(credits.usedPercentage * 100)}%</span>
                <span>{Math.round((credits.monthly - credits.available))} used of {credits.monthly.toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Agent / Chat Model Quotas ───────────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <Sparkles size={12} />
            <span>Agent Quotas</span>
            {chatModels.length > 0 && (
              <span className="ml-auto normal-case font-medium text-muted-foreground/70 tracking-normal">
                {groupModels(chatModels).length} Quota Group{groupModels(chatModels).length !== 1 ? "s" : ""} ({chatModels.length} models)
              </span>
            )}
          </div>

          {chatModels.length > 0 ? (
            <div className="space-y-3">
              {groupModels(chatModels, account.quotaSummary).map((group) => {
                const fiveHourPct = group.fiveHourBucket?.remainingFraction ?? group.remainingPercentage;
                const fiveHourExh = group.fiveHourBucket?.remainingFraction === 0 || group.isExhausted;
                const fiveHourReset = formatResetDuration(group.fiveHourBucket?.resetTime, group.timeUntilResetMs);

                const weeklyPct = group.weeklyBucket?.remainingFraction;
                const weeklyExh = weeklyPct === 0;
                const weeklyReset = formatResetDuration(group.weeklyBucket?.resetTime);

                return (
                  <div key={group.name} className="border border-border bg-card rounded-lg p-4 space-y-3.5 shadow-xs">
                    {/* Group Title & Badges */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-card-foreground">
                          {group.name} Quota
                        </p>
                        {group.versionTag && (
                          <span className={cn(
                            "text-[9.5px] px-1.5 py-0.5 rounded font-semibold border",
                            group.versionTag === "Claude 5.5"
                              ? "bg-primary/15 text-primary border-primary/25"
                              : "bg-secondary text-muted-foreground border-border"
                          )}>
                            {group.versionTag}
                          </span>
                        )}
                        {group.name === "Claude / GPT" ? (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                            Shared Quota
                          </span>
                        ) : (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/60 font-medium">
                            Native Pool
                          </span>
                        )}
                      </div>
                      {group.quotaGroup?.description && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={group.quotaGroup.description}>
                          {group.quotaGroup.description}
                        </span>
                      )}
                    </div>

                    {/* Dual Limits Display */}
                    <div className="space-y-2.5">
                      {/* Five Hour Limit Remaining */}
                      <div className="bg-secondary/30 border border-border/60 rounded-md p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-card-foreground flex items-center gap-1.5">
                            <Clock size={12} className="text-primary" />
                            Five Hour Limit Remaining
                          </span>
                          <div className="flex items-center gap-2">
                            {fiveHourReset && (
                              <span className="text-[10.5px] text-warning font-medium flex items-center gap-0.5">
                                ↻ {fiveHourReset}
                              </span>
                            )}
                            <span className={cn("font-bold font-mono text-xs", getQuotaTextColor(fiveHourPct, fiveHourExh))}>
                              {fiveHourExh ? "EXHAUSTED" : fiveHourPct !== undefined && fiveHourPct !== null ? `${Math.round(fiveHourPct * 100)}%` : "N/A"}
                            </span>
                          </div>
                        </div>
                        {fiveHourPct !== undefined && fiveHourPct !== null && (
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", getQuotaBarColor(fiveHourPct, fiveHourExh))}
                              style={{ width: `${Math.max(0, Math.min(100, fiveHourPct * 100))}%` }}
                            />
                          </div>
                        )}
                        {group.fiveHourBucket?.description && (
                          <p className="text-[10px] text-muted-foreground/80 leading-tight">
                            {group.fiveHourBucket.description}
                          </p>
                        )}
                      </div>

                      {/* Weekly Limit Remaining */}
                      <div className="bg-secondary/30 border border-border/60 rounded-md p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-card-foreground flex items-center gap-1.5">
                            <CalendarClock size={12} className="text-primary" />
                            Weekly Limit Remaining
                          </span>
                          <div className="flex items-center gap-2">
                            {weeklyReset && (
                              <span className="text-[10.5px] text-warning font-medium flex items-center gap-0.5">
                                ↻ {weeklyReset}
                              </span>
                            )}
                            <span className={cn("font-bold font-mono text-xs", getQuotaTextColor(weeklyPct, weeklyExh))}>
                              {weeklyExh
                                ? "EXHAUSTED"
                                : weeklyPct !== undefined && weeklyPct !== null
                                ? `${Math.round(weeklyPct * 100)}%`
                                : !account.quotaSummary
                                ? "Sync to view"
                                : !group.weeklyBucket && group.name === "Gemini"
                                ? "N/A (5h Rolling Only)"
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                        {weeklyPct !== undefined && weeklyPct !== null && (
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", getQuotaBarColor(weeklyPct, weeklyExh))}
                              style={{ width: `${Math.max(0, Math.min(100, weeklyPct * 100))}%` }}
                            />
                          </div>
                        )}
                        {group.weeklyBucket?.description ? (
                          <p className="text-[10px] text-muted-foreground/80 leading-tight">
                            {group.weeklyBucket.description}
                          </p>
                        ) : account.quotaSummary && !group.weeklyBucket && group.name === "Gemini" ? (
                          <p className="text-[10px] text-muted-foreground/80 leading-tight">
                            Google only enforces weekly limits on Google AI Pro tier. Free tier uses 5-hour rolling limits only.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Models with Individual Quota Badges */}
                    <div className="pt-1 space-y-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                        Included Models ({group.models.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.models.map((m) => {
                          const mPct = m.remainingPercentage ?? fiveHourPct;
                          const mExh = m.isExhausted || mPct === 0;
                          return (
                            <span
                              key={m.modelId}
                              className="inline-flex items-center gap-1.5 text-[10px] bg-secondary/80 text-card-foreground px-2 py-1 rounded border border-border/60 font-mono"
                              title={`${m.modelId} · ${mPct !== null && mPct !== undefined ? Math.round(mPct * 100) + "% remaining" : "N/A"}`}
                            >
                              <span className="truncate max-w-[170px]">{m.label || m.modelId}</span>
                              <span className={cn("font-bold text-[9.5px]", getQuotaTextColor(mPct, mExh))}>
                                {mExh ? "0%" : mPct !== undefined && mPct !== null ? `${Math.round(mPct * 100)}%` : "N/A"}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
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

        {/* ── Autocomplete Models Toggle & List ─────────────────────────── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Cpu size={12} />
              <span>Autocomplete Models</span>
              {autocompleteModels.length > 0 && (
                <span className="normal-case font-medium text-muted-foreground/60 tracking-normal ml-1">
                  ({autocompleteModels.length})
                </span>
              )}
            </div>

            <button
              onClick={() => setShowAutocomplete(!showAutocomplete)}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-card-foreground transition cursor-pointer"
            >
              {showAutocomplete ? (
                <>
                  Hide <ToggleRight size={16} className="text-primary" />
                </>
              ) : (
                <>
                  Show <ToggleLeft size={16} />
                </>
              )}
            </button>
          </div>

          {showAutocomplete && (
            <div className="space-y-2 animate-fadeIn">
              {autocompleteModels.length > 0 ? (
                autocompleteModels.map((model) => {
                  const pct = model.remainingPercentage;
                  const isExh = model.isExhausted;
                  const resetLabel = formatTime(model.timeUntilResetMs);

                  return (
                    <div key={model.modelId} className="border border-border/60 bg-secondary/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-muted-foreground truncate block" title={model.label}>
                            {model.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-mono truncate block">
                            {model.modelId}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn("text-xs font-bold font-mono", getQuotaTextColor(pct, isExh))}>
                            {isExh ? "EXHAUSTED" : pct !== undefined && pct !== null ? `${Math.round(pct * 100)}%` : "N/A"}
                          </span>
                          {resetLabel && (
                            <p className="text-[10px] text-warning font-medium mt-0.5">↻ {resetLabel}</p>
                          )}
                        </div>
                      </div>
                      {pct !== undefined && pct !== null && (
                        <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", getQuotaBarColor(pct, isExh))}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="border border-dashed border-border rounded-lg py-5 text-center text-[11px] text-muted-foreground bg-secondary/5">
                  No autocomplete models in cache.
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Auto Wakeup (Warmup) Widget ──────────────────────────────── */}
        <section className="space-y-2 border-t border-border/40 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <Flame size={12} className={cn(wakeupStatus?.configured && "text-warning animate-pulse")} />
              <span>Auto Wakeup Status</span>
            </div>
            <button
              onClick={handleRefreshWakeup}
              disabled={syncingWakeup}
              className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-card-foreground transition cursor-pointer"
              title="Refresh wakeup status"
            >
              <RefreshCw size={11} className={cn(syncingWakeup && "animate-spin")} />
            </button>
          </div>

          {wakeupStatus ? (
            <div className="border border-border bg-card rounded-lg p-3.5 space-y-3.5">
              {/* Configure status */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded-full border text-[10px]",
                  wakeupStatus.configured
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-secondary text-muted-foreground border-border"
                )}>
                  {wakeupStatus.configured ? "ACTIVE" : "NOT CONFIGURED"}
                </span>
              </div>

              {wakeupStatus.configured && wakeupStatus.config && (
                <div className="text-[11px] text-muted-foreground bg-secondary/30 rounded p-2.5 space-y-1 border border-border/50">
                  <p>
                    <span className="font-semibold text-card-foreground">Schedule:</span>{" "}
                    {wakeupStatus.config.schedule?.type === "interval"
                      ? `Every ${wakeupStatus.config.schedule.intervalHours} hours`
                      : wakeupStatus.config.schedule?.type === "daily"
                      ? `Daily at ${wakeupStatus.config.schedule.times?.join(", ")}`
                      : wakeupStatus.config.schedule?.cronExpression ?? "Custom"}
                  </p>
                  {wakeupStatus.config.models && wakeupStatus.config.models.length > 0 && (
                    <p>
                      <span className="font-semibold text-card-foreground">Models:</span>{" "}
                      {wakeupStatus.config.models.slice(0, 3).join(", ")}
                      {wakeupStatus.config.models.length > 3 ? "..." : ""}
                    </p>
                  )}
                </div>
              )}

              {/* History entries */}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Last Wakeup Triggers
                </p>
                {wakeupStatus.history && wakeupStatus.history.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto divide-y divide-border/40">
                    {wakeupStatus.history.map((record, i) => (
                      <div key={i} className="flex items-start justify-between text-xs py-1.5 first:pt-0 gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-card-foreground truncate text-[11px]" title={record.email}>
                            {record.email ?? "Unknown Account"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate" title={record.model}>
                            {record.model ?? "All Models"}
                          </p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                            {formatDateTime(record.timestamp)}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                            record.success
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          )}>
                            {record.success ? (
                              <>
                                <CheckCircle2 size={8} /> OK
                              </>
                            ) : (
                              <>
                                <XCircle size={8} /> FAIL
                              </>
                            )}
                          </span>
                          {record.durationMs !== undefined && (
                            <span className="text-[9px] text-muted-foreground/60 font-mono">
                              {record.durationMs}ms
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground text-center py-2 bg-secondary/10 rounded border border-dashed border-border/50">
                    No trigger history recorded yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg py-5 text-center text-xs text-muted-foreground bg-secondary/10">
              Loading wakeup status...
            </div>
          )}

          {!wakeupStatus?.configured && (
            <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
              💡 Setup auto wakeup in terminal to automatically warm up your AI models:
              <code className="block bg-secondary px-2 py-1.5 rounded mt-1.5 font-mono select-all text-card-foreground border border-border/60">
                antigravity-usage wakeup config
              </code>
            </p>
          )}
        </section>

        {/* ── Account Info ────────────────────────────────────────────── */}
        <section className="space-y-2 border-t border-border/40 pt-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Account Info
          </div>
          <div className="border border-border bg-card rounded-lg divide-y divide-border/60 text-xs">
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate max-w-[220px]" title={account.email}>{account.email}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Plan</span>
              <span className={cn("font-semibold capitalize", planBadge?.cls.match(/text-\S+/)?.[0] ?? "text-card-foreground")}>
                {snapshot?.planType ?? "—"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Data Source</span>
              <span className="font-medium flex items-center gap-1">
                {methodBadge.icon}
                {methodBadge.label}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Auth Status</span>
              <span className={cn("font-semibold capitalize", statusBadge.cls.replace(/bg-\S+\s?/, "").replace(/border-\S+\s?/, "").trim())}>
                {account.status}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Token Expires</span>
              <span className={cn("font-medium", tokenIsExpiringSoon ? "text-warning" : "")}>
                {account.tokenExpiresAt ? formatDateTime(account.tokenExpiresAt) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Last Synced</span>
              <span className="font-medium">
                {snapshot?.timestamp ? formatDateTime(snapshot.timestamp) : "Never"}
              </span>
            </div>
            <div className="flex justify-between items-center px-4 py-2.5">
              <span className="text-muted-foreground">Added</span>
              <span className="font-medium">{account.addedAt ? formatDateTime(account.addedAt) : "N/A"}</span>
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={showConfirmRemove}
        title="Remove Account Session"
        message={`Are you sure you want to remove the account session for ${account.email}?\n\nThis will remove local token files for this account.`}
        confirmText="Remove Account"
        isDanger={true}
        onConfirm={() => onRemove(account.email)}
        onClose={() => setShowConfirmRemove(false)}
      />
    </div>
  );
};
