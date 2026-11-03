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

const getMinQuotaRemaining = (account: AccountData): number | null => {
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
  return allPcts.length > 0 ? Math.min(...allPcts) : null;
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
      <div key={sectionKey} className={cn("border rounded-lg overflow-hidden", borderColor)}>
        {/* Header */}
        <div
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3 font-semibold text-sm",
            bgColor
          )}
        >
          {icon}
          <span>
            {title} ({statusAccounts.length})
          </span>
        </div>

        {/* Accounts */}
        <div className="px-3 py-2 space-y-1 bg-card/30">
          {statusAccounts.map((acc) => (
            <AccountCard
              key={acc.email}
              email={acc.email}
              status={acc.status as "valid" | "expired" | "invalid"}
              minQuotaRemaining={getMinQuotaRemaining(acc)}
              fiveHourResetIn={getFiveHourResetIn(acc) ?? undefined}
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
    <div className="space-y-3 p-4">
      {renderSection(
        "Critical",
        <AlertTriangle size={16} className="text-red-600" />,
        grouped.critical,
        "critical",
        "border-red-200 bg-red-50/30",
        "bg-red-100/40 text-red-700"
      )}

      {renderSection(
        "Caution",
        <AlertTriangle size={16} className="text-amber-600" />,
        grouped.caution,
        "caution",
        "border-amber-200 bg-amber-50/30",
        "bg-amber-100/40 text-amber-700"
      )}

      {renderSection(
        "Healthy",
        <CheckCircle2 size={16} className="text-emerald-600" />,
        grouped.healthy,
        "healthy",
        "border-emerald-200 bg-emerald-50/30",
        "bg-emerald-100/40 text-emerald-700"
      )}
    </div>
  );
};
