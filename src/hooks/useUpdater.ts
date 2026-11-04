import { useState, useEffect, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "up-to-date" | "error";

interface UpdateState {
  status: UpdateStatus;
  update: Update | null;
  progress: number;
  error: string | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    update: null,
    progress: 0,
    error: null,
  });

  const checkForUpdate = useCallback(async () => {
    setState((s) => ({ ...s, status: "checking", error: null }));
    try {
      const update = await check();
      if (update) {
        setState({ status: "available", update, progress: 0, error: null });
      } else {
        setState({ status: "up-to-date", update: null, progress: 0, error: null });
      }
    } catch (e) {
      setState({ status: "error", update: null, progress: 0, error: String(e) });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!state.update) return;
    setState((s) => ({ ...s, status: "downloading", progress: 0 }));
    try {
      let totalLength = 0;
      let downloaded = 0;
      await state.update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalLength = event.data.contentLength || 0;
          downloaded = 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (totalLength > 0) {
            setState((s) => ({
              ...s,
              status: "downloading",
              progress: Math.min(100, Math.round((downloaded / totalLength) * 100)),
            }));
          }
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, status: "installing", progress: 100 }));
        }
      });
    } catch (e) {
      setState((s) => ({ ...s, status: "error", error: String(e) }));
    }
  }, [state.update]);

  const dismiss = useCallback(() => {
    setState({ status: "idle", update: null, progress: 0, error: null });
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return { ...state, checkForUpdate, installUpdate, dismiss };
}
