#!/usr/bin/env node
// Installs "Oak Dev.app" into /Applications: a clickable launcher for the
// hot-reload dev environment (`pnpm dev`). Launching it focuses the already
// running dev client when one exists, otherwise it cold-starts electron-vite
// dev detached from the launcher with logs in ~/Library/Logs/Oak/.
import { execFileSync, execSync } from 'node:child_process'
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

if (process.platform !== 'darwin') {
  console.error('install-macos-dev-launcher: macOS only (installs an .app bundle).')
  process.exit(1)
}

const repoRoot = path.resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const readFlagValue = (flag) => {
  const index = args.indexOf(flag)
  return index === -1 ? null : args[index + 1]
}
const appName = readFlagValue('--name') ?? 'Oak Dev'
const destDir = readFlagValue('--dest') ?? '/Applications'
const addLoginItem = args.includes('--login-item')

const appPath = path.join(destDir, `${appName}.app`)
const contentsDir = path.join(appPath, 'Contents')
const macosDir = path.join(contentsDir, 'MacOS')
const resourcesDir = path.join(contentsDir, 'Resources')

// Bake absolute tool paths at install time: the launcher runs from LaunchServices
// with a minimal environment, so PATH must not depend on shell profiles.
const nodeBinDir = path.dirname(process.execPath)
let pnpmBinDir = ''
try {
  pnpmBinDir = path.dirname(execSync('command -v pnpm', { encoding: 'utf8' }).trim())
} catch {
  console.error('install-macos-dev-launcher: pnpm not found on PATH; install pnpm first.')
  process.exit(1)
}
const pathPrefix = [
  nodeBinDir,
  pnpmBinDir,
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/usr/bin',
  '/bin'
]
  .filter((entry, index, list) => entry && list.indexOf(entry) === index)
  .join(':')

const launcherScript = `#!/bin/bash
set -u
REPO_ROOT=${JSON.stringify(repoRoot)}
export PATH="${pathPrefix}:$PATH"
LOG_DIR="$HOME/Library/Logs/Oak"
LOG_FILE="$LOG_DIR/oak-dev.log"
mkdir -p "$LOG_DIR"

notify() {
  /usr/bin/osascript -e "display notification \\"$1\\" with title \\"Oak Dev\\"" >/dev/null 2>&1 || true
}

if [ ! -d "$REPO_ROOT" ]; then
  notify "Oak repo not found at $REPO_ROOT — reinstall the launcher."
  exit 1
fi

# Reconnect path: a dev client spawned by run-electron-vite-dev.mjs runs the
# copied bundle under out/electron-dev/. Match only the main-binary invocation
# ("Electron ." with the app-dir arg) — "Electron Helper" processes like the
# persistent PTY daemon outlive the client and must not suppress a cold start.
if /usr/bin/pgrep -f "$REPO_ROOT/out/electron-dev/.*/Contents/MacOS/Electron \\." >/dev/null 2>&1; then
  marker=$(ls -t "$REPO_ROOT"/out/electron-dev/*/oak-dev-electron-app.json 2>/dev/null | head -1)
  bundle_id=""
  if [ -n "$marker" ]; then
    bundle_id=$(/usr/bin/sed -n 's/.*"bundleId": *"\\([^"]*\\)".*/\\1/p' "$marker" | head -1)
  fi
  if [ -n "$bundle_id" ] && /usr/bin/osascript -e "tell application id \\"$bundle_id\\" to activate" >/dev/null 2>&1; then
    exit 0
  fi
  notify "Oak dev is already running."
  exit 0
fi

# Cap the append-only log so years of dev launches don't grow unbounded.
if [ -f "$LOG_FILE" ] && [ "$(/usr/bin/stat -f %z "$LOG_FILE")" -gt 10485760 ]; then
  : > "$LOG_FILE"
fi

notify "Starting Oak dev (hot reload)…"
cd "$REPO_ROOT" || exit 1
echo "===== $(date) Oak Dev launch =====" >> "$LOG_FILE"
nohup pnpm run dev >> "$LOG_FILE" 2>&1 &
disown
exit 0
`

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${appName}</string>
  <key>CFBundleDisplayName</key><string>${appName}</string>
  <key>CFBundleIdentifier</key><string>com.stablyai.oak.dev-launcher</string>
  <key>CFBundleVersion</key><string>1.0.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>oak-dev-launcher</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>LSUIElement</key><true/>
</dict>
</plist>
`

rmSync(appPath, { recursive: true, force: true })
mkdirSync(macosDir, { recursive: true })
mkdirSync(resourcesDir, { recursive: true })
writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist)
const launcherPath = path.join(macosDir, 'oak-dev-launcher')
writeFileSync(launcherPath, launcherScript)
chmodSync(launcherPath, 0o755)

// Launcher icon: a plain black circle on transparency, so the Dock/Finder
// entry is unmistakably the dev launcher and not the packaged Oak app.
function renderBlackCirclePng(size) {
  const { PNG } = require('pngjs')
  const png = new PNG({ width: size, height: size })
  const center = (size - 1) / 2
  const radius = size * 0.42
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - center, y - center)
      const coverage = Math.max(0, Math.min(1, radius - distance + 0.5))
      const offset = (y * size + x) * 4
      png.data[offset] = 0
      png.data[offset + 1] = 0
      png.data[offset + 2] = 0
      png.data[offset + 3] = Math.round(coverage * 255)
    }
  }
  return PNG.sync.write(png)
}

{
  const iconsetDir = path.join(tmpdir(), `oak-dev-launcher-${process.pid}.iconset`)
  rmSync(iconsetDir, { recursive: true, force: true })
  mkdirSync(iconsetDir, { recursive: true })
  const slots = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  for (const [name, size] of slots) {
    writeFileSync(path.join(iconsetDir, name), renderBlackCirclePng(size))
  }
  execFileSync('/usr/bin/iconutil', [
    '-c',
    'icns',
    iconsetDir,
    '-o',
    path.join(resourcesDir, 'icon.icns')
  ])
  rmSync(iconsetDir, { recursive: true, force: true })
}

execFileSync('/usr/bin/codesign', ['--force', '-s', '-', appPath], { stdio: 'ignore' })

if (addLoginItem) {
  execFileSync('/usr/bin/osascript', [
    '-e',
    `tell application "System Events" to make login item at end with properties {path:${JSON.stringify(appPath)}, hidden:false}`
  ])
}

console.log(`Installed ${appPath}`)
console.log(`  repo:  ${repoRoot}`)
console.log(`  logs:  ~/Library/Logs/Oak/oak-dev.log`)
if (!addLoginItem) {
  console.log('  tip:   re-run with --login-item to auto-start it at login')
}
