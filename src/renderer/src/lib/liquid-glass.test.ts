// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyLeftSidebarGlassDocumentAttribute,
  applyTerminalGlassDocumentAttribute,
  isLiquidGlassAvailable,
  isTerminalLiquidGlassActive
} from './liquid-glass'

function platformInfo(platform: NodeJS.Platform, windowVibrancy: boolean) {
  return { platform, osRelease: '', displayServer: null, windowVibrancy }
}

afterEach(() => {
  delete document.documentElement.dataset.leftSidebarGlass
  delete document.documentElement.dataset.terminalGlass
  vi.unstubAllGlobals()
})

describe('isLiquidGlassAvailable', () => {
  it('is false when the preload api is absent (tests, web preview)', () => {
    expect(isLiquidGlassAvailable()).toBe(false)
  })

  it('requires both darwin and a vibrancy-created window', () => {
    vi.stubGlobal('api', { platform: { get: () => platformInfo('darwin', false) } })
    expect(isLiquidGlassAvailable()).toBe(false)

    vi.stubGlobal('api', { platform: { get: () => platformInfo('win32', true) } })
    expect(isLiquidGlassAvailable()).toBe(false)

    vi.stubGlobal('api', { platform: { get: () => platformInfo('darwin', true) } })
    expect(isLiquidGlassAvailable()).toBe(true)
  })
})

describe('isTerminalLiquidGlassActive', () => {
  it('requires the setting and window vibrancy together', () => {
    vi.stubGlobal('api', { platform: { get: () => platformInfo('darwin', true) } })
    expect(isTerminalLiquidGlassActive({ terminalLiquidGlass: true })).toBe(true)
    expect(isTerminalLiquidGlassActive({ terminalLiquidGlass: false })).toBe(false)
    expect(isTerminalLiquidGlassActive(null)).toBe(false)

    vi.stubGlobal('api', { platform: { get: () => platformInfo('darwin', false) } })
    expect(isTerminalLiquidGlassActive({ terminalLiquidGlass: true })).toBe(false)
  })
})

describe('glass document attributes', () => {
  it('stamps and clears independently', () => {
    applyLeftSidebarGlassDocumentAttribute(true)
    applyTerminalGlassDocumentAttribute(true)
    expect(document.documentElement.dataset.leftSidebarGlass).toBe('true')
    expect(document.documentElement.dataset.terminalGlass).toBe('true')

    applyLeftSidebarGlassDocumentAttribute(false)
    expect(document.documentElement.dataset.leftSidebarGlass).toBeUndefined()
    expect(document.documentElement.dataset.terminalGlass).toBe('true')

    applyTerminalGlassDocumentAttribute(false)
    expect(document.documentElement.dataset.terminalGlass).toBeUndefined()
  })
})
