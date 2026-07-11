import { useState } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Dashboard } from "./components/Dashboard";
import { Settings } from "./components/Settings";
import { Activity, Settings as SettingsIcon, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "./utils/cn";

function AppContent() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
  const { activeAccount, error, syncing } = useApp();

  return (
    <div className="flex h-screen bg-background text-card-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between select-none shrink-0">
        <div className="space-y-6 py-5">
          {/* Logo */}
          <div className="px-6 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-wide shadow-xs border border-primary/20">
              G
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-card-foreground block">Gravity Monitor</span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5 uppercase font-semibold">Tauri Client</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-3 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md transition duration-150 cursor-pointer select-none",
                activeTab === "dashboard"
                  ? "bg-secondary text-card-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-card-foreground"
              )}
            >
              <Activity size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md transition duration-150 cursor-pointer select-none",
                activeTab === "settings"
                  ? "bg-secondary text-card-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-card-foreground"
              )}
            >
              <SettingsIcon size={16} />
              Settings
            </button>
          </nav>
        </div>

        {/* Footer Active Profile */}
        <div className="border-t border-border p-4 bg-secondary/20">
          {activeAccount ? (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Active Session
              </span>
              <div className="flex items-center gap-1.5 truncate">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
                <span className="text-xs font-semibold truncate text-card-foreground" title={activeAccount.email}>
                  {activeAccount.email}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <AlertCircle size={14} />
              <span>No Active Account</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Sync / Loading overlay */}
        {syncing && (
          <div className="absolute top-2 right-4 z-50 bg-secondary/80 border border-border text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-medium shadow-xs text-card-foreground backdrop-blur-xs select-none">
            <RefreshCw size={12} className="animate-spin" />
            <span>Syncing CLI data...</span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-danger/10 border-b border-danger/20 text-danger px-6 py-2.5 text-xs font-medium flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              <span className="font-semibold truncate">CLI Error: {error}</span>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === "dashboard" ? <Dashboard /> : <Settings />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
