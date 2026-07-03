// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shouldSlimTabGroupHeader, useSlimStackedHeaderReveal } from './use-slim-stacked-header'

describe('shouldSlimTabGroupHeader', () => {
  it('slims only stacked groups below the top edge with the setting on', () => {
    expect(
      shouldSlimTabGroupHeader({
        slimStackedPaneHeaders: true,
        hasSplitGroups: true,
        touchesTopEdge: false
      })
    ).toBe(true)
    // Top-edge groups keep the real tab row (window-drag chrome lives there).
    expect(
      shouldSlimTabGroupHeader({
        slimStackedPaneHeaders: true,
        hasSplitGroups: true,
        touchesTopEdge: true
      })
    ).toBe(false)
    expect(
      shouldSlimTabGroupHeader({
        slimStackedPaneHeaders: false,
        hasSplitGroups: true,
        touchesTopEdge: false
      })
    ).toBe(false)
    expect(
      shouldSlimTabGroupHeader({
        slimStackedPaneHeaders: true,
        hasSplitGroups: false,
        touchesTopEdge: false
      })
    ).toBe(false)
  })
})

describe('useSlimStackedHeaderReveal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reveals on mouse move and hides after the idle timeout', () => {
    const { result } = renderHook(() => useSlimStackedHeaderReveal(true))
    expect(result.current.revealed).toBe(false)

    act(() => result.current.rootRevealHandlers.onMouseMove())
    expect(result.current.revealed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.revealed).toBe(false)
  })

  it('hides immediately when the mouse leaves the pane', () => {
    const { result } = renderHook(() => useSlimStackedHeaderReveal(true))
    act(() => result.current.rootRevealHandlers.onMouseMove())
    expect(result.current.revealed).toBe(true)

    act(() => result.current.rootRevealHandlers.onMouseLeave())
    expect(result.current.revealed).toBe(false)
  })

  it('stays revealed while the pointer parks on the header', () => {
    const { result } = renderHook(() => useSlimStackedHeaderReveal(true))
    act(() => result.current.rootRevealHandlers.onMouseMove())
    act(() => result.current.headerHoverHandlers.onMouseEnter())

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.revealed).toBe(true)

    act(() => result.current.headerHoverHandlers.onMouseLeave())
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.revealed).toBe(false)
  })

  it('ignores movement and resets when disabled', () => {
    const { result, rerender } = renderHook(({ enabled }) => useSlimStackedHeaderReveal(enabled), {
      initialProps: { enabled: true }
    })
    act(() => result.current.rootRevealHandlers.onMouseMove())
    expect(result.current.revealed).toBe(true)

    rerender({ enabled: false })
    expect(result.current.revealed).toBe(false)
    act(() => result.current.rootRevealHandlers.onMouseMove())
    expect(result.current.revealed).toBe(false)
  })
})
