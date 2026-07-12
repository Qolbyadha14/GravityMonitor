import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AccountData, AppSettings } from "../types";

interface LoginState {
  status: "idle" | "pending" | "success" | "error";
  logs: string[];
  errorMsg: string | null;
}

interface AppContextType {
  accounts: AccountData[];
  activeAccount: AccountData | null;
  loading: boolean;
  syncing: boolean;
  error: string | null;
  clearError: () => void;
  lastRefresh: Date | null;
  settings: AppSettings;
  versions: { app: string; cli: string } | null;
  loginState: LoginState;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  refreshAccounts: () => Promise<void>;
  syncAll: () => Promise<void>;
  syncSingle: (email: string) => Promise<void>;
  switchActive: (email: string) => Promise<void>;
  removeAcc: (email: string) => Promise<void>;
  clearAll: () => Promise<void>;
  openConfigFolder: () => Promise<void>;
  startLogin: () => Promise<void>;
  cancelLogin: () => Promise<void>;
  resetLoginState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to convert structured AppError payloads from Rust backend to readable strings
const parseAppError = (err: any): string => {
  if (!err) return "Unknown error occurred.";
  if (typeof err === "string") return err;
  
  if (err.code) {
    switch (err.code) {
      case "ConfigDirNotFound":
        return "Local configuration directory could not be resolved.";
      case "LoginInProgress":
        return "An active Google authentication session is already running in your browser.";
      case "FileReadError":
        return `Failed to read file: ${err.payload?.detail || "Disk I/O failure"}`;
      case "JsonParseError":
        return `Failed to parse payload: ${err.payload?.detail || ""}`;
      case "SubprocessFailed":
        const stderrMsg = err.payload?.stderr?.trim();
        return stderrMsg || `Subprocess command failed (exit code: ${err.payload?.code ?? "N/A"})`;
      case "Generic":
        return err.payload?.message || "An error occurred in the native backend.";
      default:
        return `Backend Error [${err.code}]: ${JSON.stringify(err.payload || {})}`;
    }
  }
  
  return err.message || String(err);
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [versions, setVersions] = useState<{ app: string; cli: string } | null>(null);
  const [loginState, setLoginState] = useState<LoginState>({
    status: "idle",
    logs: [],
    errorMsg: null,
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const savedInterval = localStorage.getItem("autoRefreshInterval") as AppSettings["autoRefreshInterval"] | null;
    return {
      theme: savedTheme || "dark",
      autoRefreshInterval: savedInterval || "manual",
    };
  });

  const refreshTimerRef = useRef<any>(null);

  // Sync state to local storage when changed
  useEffect(() => {
    localStorage.setItem("theme", settings.theme);
    localStorage.setItem("autoRefreshInterval", settings.autoRefreshInterval);

    // Apply dark class to html
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.theme, settings.autoRefreshInterval]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const clearError = () => setError(null);

  // Fetch accounts list (direct directory and file read)
  const refreshAccounts = async () => {
    try {
      setError(null);
      const data = await invoke<AccountData[]>("get_accounts_data");
      setAccounts(data);
    } catch (err) {
      console.error("Failed to read accounts from backend:", err);
      setError(parseAppError(err));
    } finally {
      setLoading(false);
    }
  };

  // Sync and refresh all accounts via CLI command
  const syncAll = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      // Proactively refresh any accounts whose token status has expired
      const expiredAccounts = accounts.filter((a) => a.status === "expired");
      if (expiredAccounts.length > 0) {
        console.log("Found expired accounts, refreshing tokens...");
        for (const acc of expiredAccounts) {
          try {
            await invoke("refresh_account_tokens", { email: acc.email });
          } catch (tokenErr) {
            console.error(`Failed to refresh tokens for ${acc.email}:`, tokenErr);
          }
        }
      }

      await invoke("sync_all_accounts");
      setLastRefresh(new Date());
      await refreshAccounts();
    } catch (err) {
      console.error("Sync all failed:", err);
      setError(parseAppError(err));
    } finally {
      setSyncing(false);
    }
  };

  // Sync a single account via CLI command
  const syncSingle = async (email: string) => {
    setSyncing(true);
    setError(null);
    try {
      // Proactively refresh account token if it is expired
      const acc = accounts.find((a) => a.email === email);
      if (acc && acc.status === "expired") {
        console.log(`Account ${email} is expired, refreshing tokens first...`);
        await invoke("refresh_account_tokens", { email });
      }

      await invoke("sync_account", { email });
      setLastRefresh(new Date());
      await refreshAccounts();
    } catch (err) {
      console.error(`Sync for ${email} failed:`, err);
      setError(parseAppError(err));
    } finally {
      setSyncing(false);
    }
  };

  // Switch active account
  const switchActive = async (email: string) => {
    try {
      setError(null);
      await invoke("switch_account", { email });
      await refreshAccounts();
    } catch (err) {
      console.error(`Switching active account to ${email} failed:`, err);
      setError(parseAppError(err));
    }
  };

  // Remove an account session
  const removeAcc = async (email: string) => {
    try {
      setError(null);
      await invoke("remove_account", { email });
      await refreshAccounts();
    } catch (err) {
      console.error(`Removing account ${email} failed:`, err);
      setError(parseAppError(err));
    }
  };

  // Clear all accounts and files
  const clearAll = async () => {
    try {
      setError(null);
      await invoke("clear_all_sessions");
      await refreshAccounts();
    } catch (err) {
      console.error("Failed to clear sessions:", err);
      setError(parseAppError(err));
    }
  };

  const openConfigFolder = async () => {
    try {
      await invoke("open_session_folder");
    } catch (err) {
      console.error("Failed to open session folder:", err);
    }
  };

  // Fetch app versions
  const fetchVersions = async () => {
    try {
      const data = await invoke<{ app: string; cli: string }>("get_versions");
      setVersions(data);
    } catch (err) {
      console.error("Failed to get versions:", err);
    }
  };

  // Start Google OAuth flow via CLI subprocess
  const startLogin = async () => {
    setLoginState({
      status: "pending",
      logs: ["Starting Google authentication...", "Opening browser..."],
      errorMsg: null,
    });
    try {
      await invoke("start_login_flow");
    } catch (err) {
      setLoginState((prev) => ({
        ...prev,
        status: "error",
        errorMsg: parseAppError(err),
      }));
    }
  };

  // Cancel login flow and kill subprocess
  const cancelLogin = async () => {
    try {
      await invoke("cancel_login_flow");
    } catch (err) {
      console.error("Failed to cancel login:", err);
    }
    setLoginState({
      status: "idle",
      logs: [],
      errorMsg: null,
    });
  };

  const resetLoginState = () => {
    setLoginState({
      status: "idle",
      logs: [],
      errorMsg: null,
    });
  };

  // Initial load
  useEffect(() => {
    refreshAccounts();
    fetchVersions();

    // Listen to tauri login events
    let unlistenStdout: (() => void) | null = null;
    let unlistenStderr: (() => void) | null = null;
    let unlistenStatus: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenStdout = await listen<string>("login-stdout", (event) => {
        setLoginState((prev) => ({
          ...prev,
          logs: [...prev.logs, event.payload],
        }));
      });

      unlistenStderr = await listen<string>("login-stderr", (event) => {
        setLoginState((prev) => ({
          ...prev,
          logs: [...prev.logs, `Error: ${event.payload}`],
        }));
      });

      unlistenStatus = await listen<{ type: string; message?: string }>("login-status", (event) => {
        const { type, message } = event.payload;
        if (type === "success") {
          setLoginState((prev) => ({
            ...prev,
            status: "success",
            logs: [...prev.logs, "Authentication successful! Account added."],
          }));
          refreshAccounts();
        } else {
          setLoginState((prev) => ({
            ...prev,
            status: "error",
            errorMsg: message || "Authentication failed.",
            logs: [...prev.logs, `Authentication failed: ${message}`],
          }));
        }
      });
    };

    setupListeners();

    return () => {
      if (unlistenStdout) unlistenStdout();
      if (unlistenStderr) unlistenStderr();
      if (unlistenStatus) unlistenStatus();
    };
  }, []);

  // Setup auto refresh timer
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    const intervalVal = settings.autoRefreshInterval;
    if (intervalVal === "manual") return;

    let timeMs = 60 * 1000; // 1m default
    if (intervalVal === "30s") timeMs = 30 * 1000;
    if (intervalVal === "5m") timeMs = 5 * 60 * 1000;

    refreshTimerRef.current = setInterval(() => {
      console.log(`Auto-refreshing quotas (${intervalVal})...`);
      syncAll();
    }, timeMs);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [settings.autoRefreshInterval, accounts]); // include accounts to read newest state

  const activeAccount = accounts.find((a) => a.isActive) || null;

  return (
    <AppContext.Provider
      value={{
        accounts,
        activeAccount,
        loading,
        syncing,
        error,
        clearError,
        lastRefresh,
        settings,
        versions,
        loginState,
        updateSettings,
        refreshAccounts,
        syncAll,
        syncSingle,
        switchActive,
        removeAcc,
        clearAll,
        openConfigFolder,
        startLogin,
        cancelLogin,
        resetLoginState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
