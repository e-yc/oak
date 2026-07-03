import { useCallback, useEffect, useRef, useState } from 'react'

/** Height of the collapsed strip that stands in for the 32px tab row. */
export const SLIM_TAB_STRIP_HEIGHT_PX = 10

/** How long the revealed tab row stays up after the mouse stops moving. */
const REVEAL_IDLE_HIDE_MS = 1600

/** A stacked group's header slims only below another pane: the top-edge
 *  groups keep the real tab row because it doubles as window-drag chrome. */
export function shouldSlimTabGroupHeader(args: {
  slimStackedPaneHeaders: boolean
  hasSplitGroups: boolean
  touchesTopEdge: boolean
}): boolean {
  return args.slimStackedPaneHeaders && args.hasSplitGroups && !args.touchesTopEdge
}

type SlimStackedHeaderReveal = {
  revealed: boolean
  /** Spread onto the group root: mouse movement anywhere in the pane reveals
   *  the tab row; leaving the pane hides it. */
  rootRevealHandlers: {
    onMouseMove: () => void
    onMouseLeave: () => void
  }
  /** Spread onto the revealed header so it stays up while the pointer is
   *  parked on it (e.g. aiming at a tab) even without movement. */
  headerHoverHandlers: {
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
}

export function useSlimStackedHeaderReveal(enabled: boolean): SlimStackedHeaderReveal {
  const [revealed, setRevealed] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headerHoveredRef = useRef(false)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(function tick() {
      // Why: a pointer resting on the header (aiming at a tab, opening a
      // menu) must not lose the row to the idle timer; re-check later.
      if (headerHoveredRef.current) {
        hideTimerRef.current = setTimeout(tick, REVEAL_IDLE_HIDE_MS)
        return
      }
      hideTimerRef.current = null
      setRevealed(false)
    }, REVEAL_IDLE_HIDE_MS)
  }, [clearHideTimer])

  useEffect(() => {
    if (!enabled) {
      clearHideTimer()
      headerHoveredRef.current = false
      setRevealed(false)
    }
    return clearHideTimer
  }, [enabled, clearHideTimer])

  const onMouseMove = useCallback(() => {
    if (!enabled) {
      return
    }
    setRevealed(true)
    scheduleHide()
  }, [enabled, scheduleHide])

  const onMouseLeave = useCallback(() => {
    clearHideTimer()
    headerHoveredRef.current = false
    setRevealed(false)
  }, [clearHideTimer])

  const onHeaderMouseEnter = useCallback(() => {
    headerHoveredRef.current = true
  }, [])

  const onHeaderMouseLeave = useCallback(() => {
    headerHoveredRef.current = false
  }, [])

  return {
    revealed,
    rootRevealHandlers: { onMouseMove, onMouseLeave },
    headerHoverHandlers: { onMouseEnter: onHeaderMouseEnter, onMouseLeave: onHeaderMouseLeave }
  }
}
