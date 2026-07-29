import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { FolderOpen, RefreshCcw, Trash2, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "../utils/cn";
import { ConfirmModal } from "./ConfirmModal";

export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    openConfigFolder,
    syncAll,
    clearAll,
    syncing,
    versions,
  } = useApp();

  const [showConfirmClear, setShowConfirmClear] = useState(false);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-bold tracking-tight text-card-foreground">Preferences & Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure interface options and manage local authentication credentials.
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6 max-w-2xl text-card-foreground">
        {/* Appearance Settings */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Appearance</h2>
          <div className="border border-border bg-card p-4 rounded-lg flex items-center justify-between shadow-xs">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold">Application Theme</div>
              <div className="text-xs text-muted-foreground">
                Switch between developer-centric light and dark styles.
              </div>
            </div>
            <div className="flex bg-secondary border border-border p-1 rounded-md">
              <button
                onClick={() => updateSettings({ theme: "light" })}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all",
                  settings.theme === "light"
                    ? "bg-card text-card-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-card-foreground"
                )}
              >
                <Sun size={14} />
                Light
              </button>
              <button
                onClick={() => updateSettings({ theme: "dark" })}
                className={cn(
                  "flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-all",
                  settings.theme === "dark"
                    ? "bg-card text-card-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-card-foreground"
                )}
              >
                <Moon size={14} />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Sessions Settings */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Credentials & Sessions</h2>
          <div className="border border-border bg-card rounded-lg divide-y divide-border shadow-xs">
            {/* Open Folder */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Open Session Folder</div>
                <div className="text-xs text-muted-foreground">
                  View credentials, tokens, and local cache JSON files in the native file manager.
                </div>
              </div>
              <button
                onClick={openConfigFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary text-xs font-semibold rounded-md transition cursor-pointer"
              >
                <FolderOpen size={14} />
                Open Finder
              </button>
            </div>

            {/* Refresh Sessions */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Refresh All Account Sessions</div>
                <div className="text-xs text-muted-foreground">
                  Force refresh OAuth access tokens for all configured Google accounts.
                </div>
              </div>
              <button
                onClick={syncAll}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-secondary text-xs font-semibold rounded-md transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCcw size={14} className={cn(syncing && "animate-spin")} />
                Refresh Tokens
              </button>
            </div>

            {/* Clear All Sessions */}
            <div className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-danger">Clear All Sessions</div>
                <div className="text-xs text-muted-foreground">
                  Remove all stored account tokens and clean directory structure. Disconnects everything.
                </div>
              </div>
              <button
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 text-danger text-xs font-semibold rounded-md transition cursor-pointer"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* About App */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">About</h2>
          <div className="border border-border bg-card p-4 rounded-lg space-y-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 flex items-center justify-center rounded-md bg-secondary text-muted-foreground border border-border/80 mt-0.5">
                <Monitor size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Gravity Monitor</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Personal desktop app built with React, Tauri v2, and Rust, using the `antigravity-usage` CLI to safely query and monitor usage quotas.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-3 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block">App Version</span>
                <span className="font-semibold font-mono">{versions?.app || "0.1.0"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-muted-foreground block">antigravity-usage CLI Version</span>
                <span className="font-semibold font-mono">{versions?.cli || "Checking..."}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmClear}
        title="Clear All Sessions"
        message="CAUTION: This will delete all local accounts, sessions, and cached data from this system. Are you absolutely sure you want to proceed?"
        confirmText="Clear All Sessions"
        isDanger={true}
        onConfirm={clearAll}
        onClose={() => setShowConfirmClear(false)}
      />
    </div>
  );
};
