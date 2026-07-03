import type { GlobalSettings } from './types'
import {
  normalizeTerminalColorOverrides,
  normalizeTerminalHexColor,
  normalizeTerminalThemeName
} from './terminal-custom-themes'
import {
  DEFAULT_LEFT_SIDEBAR_TINT_COLOR,
  DEFAULT_LEFT_SIDEBAR_TINT_OPACITY,
  normalizeLeftSidebarAppearanceMode,
  normalizeLeftSidebarTintOpacity
} from './left-sidebar-appearance'
import {
  normalizeInterfaceColorOverrides,
  type InterfaceColorOverrides
} from './interface-color-overrides'
import type { TerminalColorOverrides } from './types'

export const MAX_APPEARANCE_PRESETS = 50

// Why: mirror the shipped defaults in constants.ts so a snapshot is always
// total — applying a preset must reset every appearance field, including ones
// the preset never customized, or switching presets leaves stale colors behind.
const FALLBACK_DARK_THEME = 'Ghostty Default Style Dark'
const FALLBACK_LIGHT_THEME = 'Builtin Tango Light'
const FALLBACK_DIVIDER_DARK = '#3f3f46'
const FALLBACK_DIVIDER_LIGHT = '#d4d4d8'

/** Every field is required: presets capture the complete appearance state so
 *  applying one is deterministic regardless of what was customized before. */
export type AppearancePresetSnapshot = {
  theme: GlobalSettings['theme']
  leftSidebarAppearanceMode: GlobalSettings['leftSidebarAppearanceMode']
  leftSidebarTintColor: string
  leftSidebarTintOpacity: number
  terminalThemeDark: string
  terminalUseSeparateLightTheme: boolean
  terminalThemeLight: string
  terminalDividerColorDark: string
  terminalDividerColorLight: string
  terminalBackgroundOpacity: number
  terminalColorOverrides: TerminalColorOverrides
  interfaceColorOverrides: InterfaceColorOverrides
}

export type AppearancePreset = {
  id: string
  name: string
  savedAt: string
  snapshot: AppearancePresetSnapshot
}

function normalizeTheme(value: unknown): GlobalSettings['theme'] {
  return value === 'dark' || value === 'light' || value === 'system' ? value : 'system'
}

function normalizeBackgroundOpacity(value: unknown): number {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : 1
  return Math.min(1, Math.max(0, parsed))
}

function normalizeSnapshot(value: unknown): AppearancePresetSnapshot {
  const input =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  return {
    theme: normalizeTheme(input.theme),
    leftSidebarAppearanceMode: normalizeLeftSidebarAppearanceMode(input.leftSidebarAppearanceMode),
    leftSidebarTintColor:
      normalizeTerminalHexColor(input.leftSidebarTintColor) ?? DEFAULT_LEFT_SIDEBAR_TINT_COLOR,
    leftSidebarTintOpacity:
      typeof input.leftSidebarTintOpacity === 'number'
        ? normalizeLeftSidebarTintOpacity(input.leftSidebarTintOpacity)
        : DEFAULT_LEFT_SIDEBAR_TINT_OPACITY,
    terminalThemeDark:
      typeof input.terminalThemeDark === 'string' && input.terminalThemeDark.trim()
        ? input.terminalThemeDark
        : FALLBACK_DARK_THEME,
    terminalUseSeparateLightTheme: input.terminalUseSeparateLightTheme !== false,
    terminalThemeLight:
      typeof input.terminalThemeLight === 'string' && input.terminalThemeLight.trim()
        ? input.terminalThemeLight
        : FALLBACK_LIGHT_THEME,
    terminalDividerColorDark:
      normalizeTerminalHexColor(input.terminalDividerColorDark) ?? FALLBACK_DIVIDER_DARK,
    terminalDividerColorLight:
      normalizeTerminalHexColor(input.terminalDividerColorLight) ?? FALLBACK_DIVIDER_LIGHT,
    terminalBackgroundOpacity: normalizeBackgroundOpacity(input.terminalBackgroundOpacity),
    terminalColorOverrides: normalizeTerminalColorOverrides(input.terminalColorOverrides),
    interfaceColorOverrides: normalizeInterfaceColorOverrides(input.interfaceColorOverrides)
  }
}

export function buildAppearancePresetSnapshot(
  settings: Pick<GlobalSettings, keyof AppearancePresetSnapshot>
): AppearancePresetSnapshot {
  return normalizeSnapshot(settings)
}

export function appearanceSnapshotsEqual(
  a: AppearancePresetSnapshot,
  b: AppearancePresetSnapshot
): boolean {
  // Both sides come out of normalizeSnapshot, so key order is deterministic.
  return JSON.stringify(a) === JSON.stringify(b)
}

export function normalizeAppearancePresets(value: unknown): AppearancePreset[] {
  if (!Array.isArray(value)) {
    return []
  }
  const byId = new Map<string, AppearancePreset>()
  for (const entry of value.slice(-MAX_APPEARANCE_PRESETS)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue
    }
    const input = entry as Record<string, unknown>
    const id = typeof input.id === 'string' ? input.id.trim() : ''
    const name = normalizeTerminalThemeName(input.name, '')
    if (!id || !name) {
      continue
    }
    byId.set(id, {
      id,
      name,
      savedAt:
        typeof input.savedAt === 'string' && input.savedAt.trim()
          ? input.savedAt
          : new Date(0).toISOString(),
      snapshot: normalizeSnapshot(input.snapshot)
    })
  }
  return [...byId.values()].slice(-MAX_APPEARANCE_PRESETS)
}
