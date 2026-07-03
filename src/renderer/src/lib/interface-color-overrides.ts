import type { GlobalSettings } from '../../../shared/types'
import { HEX_COLOR_RE } from '../../../shared/color-validation'
import {
  INTERFACE_PANE_COLOR_KEYS,
  type InterfacePaneColorKey,
  type InterfacePaneColors
} from '../../../shared/interface-color-overrides'

// Why: sidebar has two token families (see left-sidebar-appearance.ts) — the
// worktree sidebar plus the shadcn family older descendants still consume.
const PANE_COLOR_CSS_VARS: Record<InterfacePaneColorKey, readonly string[]> = {
  background: ['--background'],
  sidebar: ['--worktree-sidebar', '--sidebar'],
  editorSurface: ['--editor-surface'],
  card: ['--card']
}

// Why: pickers need a concrete color to seed from and to show as the "default"
// swatch. Mirrors the :root/.dark values in assets/main.css (canonical).
export const INTERFACE_PANE_DEFAULT_COLORS: Record<
  'dark' | 'light',
  Record<InterfacePaneColorKey, string>
> = {
  light: { background: '#ffffff', sidebar: '#f5f5f5', editorSurface: '#ffffff', card: '#ffffff' },
  dark: { background: '#0a0a0a', sidebar: '#2a2a2a', editorSurface: '#1e1e1e', card: '#171717' }
}

export function resolveInterfaceModeIsDark(
  theme: GlobalSettings['theme'] | undefined,
  systemPrefersDark: boolean
): boolean {
  return theme === 'dark' || (theme !== 'light' && systemPrefersDark)
}

/** Applies the active mode's pane overrides as inline CSS variables on the
 *  document root. Inline vars beat the :root/.dark class rules, so overrides
 *  must be re-resolved and re-applied whenever the effective mode flips. */
export function applyInterfaceColorOverrides(
  settings: Pick<GlobalSettings, 'theme' | 'interfaceColorOverrides'> | null,
  systemPrefersDark: boolean
): void {
  const isDark = resolveInterfaceModeIsDark(settings?.theme, systemPrefersDark)
  const colors: InterfacePaneColors =
    settings?.interfaceColorOverrides?.[isDark ? 'dark' : 'light'] ?? {}
  const rootStyle = document.documentElement.style
  for (const key of INTERFACE_PANE_COLOR_KEYS) {
    const value = colors[key]
    // Values are persisted while the user types; only valid hex reaches CSS.
    const applied = value && HEX_COLOR_RE.test(value.trim()) ? value.trim() : null
    for (const cssVar of PANE_COLOR_CSS_VARS[key]) {
      if (applied) {
        rootStyle.setProperty(cssVar, applied)
      } else {
        rootStyle.removeProperty(cssVar)
      }
    }
  }
}
