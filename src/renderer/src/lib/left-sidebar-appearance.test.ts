import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { getDefaultSettings } from '../../../shared/constants'
import { resolveLeftSidebarStyleVariables } from './left-sidebar-appearance'

function settings(overrides = {}) {
  return {
    ...getDefaultSettings(tmpdir()),
    ...overrides
  }
}

describe('resolveLeftSidebarStyleVariables', () => {
  it('leaves the default sidebar token surface untouched', () => {
    expect(resolveLeftSidebarStyleVariables(settings(), true)).toBeUndefined()
  })

  it('matches terminal background, foreground, and scoped text tokens', () => {
    const vars = resolveLeftSidebarStyleVariables(
      settings({
        leftSidebarAppearanceMode: 'match-terminal',
        terminalColorOverrides: {
          background: '#101820',
          foreground: '#f0f4f8'
        }
      }),
      true
    )

    expect(vars).toMatchObject({
      '--worktree-sidebar': '#101820',
      '--worktree-sidebar-foreground': '#f0f4f8',
      '--sidebar': '#101820',
      '--sidebar-foreground': '#f0f4f8',
      '--background': '#101820',
      '--foreground': '#f0f4f8'
    })
    expect(vars?.['--worktree-sidebar-accent']).toContain('#f0f4f8 9%')
    expect(vars?.['--sidebar-accent']).toBe(vars?.['--worktree-sidebar-accent'])
  })

  it('honors terminal background opacity for matched terminal surfaces', () => {
    const vars = resolveLeftSidebarStyleVariables(
      settings({
        leftSidebarAppearanceMode: 'match-terminal',
        terminalColorOverrides: { background: '#123456' },
        terminalBackgroundOpacity: 0.5
      }),
      true
    )

    expect(vars?.['--worktree-sidebar']).toBe('rgba(18, 52, 86, 0.5)')
  })

  it('builds a tinted surface from normalized tint settings', () => {
    const vars = resolveLeftSidebarStyleVariables(
      settings({
        leftSidebarAppearanceMode: 'tinted',
        leftSidebarTintColor: '336699',
        leftSidebarTintOpacity: 0.125
      }),
      true
    )

    expect(vars?.['--worktree-sidebar']).toBe(
      'color-mix(in srgb, #336699 12.5%, var(--background))'
    )
    expect(vars?.['--sidebar']).toBe(vars?.['--worktree-sidebar'])
    expect(vars?.['--worktree-sidebar-foreground']).toBe('var(--foreground)')
  })

  it('caps tinted opacity so arbitrary tint colors stay subtle', () => {
    const vars = resolveLeftSidebarStyleVariables(
      settings({
        leftSidebarAppearanceMode: 'tinted',
        leftSidebarTintColor: '#000000',
        leftSidebarTintOpacity: 1
      }),
      true
    )

    expect(vars?.['--worktree-sidebar']).toBe('color-mix(in srgb, #000000 35%, var(--background))')
  })

  it('falls back to the default surface for liquid glass without window vibrancy', () => {
    const vars = resolveLeftSidebarStyleVariables(
      settings({ leftSidebarAppearanceMode: 'liquid-glass' }),
      true
    )

    expect(vars).toBeUndefined()
  })

  it('builds translucent glass surfaces per theme when vibrancy is available', () => {
    const dark = resolveLeftSidebarStyleVariables(
      settings({ leftSidebarAppearanceMode: 'liquid-glass', theme: 'dark' }),
      false,
      { liquidGlassAvailable: true }
    )
    expect(dark?.['--worktree-sidebar']).toBe('rgb(42 42 42 / 0.25)')
    expect(dark?.['--sidebar']).toBe(dark?.['--worktree-sidebar'])
    expect(dark?.['--worktree-sidebar-accent']).toContain('#fafafa 9%')

    const light = resolveLeftSidebarStyleVariables(
      settings({ leftSidebarAppearanceMode: 'liquid-glass', theme: 'system' }),
      false,
      { liquidGlassAvailable: true }
    )
    expect(light?.['--worktree-sidebar']).toBe('rgb(245 245 245 / 0.30)')
  })
})
