import React from "react";
import { AccountData } from "../types";
import { AccountCard } from "./AccountCard";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../utils/cn";

interface StatusBoardProps {
  accounts: AccountData[];
  onAccountSelect?: (email: string) => void;
}

const getAccountHealth = (
  account: AccountData
): "critical" | "caution" | "healthy" => {
  const snap = account.cachedSnapshot;
  const models = snap?.models?.filter((m) => !m.isAutocompleteOnly) ?? [];
  const pcts = models
    .filter((m) => m.remainingPercentage !== undefined && m.remainingPercentage !== null)
    .map((m) => m.remainingPercentage as number);

  const summaryBuckets = account.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
  const bucketPcts = summaryBuckets
    .filter((b) => b.remainingFraction !== undefined && b.remainingFraction !== null)
    .map((b) => b.remainingFraction as number);

  const allPcts = [...pcts, ...bucketPcts];
  const minPct = allPcts.length > 0 ? Math.min(...allPcts) : null;
  const hasExhausted = models.some((m) => m.isExhausted) || bucketPcts.some((p) => p === 0);

  if (account.status === "invalid" || hasExhausted || minPct === 0) {
    return "critical";
  }
  if (account.status === "expired" || (minPct !== null && minPct < 0.25)) {
    return "caution";
  }
  return "healthy";
};

const getFiveHourPct = (account: AccountData): number | null => {
  const summaryBuckets = account.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
  const fiveHourBucket = summaryBuckets.find((b) => b.window === "5h");
  if (fiveHourBucket?.remainingFraction !== undefined && fiveHourBucket.remainingFraction !== null) {
    return fiveHourBucket.remainingFraction;
  }
  const snap = account.cachedSnapshot;
  const models = snap?.models?.filter((m) => !m.isAutocompleteOnly) ?? [];
  const pcts = models
    .filter((m) => m.remainingPercentage !== undefined && m.remainingPercentage !== null)
    .map((m) => m.remainingPercentage as number);
  return pcts.length > 0 ? Math.min(...pcts) : null;
};

const getWeeklyPct = (account: AccountData): number | null => {
  const summaryBuckets = account.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
  const weeklyBucket = summaryBuckets.find((b) => b.window === "weekly");
  return weeklyBucket?.remainingFraction ?? null;
};

const getFiveHourResetIn = (account: AccountData): string | null => {
  const summaryBuckets = account.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
  const fiveHourBucket = summaryBuckets.find((b) => b.window === "5h");
  if (!fiveHourBucket?.resetTime) return null;
  const ms = new Date(fiveHourBucket.resetTime).getTime() - Date.now();
  if (ms <= 0) return "Now";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getWeeklyResetIn = (account: AccountData): string | null => {
  const summaryBuckets = account.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
  const weeklyBucket = summaryBuckets.find((b) => b.window === "weekly");
  if (!weeklyBucket?.resetTime) return null;
  const ms = new Date(weeklyBucket.resetTime).getTime() - Date.now();
  if (ms <= 0) return "Now";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

export const StatusBoard: React.FC<StatusBoardProps> = ({ accounts, onAccountSelect }) => {
  const grouped = {
    critical: accounts.filter((a) => getAccountHealth(a) === "critical"),
    caution: accounts.filter((a) => getAccountHealth(a) === "caution"),
    healthy: accounts.filter((a) => getAccountHealth(a) === "healthy"),
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    statusAccounts: AccountData[],
    sectionKey: "critical" | "caution" | "healthy",
    borderColor: string,
    bgColor: string
  ) => {
    if (statusAccounts.length === 0) return null;

    return (
      <div key={sectionKey} className={cn("border rounded-xl overflow-hidden shadow-xs", borderColor)}>
        {/* Header */}
        <div
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 font-bold text-xs uppercase tracking-wider",
            bgColor
          )}
        >
          {icon}
          <span>
            {title} ({statusAccounts.length})
          </span>
        </div>

        {/* Responsive Accounts Grid */}
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-card/25">
          {statusAccounts.map((acc) => (
            <AccountCard
              key={acc.email}
              email={acc.email}
              status={acc.status as "valid" | "expired" | "invalid"}
              planType={acc.cachedSnapshot?.planType}
              fiveHourPct={getFiveHourPct(acc)}
              fiveHourResetIn={getFiveHourResetIn(acc)}
              weeklyPct={getWeeklyPct(acc)}
              weeklyResetIn={getWeeklyResetIn(acc)}
              isActive={acc.isActive}
              onClick={() => onAccountSelect?.(acc.email)}
            />
          ))}
        </div>
      </div>
    );
  };

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-card-foreground">No Accounts</p>
          <p className="text-xs text-muted-foreground">Add a Google account to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto max-h-full">
      {renderSection(
        "Critical Attention",
        <AlertTriangle size={15} className="text-danger" />,
        grouped.critical,
        "critical",
        "border-danger/30 bg-danger/5",
        "bg-danger/10 text-danger border-b border-danger/20"
      )}

      {renderSection(
        "Caution",
        <AlertTriangle size={15} className="text-warning" />,
        grouped.caution,
        "caution",
        "border-warning/30 bg-warning/5",
        "bg-warning/10 text-warning border-b border-warning/20"
      )}

      {renderSection(
        "Healthy",
        <CheckCircle2 size={15} className="text-success" />,
        grouped.healthy,
        "healthy",
        "border-success/30 bg-success/5",
        "bg-success/10 text-success border-b border-success/20"
      )}
    </div>
  );
};
