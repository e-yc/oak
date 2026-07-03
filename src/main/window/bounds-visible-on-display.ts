import { screen } from 'electron'

// Why: a persisted window rect must land on a currently-attached display with
// a *meaningful* visible area — not just any >0 overlap, since a 1-pixel
// sliver (or a sub-pixel shaving after DPI scaling) would still leave the
// titlebar unreachable. Overlap is measured against each display's workArea
// (which excludes menu bar / dock), so a rect entirely hidden under the dock
// is also correctly discarded. A rect saved while an external monitor was
// connected would otherwise be restored off-screen and macOS would silently
// shrink/reposition the window.
export function boundsHaveVisibleAreaOnAnyDisplay(
  bounds: { x: number; y: number; width: number; height: number },
  minVisible: { width: number; height: number }
): boolean {
  try {
    return screen.getAllDisplays().some((display) => {
      const wa = display.workArea
      const overlapX = Math.max(
        0,
        Math.min(bounds.x + bounds.width, wa.x + wa.width) - Math.max(bounds.x, wa.x)
      )
      const overlapY = Math.max(
        0,
        Math.min(bounds.y + bounds.height, wa.y + wa.height) - Math.max(bounds.y, wa.y)
      )
      return overlapX >= minVisible.width && overlapY >= minVisible.height
    })
  } catch (err) {
    console.warn('[window] screen.getAllDisplays() threw; treating bounds as off-screen', err)
    return false
  }
}
