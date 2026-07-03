const MANAGED_MARKER = '# Oak managed WSL CLI launcher'
const BRIDGE_MANAGED_MARKER = '# Oak managed WSL CLI PowerShell bridge'

export function buildWslLauncher(
  windowsLauncherPath: string,
  bridgePath = '${XDG_DATA_HOME:-$HOME/.local/share}/oak/oak-wsl-bridge.ps1'
): string {
  const encodedTarget = Buffer.from(windowsLauncherPath, 'utf8').toString('base64')
  return `#!/usr/bin/env bash
set -euo pipefail
${MANAGED_MARKER}
# OAK_WIN_LAUNCHER_B64=${encodedTarget}
OAK_WIN_LAUNCHER=${quoteShell(windowsLauncherPath)}
OAK_BRIDGE_PS1=${quoteShell(bridgePath)}
if command -v powershell.exe >/dev/null 2>&1; then
  OAK_POWERSHELL=powershell.exe
elif [ -x /mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe ]; then
  OAK_POWERSHELL=/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe
else
  echo "Oak WSL CLI requires Windows interop and could not find powershell.exe." >&2
  exit 1
fi
OAK_BRIDGE_PS1_WIN=$(wslpath -w "$OAK_BRIDGE_PS1")
exec "$OAK_POWERSHELL" -NoProfile -ExecutionPolicy Bypass -File "$OAK_BRIDGE_PS1_WIN" "$OAK_WIN_LAUNCHER" "$@"
`
}

export function buildWslBridgeScript(): string {
  return `${BRIDGE_MANAGED_MARKER}
param(
  [Parameter(Mandatory=$true)]
  [string]$OakLauncher,

  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$ForwardArgs
)

try {
  & $OakLauncher @ForwardArgs
  if (-not $?) {
    exit 1
  }
  if ($null -eq $LASTEXITCODE) {
    exit 0
  }
  exit $LASTEXITCODE
} catch {
  Write-Error $_
  exit 1
}
`
}

export function getBridgePathFromCommandPath(commandPath: string): string {
  // Why: both the current Linux command and the legacy pre-rename command
  // share one WSL bridge under ~/.local/share/oak.
  return `${commandPath.replace(/\/\.local\/bin\/(?:oak|oak-ide)$/, '/.local/share/oak')}/oak-wsl-bridge.ps1`
}

export function buildSafeReplaceGuard(path: string, managedMarker: string): string {
  const quotedPath = quoteShell(path)
  const quotedMarker = quoteShell(managedMarker)
  return [
    `if [ -L ${quotedPath} ]; then`,
    '  echo "__OAK_CONFLICT__"',
    '  exit 23',
    `elif [ -e ${quotedPath} ] && { [ ! -f ${quotedPath} ] || ! grep -Fq ${quotedMarker} ${quotedPath}; }; then`,
    '  echo "__OAK_CONFLICT__"',
    '  exit 23',
    'fi'
  ].join('\n')
}

export function buildSafeRemoveCommand(commandPath: string): string {
  const bridgePath = getBridgePathFromCommandPath(commandPath)
  return [
    'set -euo pipefail',
    buildSafeReplaceGuard(commandPath, MANAGED_MARKER),
    buildSafeReplaceGuard(bridgePath, BRIDGE_MANAGED_MARKER),
    `rm -f ${quoteShell(commandPath)} ${quoteShell(bridgePath)}`
  ].join('\n')
}

export function parseManagedLauncherTarget(content: string): string | null {
  const encoded = content.match(/^# OAK_WIN_LAUNCHER_B64=([A-Za-z0-9+/=]+)$/m)?.[1]
  if (encoded) {
    try {
      return Buffer.from(encoded, 'base64').toString('utf8')
    } catch {
      return null
    }
  }

  const legacyTarget = content.match(/^OAK_WIN_LAUNCHER='((?:[^']|'"'"')*)'$/m)?.[1]
  return legacyTarget ? legacyTarget.replaceAll(`'"'"'`, "'") : null
}

export function getPosixDirname(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '/'
}

export function getWslLauncherMarker(): string {
  return MANAGED_MARKER
}

export function getWslBridgeMarker(): string {
  return BRIDGE_MANAGED_MARKER
}

export function quoteShell(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`
}
