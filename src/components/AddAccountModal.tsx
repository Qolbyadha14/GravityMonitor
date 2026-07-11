import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { X, Loader2, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
  const { loginState, startLogin, cancelLogin, resetLoginState } = useApp();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      resetLoginState();
    }
  }, [isOpen]);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [loginState.logs]);

  if (!isOpen) return null;

  const handleClose = async () => {
    if (loginState.status === "pending") {
      await cancelLogin();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div className="w-full max-w-lg border border-border bg-card p-6 shadow-md rounded-lg text-card-foreground animate-zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-semibold">Add Google Account</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-card-foreground transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {loginState.status === "idle" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This will trigger the local authentication flow. Clicking <strong>Continue</strong> will:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Launch the local OAuth callback server.</li>
                <li>Open your default web browser.</li>
                <li>Prompt you to log into your Google account.</li>
              </ul>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-border text-sm font-medium hover:bg-secondary rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  onClick={startLogin}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 rounded-md transition shadow-xs"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {loginState.status === "pending" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
                <span className="text-sm font-medium">Authenticating via browser...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Please complete the login in the browser window that opened.
              </p>

              {/* Terminal Logs */}
              <div className="bg-[#090d13] border border-[#21262d] rounded-md p-3 font-mono text-xs text-[#7ee787] h-48 overflow-y-auto space-y-1 shadow-inner">
                <div className="flex items-center gap-1 border-b border-[#21262d] pb-1.5 mb-2 text-[#8b949e]">
                  <Terminal size={12} />
                  <span>Subprocess Logs</span>
                </div>
                {loginState.logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-border text-sm font-medium hover:bg-secondary rounded-md transition"
                >
                  Cancel & Stop Server
                </button>
              </div>
            </div>
          )}

          {loginState.status === "success" && (
            <div className="py-4 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Account Added Successfully</h3>
                <p className="text-sm text-muted-foreground">
                  Your Google account session has been registered. You can close this dialog.
                </p>
              </div>
              <div className="mt-6 flex justify-center pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 rounded-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {loginState.status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle size={20} />
                <span className="text-sm font-semibold">Authentication Failed</span>
              </div>
              <div className="text-sm bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md">
                {loginState.errorMsg || "An unexpected error occurred during login."}
              </div>

              {/* Logs for debugging */}
              <div className="bg-[#090d13] border border-[#21262d] rounded-md p-3 font-mono text-xs text-[#f85149] h-32 overflow-y-auto space-y-1">
                {loginState.logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-border text-sm font-medium hover:bg-secondary rounded-md transition"
                >
                  Close
                </button>
                <button
                  onClick={startLogin}
                  className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/95 rounded-md transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
