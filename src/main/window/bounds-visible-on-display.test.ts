import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAllDisplaysMock = vi.fn()

vi.mock('electron', () => ({
  screen: {
    getAllDisplays: (): unknown => getAllDisplaysMock()
  }
}))

const WORK_AREA_DISPLAY = { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
const MIN_VISIBLE = { width: 160, height: 28 }

describe('boundsHaveVisibleAreaOnAnyDisplay', () => {
  beforeEach(() => {
    getAllDisplaysMock.mockReset()
    getAllDisplaysMock.mockReturnValue([WORK_AREA_DISPLAY])
  })

  it('accepts bounds fully inside a display work area', async () => {
    const { boundsHaveVisibleAreaOnAnyDisplay } = await import('./bounds-visible-on-display')
    expect(
      boundsHaveVisibleAreaOnAnyDisplay({ x: 100, y: 100, width: 380, height: 56 }, MIN_VISIBLE)
    ).toBe(true)
  })

  it('rejects bounds with only a sliver of overlap', async () => {
    const { boundsHaveVisibleAreaOnAnyDisplay } = await import('./bounds-visible-on-display')
    // Only 10px of horizontal overlap remains on-screen.
    expect(
      boundsHaveVisibleAreaOnAnyDisplay({ x: 1910, y: 100, width: 380, height: 56 }, MIN_VISIBLE)
    ).toBe(false)
  })

  it('rejects bounds entirely on a detached display', async () => {
    const { boundsHaveVisibleAreaOnAnyDisplay } = await import('./bounds-visible-on-display')
    expect(
      boundsHaveVisibleAreaOnAnyDisplay({ x: -2000, y: 100, width: 380, height: 56 }, MIN_VISIBLE)
    ).toBe(false)
  })

  it('accepts bounds on a secondary display', async () => {
    const { boundsHaveVisibleAreaOnAnyDisplay } = await import('./bounds-visible-on-display')
    getAllDisplaysMock.mockReturnValue([
      WORK_AREA_DISPLAY,
      { workArea: { x: -1920, y: 0, width: 1920, height: 1080 } }
    ])
    expect(
      boundsHaveVisibleAreaOnAnyDisplay({ x: -1000, y: 100, width: 380, height: 56 }, MIN_VISIBLE)
    ).toBe(true)
  })

  it('treats a throwing screen API as off-screen', async () => {
    const { boundsHaveVisibleAreaOnAnyDisplay } = await import('./bounds-visible-on-display')
    getAllDisplaysMock.mockImplementation(() => {
      throw new Error('no screen')
    })
    expect(
      boundsHaveVisibleAreaOnAnyDisplay({ x: 100, y: 100, width: 380, height: 56 }, MIN_VISIBLE)
    ).toBe(false)
  })
})
