import { normalizeTerminalHexColor } from './terminal-custom-themes'

/** Pane surfaces users can recolor. Each key maps to one or more CSS tokens
 *  in `assets/main.css` (see renderer `lib/interface-color-overrides.ts`). */
export const INTERFACE_PANE_COLOR_KEYS = ['background', 'sidebar', 'editorSurface', 'card'] as const

export type InterfacePaneColorKey = (typeof INTERFACE_PANE_COLOR_KEYS)[number]

export type InterfacePaneColors = Partial<Record<InterfacePaneColorKey, string>>

/** Keyed per resolved mode: a hex that works on dark chrome rarely works on
 *  light, so overrides never leak across the light/dark boundary. */
export type InterfaceColorOverrides = {
  dark?: InterfacePaneColors
  light?: InterfacePaneColors
}

export function normalizeInterfacePaneColors(value: unknown): InterfacePaneColors {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const input = value as Record<string, unknown>
  const output: InterfacePaneColors = {}
  for (const key of INTERFACE_PANE_COLOR_KEYS) {
    const color = normalizeTerminalHexColor(input[key])
    if (color) {
      output[key] = color
    }
  }
  return output
}

export function normalizeInterfaceColorOverrides(value: unknown): InterfaceColorOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  const input = value as Record<string, unknown>
  const output: InterfaceColorOverrides = {}
  const dark = normalizeInterfacePaneColors(input.dark)
  const light = normalizeInterfacePaneColors(input.light)
  if (Object.keys(dark).length > 0) {
    output.dark = dark
  }
  if (Object.keys(light).length > 0) {
    output.light = light
  }
  return output
}
