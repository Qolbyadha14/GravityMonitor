import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { AccountsList } from "./AccountsList";
import { AddAccountModal } from "./AddAccountModal";
import { RefreshCw, Plus, Clock } from "lucide-react";
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

  // Helper to calculate min remaining quota for summaries
  const getMinQuota = (acc: any) => {
    const snap = acc.cachedSnapshot;
    if (!snap || !snap.models || snap.models.length === 0) return null;
    const chatModels = snap.models.filter((m: any) => !m.isAutocompleteOnly);
    const modelsToUse = chatModels.length > 0 ? chatModels : snap.models;
    const percentages = modelsToUse
      .filter((m: any) => m.remainingPercentage !== undefined && m.remainingPercentage !== null)
      .map((m: any) => m.remainingPercentage);
    if (percentages.length > 0) return Math.min(...percentages);
    if (modelsToUse.some((m: any) => m.isExhausted)) return 0;
    return null;
  };

  // Summaries calculation
  const totalAccounts = accounts.length;
  let healthyAccounts = 0;
  let warningAccounts = 0;
  let exhaustedAccounts = 0;

  accounts.forEach((acc) => {
    const minQuota = getMinQuota(acc);
    if (acc.status === "invalid") {
      exhaustedAccounts++;
    } else if (acc.status === "expired") {
      warningAccounts++;
    } else {
      // valid status
      if (minQuota === null) {
        healthyAccounts++;
      } else if (minQuota === 0) {
        exhaustedAccounts++;
      } else if (minQuota < 0.25) {
        warningAccounts++;
      } else {
        healthyAccounts++;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-card-foreground">Quota Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time developer-centric monitoring of Google Antigravity quota snapshots.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center border border-border rounded-md px-2.5 py-1.5 bg-card text-xs text-card-foreground gap-1.5 shadow-xs">
            <Clock size={14} className="text-muted-foreground" />
            <span className="font-medium">Auto-Refresh:</span>
            <select
              value={settings.autoRefreshInterval}
              onChange={(e) => updateSettings({ autoRefreshInterval: e.target.value as any })}
              className="bg-transparent font-medium border-0 focus:outline-hidden p-0 text-xs cursor-pointer"
            >
              <option value="manual">Manual</option>
              <option value="30s">30s</option>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
            </select>
          </div>

          {/* Sync All Button */}
          <button
            onClick={syncAll}
            disabled={syncing}
            className="flex items-center justify-center gap-2 px-3 py-1.5 border border-border hover:bg-secondary rounded-md text-xs font-semibold cursor-pointer transition disabled:opacity-50 text-card-foreground bg-card"
          >
            <RefreshCw size={14} className={cn(syncing && "animate-spin")} />
            Sync All
          </button>

          {/* Add Account Button */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-md text-xs font-semibold cursor-pointer transition shadow-xs"
          >
            <Plus size={14} />
            Add Account
          </button>
        </div>
      </div>

      {/* Summary Grid Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="border border-border bg-card p-4 rounded-lg flex flex-col justify-between shadow-xs transition duration-150 hover:border-muted-foreground/30">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Accounts</span>
          <div className="text-2xl font-bold font-mono text-card-foreground mt-1.5">{totalAccounts}</div>
        </div>

        {/* Healthy Accounts */}
        <div className="border border-border border-l-[3px] border-l-success bg-card p-4 rounded-lg flex flex-col justify-between shadow-xs transition duration-150 hover:border-border/80">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Healthy</span>
          <div className="text-2xl font-bold font-mono text-success mt-1.5">{healthyAccounts}</div>
        </div>

        {/* Warning Accounts */}
        <div className="border border-border border-l-[3px] border-l-warning bg-card p-4 rounded-lg flex flex-col justify-between shadow-xs transition duration-150 hover:border-border/80">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Warning</span>
          <div className="text-2xl font-bold font-mono text-warning mt-1.5">{warningAccounts}</div>
        </div>

        {/* Exhausted Accounts */}
        <div className="border border-border border-l-[3px] border-l-danger bg-card p-4 rounded-lg flex flex-col justify-between shadow-xs transition duration-150 hover:border-border/80">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Exhausted</span>
          <div className="text-2xl font-bold font-mono text-danger mt-1.5">{exhaustedAccounts}</div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {lastRefresh && (
        <div className="text-xs text-muted-foreground bg-secondary/35 border border-border px-3 py-2 rounded-md w-fit flex items-center gap-1.5">
          <Clock size={12} />
          <span>Last Sync: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Accounts List Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Connected Accounts</h2>
        <AccountsList
          accounts={accounts}
          onSync={syncSingle}
          onSwitch={switchActive}
          onRemove={removeAcc}
          syncing={syncing}
        />
      </div>

      {/* Login modal dialog */}
      <AddAccountModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
};
