import { BrowserWindow, nativeTheme, screen } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import type { Store } from '../persistence'
import { AGENT_PIP_MIN_CONTENT_HEIGHT } from '../../shared/agent-pip-types'
import { boundsHaveVisibleAreaOnAnyDisplay } from './bounds-visible-on-display'

export const AGENT_PIP_MIN_WIDTH = 320
export const AGENT_PIP_MAX_WIDTH = 640
const AGENT_PIP_DEFAULT_WIDTH = 380
const AGENT_PIP_SCREEN_EDGE_MARGIN = 16
const AGENT_PIP_BOUNDS_SAVE_DEBOUNCE_MS = 500

export function loadAgentPipWindow(win: BrowserWindow): void {
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/agent-pip.html`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/agent-pip.html'))
  }
}

// Why: video-PiP convention — with no saved position, park the window at the
// bottom-right of the primary display's work area.
function getDefaultAgentPipPosition(width: number): { x: number; y: number } | null {
  try {
    const wa = screen.getPrimaryDisplay().workArea
    return {
      x: wa.x + wa.width - width - AGENT_PIP_SCREEN_EDGE_MARGIN,
      y: wa.y + wa.height - AGENT_PIP_MIN_CONTENT_HEIGHT - AGENT_PIP_SCREEN_EDGE_MARGIN
    }
  } catch {
    return null
  }
}

type CreateAgentPipWindowOptions = {
  /** Sampled at ready-to-show. Lets the caller keep the window hidden when it
   *  is created while an IDE window is focused (focus-aware PiP). */
  shouldShowOnReady?: () => boolean
}

export function createAgentPipWindow(
  store: Store | null,
  opts?: CreateAgentPipWindowOptions
): BrowserWindow {
  const rawSavedBounds = store?.getUI().agentPipWindowBounds
  // Why: height is content-driven (rows push the window taller), so only
  // {x, y, width} persist. Validate against attached displays with the row
  // height as the probe rect so a stale external-monitor position falls back
  // to the default corner instead of restoring off-screen.
  const savedBounds =
    rawSavedBounds &&
    rawSavedBounds.width >= AGENT_PIP_MIN_WIDTH &&
    rawSavedBounds.width <= AGENT_PIP_MAX_WIDTH &&
    boundsHaveVisibleAreaOnAnyDisplay(
      { ...rawSavedBounds, height: AGENT_PIP_MIN_CONTENT_HEIGHT },
      { width: AGENT_PIP_MIN_WIDTH / 2, height: AGENT_PIP_MIN_CONTENT_HEIGHT / 2 }
    )
      ? rawSavedBounds
      : null
  const width = savedBounds?.width ?? AGENT_PIP_DEFAULT_WIDTH
  const position = savedBounds ?? getDefaultAgentPipPosition(width)

  const win = new BrowserWindow({
    width,
    height: AGENT_PIP_MIN_CONTENT_HEIGHT,
    ...(position ? { x: position.x, y: position.y } : {}),
    minWidth: AGENT_PIP_MIN_WIDTH,
    maxWidth: AGENT_PIP_MAX_WIDTH,
    // Why: height is content-driven — the agentPip:resize handler re-pins
    // both bounds to each reported content height so users resize width only.
    minHeight: AGENT_PIP_MIN_CONTENT_HEIGHT,
    maxHeight: AGENT_PIP_MIN_CONTENT_HEIGHT,
    show: false,
    frame: false,
    resizable: true,
    maximizable: false,
    minimizable: false,
    // Why: macOS only honors visibleOnFullScreen for non-fullscreenable windows.
    fullscreenable: false,
    skipTaskbar: true,
    // Why: the PiP lives to be clicked while another app is focused; the
    // app-activating click must land on the reply row, not be swallowed.
    acceptFirstMouse: true,
    roundedCorners: true,
    // Why: liquid-glass treatment on macOS — an alpha-zero backgroundColor
    // (NOT `transparent: true`, which drops native rounded corners/shadow)
    // lets the vibrancy layer show through; the renderer keys translucent
    // surfaces off data-agent-pip-vibrancy. 'menu' adapts to light/dark via
    // nativeTheme, which main keeps synced with the theme setting.
    // Windows/Linux keep an opaque background — translucent windows break
    // native resize and shadows there.
    ...(process.platform === 'darwin'
      ? {
          backgroundColor: '#00000000',
          vibrancy: 'menu' as const,
          // Why: the PiP is a background surface that is rarely focused;
          // 'followWindow' would flatten the glass whenever it is inactive.
          visualEffectState: 'active' as const
        }
      : { backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff' }),
    webPreferences: {
      preload: join(__dirname, '../preload/agent-pip.js'),
      sandbox: true,
      contextIsolation: true,
      // Why: the PiP is tiny and usually unfocused; keep elapsed-time and
      // "Sending…" UI live instead of letting Chromium clamp its timers.
      backgroundThrottling: false
    }
  })

  // Why: 'floating' is the video-PiP stacking level; 'screen-saver' and above
  // fight system UI. visibleOnFullScreen + skipTransformProcessType keeps the
  // window over fullscreen Spaces on macOS without dock/activation churn.
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true
  })

  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && (opts?.shouldShowOnReady?.() ?? true)) {
      // Why: opening the PiP must not steal focus from whatever the user is
      // working in — it is a background status surface until clicked.
      win.showInactive()
    }
  })

  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const saveBounds = (): void => {
    if (boundsTimer) {
      clearTimeout(boundsTimer)
    }
    boundsTimer = setTimeout(() => {
      boundsTimer = null
      if (win.isDestroyed()) {
        return
      }
      const bounds = win.getBounds()
      store?.updateUI({
        agentPipWindowBounds: { x: bounds.x, y: bounds.y, width: bounds.width }
      })
    }, AGENT_PIP_BOUNDS_SAVE_DEBOUNCE_MS)
  }
  win.on('resize', saveBounds)
  win.on('move', saveBounds)
  win.on('closed', () => {
    if (boundsTimer) {
      clearTimeout(boundsTimer)
      boundsTimer = null
    }
  })

  return win
}
