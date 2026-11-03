import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { StatusBoard } from "./StatusBoard";
import { AccountDetailDrawer } from "./AccountDetailDrawer";
import { AddAccountModal } from "./AddAccountModal";
import { RefreshCw, Plus, Clock, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../utils/cn";

export const Dashboard: React.FC = () => {
  const {
    accounts,
    syncing,
    lastRefresh,
    settings,
    updateSettings,
    syncAll,
    syncSingle,
    switchActive,
    removeAcc,
  } = useApp();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Auto-select first account on load
  useEffect(() => {
    if (accounts.length === 0) {
      setSelectedEmail(null);
      return;
    }
    setSelectedEmail((prev) => {
      if (prev && accounts.find((a) => a.email === prev)) return prev;
      const active = accounts.find((a) => a.isActive);
      return active?.email ?? accounts[0].email;
    });
  }, [accounts]);

  const handleRemove = async (email: string) => {
    await removeAcc(email);
    setSelectedEmail((prev) => {
      if (prev !== email) return prev;
      const remaining = accounts.filter((a) => a.email !== email);
      if (remaining.length === 0) return null;
      const active = remaining.find((a) => a.isActive);
      return active?.email ?? remaining[0].email;
    });
  };

  const selectedAccount = accounts.find((a) => a.email === selectedEmail) ?? null;

  // Summary stats
  const totalAccounts = accounts.length;
  let healthyCount = 0;
  let warningCount = 0;
  let exhaustedCount = 0;

  accounts.forEach((acc) => {
    const snap = acc.cachedSnapshot;
    const models = snap?.models?.filter((m) => !m.isAutocompleteOnly) ?? [];
    const pcts = models
      .filter((m) => m.remainingPercentage !== undefined && m.remainingPercentage !== null)
      .map((m) => m.remainingPercentage as number);

    const summaryBuckets = acc.quotaSummary?.groups?.flatMap((g) => g.buckets) ?? [];
    const bucketPcts = summaryBuckets
      .filter((b) => b.remainingFraction !== undefined && b.remainingFraction !== null)
      .map((b) => b.remainingFraction as number);

    const allPcts = [...pcts, ...bucketPcts];
    const minPct = allPcts.length > 0 ? Math.min(...allPcts) : null;
    const hasExhausted = models.some((m) => m.isExhausted) || bucketPcts.some((p) => p === 0);

    if (acc.status === "invalid" || hasExhausted || minPct === 0) {
      exhaustedCount++;
    } else if (acc.status === "expired" || (minPct !== null && minPct < 0.25)) {
      warningCount++;
    } else {
      healthyCount++;
    }
  });

  const handleSelectAccount = (email: string) => {
    setSelectedEmail(email);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between border-b border-border px-5 py-3 bg-card/50 gap-4">
        {/* Left: stats pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-card-foreground mr-1 flex items-center gap-1.5">
            <Activity size={13} className="text-muted-foreground" />
            {totalAccounts} account{totalAccounts !== 1 ? "s" : ""}
          </span>

          {healthyCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={10} />
              {healthyCount} healthy
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/60 text-amber-700 border border-amber-200">
              <AlertTriangle size={10} />
              {warningCount} caution
            </span>
          )}
          {exhaustedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100/60 text-red-700 border border-red-200">
              <AlertTriangle size={10} />
              {exhaustedCount} critical
            </span>
          )}

          {lastRefresh && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-1">
              <Clock size={10} />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-Refresh */}
          <div className="flex items-center border border-border rounded-md px-2.5 py-1 bg-card text-xs text-card-foreground gap-1.5 shadow-xs">
            <Clock size={12} className="text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Auto:</span>
            <select
              value={settings.autoRefreshInterval}
              onChange={(e) => updateSettings({ autoRefreshInterval: e.target.value as any })}
              className="bg-transparent font-semibold border-0 focus:outline-hidden p-0 text-xs cursor-pointer text-card-foreground"
            >
              <option value="manual">Manual</option>
              <option value="30s">30s</option>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
            </select>
          </div>

          <button
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary rounded-md text-xs font-semibold cursor-pointer transition disabled:opacity-50 text-card-foreground bg-card"
          >
            <RefreshCw size={12} className={cn(syncing && "animate-spin")} />
            Sync All
          </button>

          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            <Plus size={13} />
            Add Account
          </button>
        </div>
      </div>

      {/* ── Main Content: StatusBoard ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background">
        <StatusBoard accounts={accounts} onAccountSelect={handleSelectAccount} />
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────────── */}
      <AccountDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        account={selectedAccount}
        syncing={syncing}
        onSync={syncSingle}
        onSwitch={switchActive}
        onRemove={handleRemove}
      />

      {/* Login modal */}
      <AddAccountModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
