import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = true,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in p-4">
      <div className="w-full max-w-sm border border-border bg-card p-5 rounded-xl shadow-2xl space-y-4 animate-scale-in text-card-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isDanger
                  ? "bg-danger/10 text-danger border border-danger/20"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-card-foreground transition"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-border hover:bg-secondary rounded-md text-xs font-semibold transition cursor-pointer text-card-foreground"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              isDanger
                ? "bg-danger text-white hover:bg-danger/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
