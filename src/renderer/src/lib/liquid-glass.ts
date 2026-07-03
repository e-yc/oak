import type { GlobalSettings } from '../../../shared/types'

// Why: liquid-glass surfaces need window-level vibrancy, which only exists
// when the main window was created for it (macOS + restart-bound options).
// The main process advertises that via a renderer argument that the preload
// exposes as platform.windowVibrancy — settings alone are not enough.
export function isLiquidGlassAvailable(): boolean {
  try {
    const info = window.api?.platform.get()
    return info?.platform === 'darwin' && info.windowVibrancy === true
  } catch {
    return false
  }
}

/** Whether terminal panes should render as tinted glass right now. */
export function isTerminalLiquidGlassActive(
  settings: Pick<GlobalSettings, 'terminalLiquidGlass'> | null | undefined
): boolean {
  return settings?.terminalLiquidGlass === true && isLiquidGlassAvailable()
}

/** Stamps the document attribute that lets body stop painting behind the
 *  sidebar column (see the liquid-glass block in main.css). */
export function applyLeftSidebarGlassDocumentAttribute(enabled: boolean): void {
  if (enabled) {
    document.documentElement.dataset.leftSidebarGlass = 'true'
  } else {
    delete document.documentElement.dataset.leftSidebarGlass
  }
}

/** Stamps the document attribute that lets body and the center column stop
 *  painting behind terminal panes (see the liquid-glass block in main.css). */
export function applyTerminalGlassDocumentAttribute(enabled: boolean): void {
  if (enabled) {
    document.documentElement.dataset.terminalGlass = 'true'
  } else {
    delete document.documentElement.dataset.terminalGlass
  }
}
