import type { GlobalSettings } from '../../../shared/types'
import { HEX_COLOR_RE } from '../../../shared/color-validation'
import {
  normalizeLeftSidebarTintColor,
  normalizeLeftSidebarTintOpacity
} from '../../../shared/left-sidebar-appearance'
import { resolveEffectiveTerminalAppearance } from './terminal-theme'

type LeftSidebarAppearanceSettings = Pick<
  GlobalSettings,
  | 'leftSidebarAppearanceMode'
  | 'leftSidebarTintColor'
  | 'leftSidebarTintOpacity'
  | 'theme'
  | 'terminalThemeDark'
  | 'terminalDividerColorDark'
  | 'terminalUseSeparateLightTheme'
  | 'terminalThemeLight'
  | 'terminalCustomThemes'
  | 'terminalDividerColorLight'
  | 'terminalColorOverrides'
  | 'terminalBackgroundOpacity'
>

export type LeftSidebarStyleVariables = Record<string, string>

function hexToRgba(hex: string, alpha: number): string {
  const normalized = normalizeLeftSidebarTintColor(hex)
  let clean = normalized.replace('#', '')
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((part) => part + part)
      .join('')
  }
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function applyAlpha(color: string, alpha: number | undefined): string {
  if (alpha === undefined || alpha >= 1 || !HEX_COLOR_RE.test(color.trim())) {
    return color
  }
  return hexToRgba(color, Math.min(1, Math.max(0, alpha)))
}

function buildSurfaceVariables(args: {
  background: string
  foreground: string
  overrideTextTokens?: boolean
}): LeftSidebarStyleVariables {
  const { background, foreground, overrideTextTokens = false } = args
  const accent = `color-mix(in srgb, ${foreground} 9%, ${background})`
  // 7% keeps the sidebar divider at the same prominence as the global --border
  // (7% in dark mode) so it reads like the rest of the UI; 14% rendered brighter (#5906).
  const border = `color-mix(in srgb, ${foreground} 7%, ${background})`
  const ring = `color-mix(in srgb, ${foreground} 44%, ${background})`
  const vars: LeftSidebarStyleVariables = {
    '--worktree-sidebar': background,
    '--worktree-sidebar-foreground': foreground,
    '--worktree-sidebar-accent': accent,
    '--worktree-sidebar-accent-foreground': foreground,
    '--worktree-sidebar-border': border,
    '--worktree-sidebar-ring': ring,
    // Why: older worktree-sidebar descendants still consume the shadcn sidebar
    // token family; mirror it inside this scoped root so every left-sidebar
    // surface follows the selected appearance.
    '--sidebar': background,
    '--sidebar-foreground': foreground,
    '--sidebar-accent': accent,
    '--sidebar-accent-foreground': foreground,
    '--sidebar-border': border,
    '--sidebar-ring': ring
  }
  if (overrideTextTokens) {
    vars['--background'] = background
    vars['--foreground'] = foreground
    vars['--card'] = `color-mix(in srgb, ${foreground} 4%, ${background})`
    vars['--card-foreground'] = foreground
    vars['--accent'] = `color-mix(in srgb, ${foreground} 9%, ${background})`
    vars['--accent-foreground'] = foreground
    vars['--muted'] = `color-mix(in srgb, ${foreground} 7%, ${background})`
    vars['--muted-foreground'] = `color-mix(in srgb, ${foreground} 62%, ${background})`
    // Match the global --border (7%) so sidebar-scoped dividers aren't brighter (#5906).
    vars['--border'] = `color-mix(in srgb, ${foreground} 7%, ${background})`
  }
  return vars
}

function resolveTerminalSurfaceVariables(
  settings: LeftSidebarAppearanceSettings,
  systemPrefersDark: boolean
): LeftSidebarStyleVariables {
  const appearance = resolveEffectiveTerminalAppearance(settings, systemPrefersDark)
  const background = applyAlpha(
    settings.terminalColorOverrides?.background ?? appearance.theme?.background ?? '#000000',
    settings.terminalBackgroundOpacity
  )
  const foreground =
    settings.terminalColorOverrides?.foreground ?? appearance.theme?.foreground ?? '#fafafa'
  return buildSurfaceVariables({ background, foreground, overrideTextTokens: true })
}

function resolveTintedSurfaceVariables(
  settings: LeftSidebarAppearanceSettings
): LeftSidebarStyleVariables {
  const tintColor = normalizeLeftSidebarTintColor(settings.leftSidebarTintColor)
  const tintOpacity = normalizeLeftSidebarTintOpacity(settings.leftSidebarTintOpacity)
  const tintPercent = Number((tintOpacity * 100).toFixed(2))
  const background = `color-mix(in srgb, ${tintColor} ${tintPercent}%, var(--background))`
  return buildSurfaceVariables({ background, foreground: 'var(--foreground)' })
}

function resolveLiquidGlassSurfaceVariables(
  settings: LeftSidebarAppearanceSettings,
  systemPrefersDark: boolean
): LeftSidebarStyleVariables {
  const isDark =
    settings.theme === 'dark' || (settings.theme === 'system' && systemPrefersDark)
  // Why: translucent remixes of the default sidebar surface (main.css
  // --worktree-sidebar values); the window's vibrancy layer supplies the
  // blur, CSS only thins the paint so it shows through. Alphas are kept low —
  // the macOS 'sidebar' material already carries most of the surface tone.
  const background = isDark ? 'rgb(42 42 42 / 0.25)' : 'rgb(245 245 245 / 0.30)'
  const foreground = isDark ? '#fafafa' : '#0a0a0a'
  return buildSurfaceVariables({ background, foreground })
}

export type LeftSidebarStyleOptions = {
  /** Whether the OS window actually carries vibrancy (macOS, restart-bound).
   *  Without it, glass would just tint over the opaque body. */
  liquidGlassAvailable?: boolean
}

export function resolveLeftSidebarStyleVariables(
  settings: LeftSidebarAppearanceSettings | null | undefined,
  systemPrefersDark: boolean,
  options?: LeftSidebarStyleOptions
): LeftSidebarStyleVariables | undefined {
  if (!settings) {
    return undefined
  }
  switch (settings.leftSidebarAppearanceMode) {
    case 'default':
      return undefined
    case 'match-terminal':
      return resolveTerminalSurfaceVariables(settings, systemPrefersDark)
    case 'tinted':
      return resolveTintedSurfaceVariables(settings)
    case 'liquid-glass':
      // Why: fall back to the default opaque surface on non-mac platforms or
      // before the restart that gives the window its vibrancy layer.
      return options?.liquidGlassAvailable
        ? resolveLiquidGlassSurfaceVariables(settings, systemPrefersDark)
        : undefined
  }
}
