#!/usr/bin/env bash
# Bump version across all 3 config files (package.json, tauri.conf.json, Cargo.toml)
# Usage:
#   ./scripts/bump-version.sh patch    # 0.1.0 -> 0.1.1
#   ./scripts/bump-version.sh minor    # 0.1.0 -> 0.2.0
#   ./scripts/bump-version.sh major    # 0.1.0 -> 1.0.0
#   ./scripts/bump-version.sh 1.2.3    # explicit version

set -euo pipefail
cd "$(dirname "$0")/.."

BUMP="${1:-patch}"

node -e "
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const current = pkg.version;
const parts = current.split('.').map(Number);
let next = '$BUMP';

if ('$BUMP' === 'patch') {
  parts[2]++;
  next = parts.join('.');
} else if ('$BUMP' === 'minor') {
  parts[1]++;
  parts[2] = 0;
  next = parts.join('.');
} else if ('$BUMP' === 'major') {
  parts[0]++;
  parts[1] = 0;
  parts[2] = 0;
  next = parts.join('.');
}

console.log('Bumping version:', current, '->', next);

// 1. package.json
pkg.version = next;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// 2. src-tauri/tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
tauriConf.version = next;
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2) + '\n');

// 3. src-tauri/Cargo.toml
let cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
cargo = cargo.replace(/^version = \"[^\"]+\"/m, 'version = \"' + next + '\"');
fs.writeFileSync('src-tauri/Cargo.toml', cargo);

console.log('Updated package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml to ' + next);
"
