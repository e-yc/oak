import { describe, expect, it } from 'vitest'
import {
  normalizeInterfaceColorOverrides,
  normalizeInterfacePaneColors
} from './interface-color-overrides'

describe('normalizeInterfacePaneColors', () => {
  it('returns empty for non-objects', () => {
    expect(normalizeInterfacePaneColors(undefined)).toEqual({})
    expect(normalizeInterfacePaneColors([])).toEqual({})
    expect(normalizeInterfacePaneColors('x')).toEqual({})
  })

  it('keeps only known keys with valid hex, expanding shorthand', () => {
    expect(
      normalizeInterfacePaneColors({
        background: '#ABC',
        sidebar: 'red',
        editorSurface: '#1e1e1e',
        card: 42,
        unknownKey: '#ffffff'
      })
    ).toEqual({ background: '#aabbcc', editorSurface: '#1e1e1e' })
  })
})

describe('normalizeInterfaceColorOverrides', () => {
  it('drops empty modes so untouched settings stay clean', () => {
    expect(normalizeInterfaceColorOverrides({ dark: {}, light: { sidebar: 'zzz' } })).toEqual({})
    expect(
      normalizeInterfaceColorOverrides({ dark: { background: '#0b0b12' }, light: null })
    ).toEqual({ dark: { background: '#0b0b12' } })
  })
})
