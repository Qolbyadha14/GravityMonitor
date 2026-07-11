# Gravity Monitor 🚀

> Personal desktop application to monitor **Google Antigravity** model quotas across multiple accounts in real-time, integrated with **antigravity-usage**.

Gravity Monitor is designed for local developer workflows. It runs as a lightweight native desktop client with no database, no cloud storage, and no backend API server. All session tokens are managed locally by the `antigravity-usage` CLI.

---

## 🎨 Tech Stack

- **Desktop Framework:** Tauri v2 (Rust backend)
- **Frontend Core:** React 19 & TypeScript
- **Styling & Theme:** Tailwind CSS v4 (GitHub-inspired theme with native dark/light modes)
- **Icons:** Lucide React
- **Engine integration:** `antigravity-usage` CLI

---

## ⚡ Core Features

- **Multi-Account Card Grid:** Displays all connected accounts in a responsive grid. Each card details individual model/agent remaining usage, progress bars, and token expiry status at a glance.
- **Subprocess Login Terminal:** Spawns `antigravity-usage login` inside a native Rust subprocess and streams real-time stdout/stderr progress logs directly into a modal console for complete OAuth visibility.
- **One-Click Synchronization:** Instantly fetches the latest quota data from Google APIs or fallback local instances using a global "Sync All" command.
- **Hardware-Accelerated Transitions:** Butter-smooth modal zooming and drawer slide-ins utilizing hardware-accelerated CSS animations.
- **Configuration Utilities:** Toggle auto-refresh intervals, switch themes, open local session folders in Finder/Explorer, or wipe active tokens.

---

## 🏗️ High Level Architecture

```text
┌───────────────────────────────┐
│     React 19 Frontend UI      │
│                               │
│  Dashboard Cards              │
│  Subprocess Console Log       │
│  Settings Preferences         │
└───────────────┬───────────────┘
                │
          Tauri IPC (IPC Commands & Events)
                │
┌───────────────▼───────────────┐
│       Rust Tauri Backend      │
│                               │
│  • Reads tokens/cache JSON    │
│  • Spawns CLI subprocesses    │
│  • Listens & Emits CLI events │
└───────────────┬───────────────┘
                │
       Subprocess Command (npx)
                │
┌───────────────▼───────────────┐
│     antigravity-usage CLI     │
│                               │
│  • OAuth Authentication       │
│  • Quota Fetching             │
│  • Session Tokens Manager     │
└───────────────────────────────┘
```

---

## ⚙️ Setup & Development

### Prerequisites

1. **Rust:** Install Rust toolchain (Cargo) from [rustup.rs](https://rustup.rs/).
2. **Node.js & npm:** Install Node.js (v18+ recommended).
3. **CLI Engine:** Gravity Monitor uses `npx` to execute `antigravity-usage` CLI. Ensure you have `npm` available in your environment path.

### Installation

Clone the repository and install npm dependencies:

```bash
npm install
```

### Running Locally (Development Mode)

Start the Tauri development server. This compiles the Rust backend, launches the Vite frontend server, and opens the native desktop client window:

```bash
npm run tauri dev
```

### Production Build

To compile a highly optimized release binary packaged for your OS (`.dmg`/`.app` on macOS, `.msi`/`.exe` on Windows):

```bash
npm run tauri build
```

---

## 🔐 Credentials & Security

Gravity Monitor **never stores passwords or credentials**. 

All authorization tokens are managed and stored locally by the `antigravity-usage` engine inside standard OS application support directories:
- **macOS:** `~/Library/Application Support/antigravity-usage/`
- **Windows:** `%APPDATA%\antigravity-usage\`
- **Linux:** `~/.config/antigravity-usage/`

You can inspect or delete these files at any time via the settings panel.
