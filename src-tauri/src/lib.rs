// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use std::process::Stdio;

// State to track active login subprocesses
pub struct AppState {
    login_process: Arc<Mutex<Option<tokio::process::Child>>>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct PromptCredits {
    available: f64,
    monthly: f64,
    #[serde(rename = "usedPercentage")]
    used_percentage: f64,
    #[serde(rename = "remainingPercentage")]
    remaining_percentage: f64,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct ModelQuota {
    label: String,
    #[serde(rename = "modelId")]
    model_id: String,
    #[serde(rename = "remainingPercentage")]
    remaining_percentage: Option<f64>,
    #[serde(rename = "isExhausted")]
    is_exhausted: bool,
    #[serde(rename = "resetTime")]
    reset_time: Option<String>,
    #[serde(rename = "timeUntilResetMs")]
    time_until_reset_ms: Option<f64>,
    #[serde(rename = "isAutocompleteOnly")]
    is_autocomplete_only: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct QuotaSnapshot {
    timestamp: String,
    method: String,
    email: Option<String>,
    #[serde(rename = "planType")]
    plan_type: Option<String>,
    #[serde(rename = "promptCredits")]
    prompt_credits: Option<PromptCredits>,
    models: Vec<ModelQuota>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct AccountCache {
    #[serde(rename = "cachedAt")]
    cached_at: String,
    ttl: u64,
    data: QuotaSnapshot,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct AccountMetadata {
    email: String,
    #[serde(rename = "addedAt")]
    added_at: Option<String>,
    #[serde(rename = "lastUsed")]
    last_used: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct TokenInfo {
    #[serde(rename = "expiresAt")]
    expires_at: u64,
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "refreshToken")]
    refresh_token: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct AccountData {
    email: String,
    #[serde(rename = "isActive")]
    is_active: bool,
    status: String, // "valid" | "expired" | "invalid"
    #[serde(rename = "lastUsed")]
    last_used: Option<String>,
    #[serde(rename = "addedAt")]
    added_at: Option<String>,
    #[serde(rename = "cachedCredits")]
    cached_credits: Option<PromptCredits>,
    #[serde(rename = "cachedSnapshot")]
    cached_snapshot: Option<QuotaSnapshot>,
}

fn home_dir() -> Option<PathBuf> {
    env::var("HOME").map(PathBuf::from).ok().or_else(|| {
        env::var("USERPROFILE").map(PathBuf::from).ok()
    })
}

fn get_config_dir() -> Option<PathBuf> {
    let home = home_dir()?;
    #[cfg(target_os = "windows")]
    {
        env::var("APPDATA")
            .map(|p| PathBuf::from(p).join("antigravity-usage"))
            .ok()
            .or_else(|| Some(home.join("AppData").join("Roaming").join("antigravity-usage")))
    }
    #[cfg(target_os = "macos")]
    {
        Some(home.join("Library").join("Application Support").join("antigravity-usage"))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        env::var("XDG_CONFIG_HOME")
            .map(|p| PathBuf::from(p).join("antigravity-usage"))
            .ok()
            .or_else(|| Some(home.join(".config").join("antigravity-usage")))
    }
}

// Runs a CLI command via login shell (inherits Brew, NVM, Node paths)
fn run_cli_command(args_str: &str) -> Result<String, String> {
    let cmd = format!("npx antigravity-usage {}", args_str);
    let output = Command::new("zsh")
        .arg("-l")
        .arg("-c")
        .arg(&cmd)
        .output();

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(format!("Command failed: {}\nStderr: {}", stdout, stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

#[tauri::command]
fn get_accounts_data() -> Result<Vec<AccountData>, String> {
    let config_dir = match get_config_dir() {
        Some(dir) => dir,
        None => return Err("Could not determine config directory".into()),
    };

    if !config_dir.exists() {
        return Ok(Vec::new());
    }

    // Read active account from config.json
    let config_path = config_dir.join("config.json");
    let active_account = if config_path.exists() {
        let content = fs::read_to_string(&config_path).unwrap_or_default();
        let config: serde_json::Value = serde_json::from_str(&content).unwrap_or(serde_json::json!({}));
        config.get("activeAccount")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    } else {
        None
    };

    let accounts_dir = config_dir.join("accounts");
    if !accounts_dir.exists() {
        return Ok(Vec::new());
    }

    let mut accounts = Vec::new();
    let entries = fs::read_dir(&accounts_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();
        if path.is_dir() {
            let tokens_path = path.join("tokens.json");
            if !tokens_path.exists() {
                continue;
            }

            // Read metadata.json
            let metadata_path = path.join("metadata.json");
            let metadata: Option<AccountMetadata> = if metadata_path.exists() {
                let content = fs::read_to_string(&metadata_path).unwrap_or_default();
                serde_json::from_str(&content).ok()
            } else {
                None
            };

            let email = match &metadata {
                Some(meta) => meta.email.clone(),
                None => path.file_name().unwrap_or_default().to_string_lossy().replace("_", "@"),
            };

            // Read tokens.json to calculate status
            let status = if let Ok(content) = fs::read_to_string(&tokens_path) {
                if let Ok(tokens) = serde_json::from_str::<TokenInfo>(&content) {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0);
                    let expiry_buffer = 5 * 60 * 1000; // 5 mins
                    if now >= tokens.expires_at.saturating_sub(expiry_buffer) {
                        if tokens.refresh_token.is_some() {
                            "expired".to_string()
                        } else {
                            "invalid".to_string()
                        }
                    } else {
                        "valid".to_string()
                    }
                } else {
                    "invalid".to_string()
                }
            } else {
                "invalid".to_string()
            };

            // Read cache.json
            let cache_path = path.join("cache.json");
            let mut cached_credits = None;
            let mut cached_snapshot = None;
            if cache_path.exists() {
                let content = fs::read_to_string(&cache_path).unwrap_or_default();
                if let Ok(cache) = serde_json::from_str::<AccountCache>(&content) {
                    cached_credits = cache.data.prompt_credits.clone();
                    cached_snapshot = Some(cache.data);
                }
            }

            let is_active = Some(&email) == active_account.as_ref();
            let last_used = metadata.as_ref().and_then(|m| m.last_used.clone());
            let added_at = metadata.as_ref().and_then(|m| m.added_at.clone());

            accounts.push(AccountData {
                email,
                is_active,
                status,
                last_used,
                added_at,
                cached_credits,
                cached_snapshot,
            });
        }
    }

    // Sort active account first, then by email
    accounts.sort_by(|a, b| {
        if a.is_active && !b.is_active {
            std::cmp::Ordering::Less
        } else if !a.is_active && b.is_active {
            std::cmp::Ordering::Greater
        } else {
            a.email.cmp(&b.email)
        }
    });

    Ok(accounts)
}

#[tauri::command]
async fn sync_all_accounts() -> Result<serde_json::Value, String> {
    let output = tokio::task::spawn_blocking(|| {
        run_cli_command("quota --json --all --refresh")
    }).await.map_err(|e| e.to_string())?;

    match output {
        Ok(stdout) => {
            let json: serde_json::Value = serde_json::from_str(&stdout)
                .map_err(|e| format!("Failed to parse JSON output: {}\nRaw: {}", e, stdout))?;
            Ok(json)
        }
        Err(e) => {
            if e.contains("No accounts found") {
                Ok(serde_json::json!([]))
            } else {
                Err(e)
            }
        }
    }
}

#[tauri::command]
async fn sync_account(email: String) -> Result<serde_json::Value, String> {
    let output = tokio::task::spawn_blocking(move || {
        run_cli_command(&format!("quota --json --refresh --account {}", email))
    }).await.map_err(|e| e.to_string())?;

    match output {
        Ok(stdout) => {
            let json: serde_json::Value = serde_json::from_str(&stdout)
                .map_err(|e| format!("Failed to parse JSON output: {}\nRaw: {}", e, stdout))?;
            Ok(json)
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
fn switch_account(email: String) -> Result<String, String> {
    run_cli_command(&format!("accounts switch {}", email))
}

#[tauri::command]
fn remove_account(email: String) -> Result<String, String> {
    run_cli_command(&format!("accounts remove {} --force", email))
}

#[tauri::command]
async fn start_login_flow(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut lock = state.login_process.lock().map_err(|e| e.to_string())?;
    if lock.is_some() {
        return Err("A login session is already active.".into());
    }

    let mut child = tokio::process::Command::new("zsh")
        .arg("-l")
        .arg("-c")
        .arg("npx antigravity-usage login")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start login subprocess: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to open stdout pipe")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr pipe")?;

    *lock = Some(child);
    drop(lock);

    // Stream stdout to frontend logs
    let app_clone1 = app.clone();
    tokio::spawn(async move {
        use tokio::io::{AsyncBufReadExt, BufReader};
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone1.emit("login-stdout", line);
        }
    });

    // Stream stderr to frontend logs
    let app_clone2 = app.clone();
    tokio::spawn(async move {
        use tokio::io::{AsyncBufReadExt, BufReader};
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let _ = app_clone2.emit("login-stderr", line);
        }
    });

    // Monitor exit status of process
    let app_clone3 = app.clone();
    tokio::spawn(async move {
        let state_clone = app_clone3.state::<AppState>();
        let child = {
            let mut child_lock = state_clone.login_process.lock().unwrap();
            child_lock.take()
        }; // MutexGuard is dropped here

        if let Some(mut c) = child {
            let wait_res = c.wait().await;
            match wait_res {
                Ok(s) if s.success() => {
                    let _ = app_clone3.emit("login-status", serde_json::json!({ "type": "success" }));
                }
                Ok(s) => {
                    let _ = app_clone3.emit("login-status", serde_json::json!({ "type": "error", "message": format!("Login process exited with status: {}", s) }));
                }
                Err(e) => {
                    let _ = app_clone3.emit("login-status", serde_json::json!({ "type": "error", "message": e.to_string() }));
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn cancel_login_flow(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let child = {
        let mut lock = state.login_process.lock().map_err(|e| e.to_string())?;
        lock.take()
    }; // MutexGuard is dropped here

    if let Some(mut child) = child {
        let _ = child.kill().await;
        return Ok(());
    }
    Err("No login flow is currently active.".into())
}

#[tauri::command]
fn open_session_folder() -> Result<(), String> {
    if let Some(dir) = get_config_dir() {
        if dir.exists() {
            open::that(dir).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Err("Config folder does not exist yet.".into())
}

#[tauri::command]
fn clear_all_sessions() -> Result<(), String> {
    if let Some(dir) = get_config_dir() {
        if dir.exists() {
            fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
            fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    Ok(())
}

#[tauri::command]
fn get_versions() -> Result<serde_json::Value, String> {
    let tauri_version = env!("CARGO_PKG_VERSION").to_string();
    let cli_version = match run_cli_command("--version") {
        Ok(v) => v.trim().to_string(),
        Err(_) => "Not installed / Error".to_string(),
    };
    Ok(serde_json::json!({
        "app": tauri_version,
        "cli": cli_version
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            login_process: Arc::new(Mutex::new(None)),
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_accounts_data,
            sync_all_accounts,
            sync_account,
            switch_account,
            remove_account,
            start_login_flow,
            cancel_login_flow,
            open_session_folder,
            clear_all_sessions,
            get_versions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
