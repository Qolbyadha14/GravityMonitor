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

// Structured error enums for better front-end error reporting
#[derive(serde::Serialize, Debug, Clone)]
#[serde(tag = "code", content = "payload")]
pub enum AppError {
    ConfigDirNotFound,
    FileReadError { path: String, detail: String },
    JsonParseError { detail: String },
    SubprocessFailed { code: Option<i32>, stdout: String, stderr: String },
    LoginInProgress,
    Generic { message: String },
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::ConfigDirNotFound => write!(f, "Config directory not found"),
            AppError::FileReadError { path, detail } => write!(f, "Failed to read file '{}': {}", path, detail),
            AppError::JsonParseError { detail } => write!(f, "JSON parsing failed: {}", detail),
            AppError::SubprocessFailed { code, stdout, stderr } => {
                write!(f, "Subprocess failed with code {:?}. stdout: {}, stderr: {}", code, stdout, stderr)
            }
            AppError::LoginInProgress => write!(f, "A login session is already active"),
            AppError::Generic { message } => write!(f, "{}", message),
        }
    }
}

// Required for Tauri to compile Result with this error
impl std::error::Error for AppError {}

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
    #[serde(rename = "tokenExpiresAt")]
    token_expires_at: Option<u64>, // unix ms
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

/// Extracts the first valid JSON object `{...}` or array `[...]` from a
/// potentially-noisy string (e.g. output that contains npx install logs or
/// CLI warning lines printed before the actual JSON payload).
fn extract_json(raw: &str) -> Option<&str> {
    // Find the first '{' or '[' that starts a JSON value
    let start = raw.find(|c| c == '{' || c == '[')?;
    let slice = &raw[start..];

    // Walk forward keeping a depth counter to find the matching close bracket
    let open = slice.chars().next()?;
    let close = if open == '{' { '}' } else { ']' };
    let mut depth: i64 = 0;
    let mut in_string = false;
    let mut escape_next = false;
    let mut end = 0usize;

    for (i, ch) in slice.char_indices() {
        if escape_next {
            escape_next = false;
            continue;
        }
        if ch == '\\' && in_string {
            escape_next = true;
            continue;
        }
        if ch == '"' {
            in_string = !in_string;
            continue;
        }
        if in_string {
            continue;
        }
        if ch == open {
            depth += 1;
        } else if ch == close {
            depth -= 1;
            if depth == 0 {
                end = i + ch.len_utf8();
                break;
            }
        }
    }

    if depth == 0 && end > 0 {
        Some(&slice[..end])
    } else {
        None
    }
}

// Runs a CLI command via dynamic shell (inherits node paths, brew, nvm paths)
fn run_cli_command(args_str: &str) -> Result<String, AppError> {
    let cmd = format!("npx antigravity-usage {}", args_str);

    #[cfg(target_os = "windows")]
    let output = Command::new("cmd")
        .arg("/c")
        .arg(&cmd)
        .output();

    #[cfg(not(target_os = "windows"))]
    let output = {
        let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut command = Command::new(&shell);
        if shell.contains("zsh") || shell.contains("bash") {
            command.arg("-l"); // load user env paths
        }
        command.arg("-c").arg(&cmd).output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(AppError::SubprocessFailed {
                    code: out.status.code(),
                    stdout,
                    stderr,
                })
            }
        }
        Err(e) => Err(AppError::Generic {
            message: format!("Failed to execute shell command: {}", e),
        }),
    }
}

#[tauri::command]
fn get_accounts_data() -> Result<Vec<AccountData>, AppError> {
    let config_dir = get_config_dir().ok_or(AppError::ConfigDirNotFound)?;

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
    let entries = fs::read_dir(&accounts_dir).map_err(|e| AppError::FileReadError {
        path: accounts_dir.to_string_lossy().to_string(),
        detail: e.to_string(),
    })?;

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
            let mut token_expires_at: Option<u64> = None;
            let status = if let Ok(content) = fs::read_to_string(&tokens_path) {
                if let Ok(tokens) = serde_json::from_str::<TokenInfo>(&content) {
                    token_expires_at = Some(tokens.expires_at);
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
                token_expires_at,
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
async fn sync_all_accounts() -> Result<serde_json::Value, AppError> {
    let output = tokio::task::spawn_blocking(|| {
        run_cli_command("quota --json --all --refresh")
    }).await.map_err(|e| AppError::Generic { message: e.to_string() })?;

    match output {
        Ok(stdout) => {
            // Extract only the JSON portion — CLI may print log/warning lines before it
            let json_str = extract_json(&stdout).ok_or_else(|| AppError::JsonParseError {
                detail: format!("No JSON found in CLI output.\nRaw: {}", &stdout[..stdout.len().min(500)]),
            })?;
            let json: serde_json::Value = serde_json::from_str(json_str)
                .map_err(|e| AppError::JsonParseError {
                    detail: format!("Failed to parse extracted JSON: {}\nExtracted: {}", e, &json_str[..json_str.len().min(500)]),
                })?;
            Ok(json)
        }
        Err(e) => {
            match &e {
                AppError::SubprocessFailed { stdout, .. } if stdout.contains("No accounts found") => {
                    Ok(serde_json::json!([]))
                }
                // Also try to recover JSON from failed-exit stdout before giving up
                AppError::SubprocessFailed { stdout, .. } => {
                    if let Some(json_str) = extract_json(stdout) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                            return Ok(json);
                        }
                    }
                    Err(e)
                }
                _ => Err(e),
            }
        }
    }
}

#[tauri::command]
async fn sync_account(email: String) -> Result<serde_json::Value, AppError> {
    let output = tokio::task::spawn_blocking(move || {
        run_cli_command(&format!("quota --json --refresh --account {}", email))
    }).await.map_err(|e| AppError::Generic { message: e.to_string() })?;

    match output {
        Ok(stdout) => {
            // Extract only the JSON portion — CLI may print log/warning lines before it
            let json_str = extract_json(&stdout).ok_or_else(|| AppError::JsonParseError {
                detail: format!("No JSON found in CLI output.\nRaw: {}", &stdout[..stdout.len().min(500)]),
            })?;
            let json: serde_json::Value = serde_json::from_str(json_str)
                .map_err(|e| AppError::JsonParseError {
                    detail: format!("Failed to parse extracted JSON: {}\nExtracted: {}", e, &json_str[..json_str.len().min(500)]),
                })?;
            Ok(json)
        }
        Err(e) => {
            // Also try to recover JSON from failed-exit stdout before giving up
            if let AppError::SubprocessFailed { stdout, .. } = &e {
                if let Some(json_str) = extract_json(stdout) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                        return Ok(json);
                    }
                }
            }
            Err(e)
        }
    }
}

#[tauri::command]
async fn refresh_account_tokens(email: Option<String>) -> Result<String, AppError> {
    let arg = match email {
        Some(e) => format!("accounts refresh {}", e),
        None => "accounts refresh --all".to_string(),
    };
    tokio::task::spawn_blocking(move || {
        run_cli_command(&arg)
    }).await.map_err(|e| AppError::Generic {
        message: format!("Token refresh blocking task failed: {}", e)
    })?
}

#[tauri::command]
fn switch_account(email: String) -> Result<String, AppError> {
    run_cli_command(&format!("accounts switch {}", email))
}

#[tauri::command]
fn remove_account(email: String) -> Result<String, AppError> {
    let cli_res = run_cli_command(&format!("accounts remove {} --force", email));

    if let Some(config_dir) = get_config_dir() {
        let sanitized = email.replace("@", "_");
        let acc_dir = config_dir.join("accounts").join(&sanitized);
        if acc_dir.exists() {
            let _ = fs::remove_dir_all(&acc_dir);
        }

        let config_path = config_dir.join("config.json");
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if config.get("activeAccount").and_then(|v| v.as_str()) == Some(&email) {
                        config["activeAccount"] = serde_json::Value::Null;
                        if let Ok(new_content) = serde_json::to_string_pretty(&config) {
                            let _ = fs::write(&config_path, new_content);
                        }
                    }
                }
            }
        }
    }

    cli_res
}

#[tauri::command]
async fn start_login_flow(app: AppHandle, state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    let mut lock = state.login_process.lock().map_err(|_| AppError::Generic { message: "Failed to lock active process Mutex".to_string() })?;
    if lock.is_some() {
        return Err(AppError::LoginInProgress);
    }

    #[cfg(target_os = "windows")]
    let spawn_res = tokio::process::Command::new("cmd")
        .arg("/c")
        .arg("npx antigravity-usage login")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    #[cfg(not(target_os = "windows"))]
    let spawn_res = {
        let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut cmd = tokio::process::Command::new(&shell);
        if shell.contains("zsh") || shell.contains("bash") {
            cmd.arg("-l"); // load profile logic
        }
        cmd.arg("-c")
            .arg("npx antigravity-usage login")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    };

    let mut child = spawn_res.map_err(|e| AppError::Generic { message: format!("Failed to spawn login process: {}", e) })?;

    let stdout = child.stdout.take().ok_or(AppError::Generic { message: "Failed to open stdout pipe".to_string() })?;
    let stderr = child.stderr.take().ok_or(AppError::Generic { message: "Failed to open stderr pipe".to_string() })?;

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
async fn cancel_login_flow(state: tauri::State<'_, AppState>) -> Result<(), AppError> {
    let child = {
        let mut lock = state.login_process.lock().map_err(|_| AppError::Generic { message: "Failed to lock AppState".to_string() })?;
        lock.take()
    }; // MutexGuard is dropped here

    if let Some(mut child) = child {
        let _ = child.kill().await;
        return Ok(());
    }
    Err(AppError::Generic { message: "No login flow is currently active.".to_string() })
}

#[tauri::command]
fn open_session_folder() -> Result<(), AppError> {
    if let Some(dir) = get_config_dir() {
        if dir.exists() {
            open::that(dir).map_err(|e| AppError::Generic { message: e.to_string() })?;
            return Ok(());
        }
    }
    Err(AppError::Generic { message: "Config folder does not exist yet.".to_string() })
}

#[tauri::command]
fn clear_all_sessions() -> Result<(), AppError> {
    if let Some(dir) = get_config_dir() {
        if dir.exists() {
            fs::remove_dir_all(&dir).map_err(|e| AppError::Generic { message: e.to_string() })?;
            fs::create_dir_all(&dir).map_err(|e| AppError::Generic { message: e.to_string() })?;
            return Ok(());
        }
    }
    Ok(())
}

#[tauri::command]
fn get_versions() -> Result<serde_json::Value, AppError> {
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

/// Read wakeup config + last N history entries directly from the filesystem.
/// Returns a serde_json::Value so the frontend gets the raw shape from the CLI
/// without us needing to maintain a parallel Rust schema for it.
#[tauri::command]
fn get_wakeup_status() -> serde_json::Value {
    let config_dir = match get_config_dir() {
        Some(d) => d,
        None => return serde_json::json!({ "configured": false }),
    };
    let wakeup_dir = config_dir.join("wakeup");

    // Read wakeup config
    let config: serde_json::Value = {
        let path = wakeup_dir.join("config.json");
        if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or(serde_json::Value::Null)
        } else {
            serde_json::Value::Null
        }
    };

    // Read last 5 history entries
    let history: serde_json::Value = {
        let path = wakeup_dir.join("history.json");
        if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .map(|v| {
                    // Slice first 5 entries
                    if let Some(arr) = v.as_array() {
                        serde_json::Value::Array(arr.iter().take(5).cloned().collect())
                    } else {
                        v
                    }
                })
                .unwrap_or(serde_json::json!([]))
        } else {
            serde_json::json!([])
        }
    };

    let configured = !config.is_null()
        && config.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false);

    serde_json::json!({
        "configured": configured,
        "config": config,
        "history": history
    })
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
            refresh_account_tokens,
            switch_account,
            remove_account,
            start_login_flow,
            cancel_login_flow,
            open_session_folder,
            clear_all_sessions,
            get_versions,
            get_wakeup_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
