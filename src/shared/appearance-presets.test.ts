import { describe, expect, it } from 'vitest'
import {
  appearanceSnapshotsEqual,
  buildAppearancePresetSnapshot,
  MAX_APPEARANCE_PRESETS,
  normalizeAppearancePresets
} from './appearance-presets'
import { getDefaultSettings } from './constants'

const defaults = (): ReturnType<typeof getDefaultSettings> => getDefaultSettings('/home/test')

function validPreset(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'preset-1',
    name: 'Night coding',
    savedAt: '2026-07-02T00:00:00.000Z',
    snapshot: buildAppearancePresetSnapshot(defaults()),
    ...overrides
  }
}

describe('normalizeAppearancePresets', () => {
  it('returns empty for non-arrays', () => {
    expect(normalizeAppearancePresets(undefined)).toEqual([])
    expect(normalizeAppearancePresets('nope')).toEqual([])
    expect(normalizeAppearancePresets({})).toEqual([])
  })

  it('keeps valid presets and drops entries without id or name', () => {
    const result = normalizeAppearancePresets([
      validPreset(),
      validPreset({ id: '' }),
      validPreset({ id: 'preset-2', name: '   ' }),
      'garbage',
      null
    ])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('preset-1')
    expect(result[0].name).toBe('Night coding')
  })

  it('dedupes by id keeping the last occurrence', () => {
    const result = normalizeAppearancePresets([
      validPreset({ name: 'First' }),
      validPreset({ name: 'Second' })
    ])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Second')
  })

  it('caps the list at MAX_APPEARANCE_PRESETS keeping the newest', () => {
    const presets = Array.from({ length: MAX_APPEARANCE_PRESETS + 5 }, (_, index) =>
      validPreset({ id: `preset-${index}` })
    )
    const result = normalizeAppearancePresets(presets)
    expect(result).toHaveLength(MAX_APPEARANCE_PRESETS)
    expect(result.at(-1)?.id).toBe(`preset-${MAX_APPEARANCE_PRESETS + 4}`)
  })

  it('repairs malformed snapshots with defaults and drops invalid colors', () => {
    const result = normalizeAppearancePresets([
      validPreset({
        snapshot: {
          theme: 'neon',
          terminalDividerColorDark: 'not-a-color',
          terminalBackgroundOpacity: 7,
          terminalColorOverrides: { background: '#123456', foreground: 'nothex' },
          interfaceColorOverrides: { light: { background: '#FFF', sidebar: 'zzz' } }
        }
      })
    ])
    const snapshot = result[0].snapshot
    expect(snapshot.theme).toBe('system')
    expect(snapshot.terminalDividerColorDark).toBe('#3f3f46')
    expect(snapshot.terminalBackgroundOpacity).toBe(1)
    expect(snapshot.terminalColorOverrides).toEqual({ background: '#123456' })
    expect(snapshot.interfaceColorOverrides).toEqual({ light: { background: '#ffffff' } })
  })
})

describe('buildAppearancePresetSnapshot', () => {
  it('is total: every field concrete so applying a preset resets prior customization', () => {
    const snapshot = buildAppearancePresetSnapshot(defaults())
    for (const value of Object.values(snapshot)) {
      expect(value).not.toBeUndefined()
    }
    expect(snapshot.terminalColorOverrides).toEqual({})
    expect(snapshot.interfaceColorOverrides).toEqual({})
  })

  it('round-trips equality through normalization', () => {
    const settings = {
      ...defaults(),
      interfaceColorOverrides: { light: { background: '#f7f4ec' } }
    }
    const a = buildAppearancePresetSnapshot(settings)
    const [preset] = normalizeAppearancePresets([validPreset({ snapshot: a })])
    expect(appearanceSnapshotsEqual(a, preset.snapshot)).toBe(true)
    expect(
      appearanceSnapshotsEqual(a, buildAppearancePresetSnapshot(defaults()))
    ).toBe(false)
  })
})
