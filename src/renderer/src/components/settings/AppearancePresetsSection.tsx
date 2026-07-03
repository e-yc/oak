import type React from 'react'
import { useState } from 'react'
import { MonitorCog, Moon, MoreHorizontal, Plus, Sun } from 'lucide-react'

import type { GlobalSettings } from '../../../../shared/types'
import {
  appearanceSnapshotsEqual,
  buildAppearancePresetSnapshot,
  MAX_APPEARANCE_PRESETS,
  type AppearancePreset
} from '../../../../shared/appearance-presets'
import { SearchableSetting } from './SearchableSetting'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { resolveEffectiveTerminalAppearance } from '@/lib/terminal-theme'
import {
  INTERFACE_PANE_DEFAULT_COLORS,
  resolveInterfaceModeIsDark
} from '@/lib/interface-color-overrides'
import { translate } from '@/i18n/i18n'

type AppearancePresetsSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  applyTheme: (theme: 'system' | 'dark' | 'light') => void
  systemPrefersDark: boolean
  forceVisiblePrimary?: boolean
}

type PresetNameDialogState =
  | { kind: 'create' }
  | { kind: 'rename'; preset: AppearancePreset }
  | null

function createPresetId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  )
}

function PresetSwatches({
  preset,
  settings,
  systemPrefersDark
}: {
  preset: AppearancePreset
  settings: GlobalSettings
  systemPrefersDark: boolean
}): React.JSX.Element {
  const { snapshot } = preset
  const isDark = resolveInterfaceModeIsDark(snapshot.theme, systemPrefersDark)
  const mode = isDark ? 'dark' : 'light'
  // Custom themes live in the shared library, not the snapshot, so resolve
  // against the preset's theme selections with the current library.
  const terminalAppearance = resolveEffectiveTerminalAppearance(
    { ...snapshot, terminalCustomThemes: settings.terminalCustomThemes },
    systemPrefersDark
  )
  const terminalBackground =
    snapshot.terminalColorOverrides.background ?? terminalAppearance.theme?.background ?? '#000000'
  const paneColors = snapshot.interfaceColorOverrides[mode]
  const appBackground = paneColors?.background ?? INTERFACE_PANE_DEFAULT_COLORS[mode].background
  const sidebar = paneColors?.sidebar ?? INTERFACE_PANE_DEFAULT_COLORS[mode].sidebar

  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
      {[appBackground, sidebar, terminalBackground].map((color, index) => (
        <span
          key={index}
          className="size-3.5 rounded-full border border-border"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

function resolvePresetThemeIcon(theme: GlobalSettings['theme']): React.JSX.Element {
  if (theme === 'dark') {
    return <Moon className="size-3.5 text-muted-foreground" aria-hidden="true" />
  }
  if (theme === 'light') {
    return <Sun className="size-3.5 text-muted-foreground" aria-hidden="true" />
  }
  return <MonitorCog className="size-3.5 text-muted-foreground" aria-hidden="true" />
}

export function AppearancePresetsSection({
  settings,
  updateSettings,
  applyTheme,
  systemPrefersDark,
  forceVisiblePrimary = false
}: AppearancePresetsSectionProps): React.JSX.Element {
  const [nameDialog, setNameDialog] = useState<PresetNameDialogState>(null)
  const [nameDraft, setNameDraft] = useState('')

  const presets = settings.appearancePresets ?? []
  const currentSnapshot = buildAppearancePresetSnapshot(settings)
  const canSaveMore = presets.length < MAX_APPEARANCE_PRESETS

  function openCreateDialog(): void {
    setNameDraft('')
    setNameDialog({ kind: 'create' })
  }

  function openRenameDialog(preset: AppearancePreset): void {
    setNameDraft(preset.name)
    setNameDialog({ kind: 'rename', preset })
  }

  function commitNameDialog(): void {
    const name = nameDraft.trim()
    if (!name || !nameDialog) {
      return
    }
    if (nameDialog.kind === 'create') {
      const preset: AppearancePreset = {
        id: createPresetId(),
        name,
        savedAt: new Date().toISOString(),
        snapshot: currentSnapshot
      }
      updateSettings({ appearancePresets: [...presets, preset] })
    } else {
      updateSettings({
        appearancePresets: presets.map((preset) =>
          preset.id === nameDialog.preset.id ? { ...preset, name } : preset
        )
      })
    }
    setNameDialog(null)
  }

  function applyPreset(preset: AppearancePreset): void {
    updateSettings({ ...preset.snapshot })
    // Match the Theme control: apply the document theme immediately rather
    // than waiting for the settings round-trip.
    applyTheme(preset.snapshot.theme)
  }

  function updatePresetFromCurrent(preset: AppearancePreset): void {
    updateSettings({
      appearancePresets: presets.map((entry) =>
        entry.id === preset.id
          ? { ...entry, savedAt: new Date().toISOString(), snapshot: currentSnapshot }
          : entry
      )
    })
  }

  function deletePreset(preset: AppearancePreset): void {
    updateSettings({ appearancePresets: presets.filter((entry) => entry.id !== preset.id) })
  }

  const title = translate('auto.components.settings.AppearancePresetsSection.title', 'Presets')

  return (
    <SearchableSetting
      title={title}
      description={translate(
        'auto.components.settings.AppearancePresetsSection.description',
        'Save the current appearance as a preset and switch between saved setups.'
      )}
      keywords={['preset', 'theme', 'save', 'profile', 'switch', 'color scheme']}
      className="space-y-3"
      forceVisible={forceVisiblePrimary}
    >
      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate(
            'auto.components.settings.AppearancePresetsSection.emptyState',
            'No presets yet. Save your current appearance to switch between setups quickly.'
          )}
        </p>
      ) : (
        <div className="divide-y divide-border/40 rounded-md border border-border/60">
          {presets.map((preset) => {
            const isActive = appearanceSnapshotsEqual(preset.snapshot, currentSnapshot)
            return (
              <div
                key={preset.id}
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                  onClick={() => applyPreset(preset)}
                >
                  {resolvePresetThemeIcon(preset.snapshot.theme)}
                  <span className="truncate text-sm">{preset.name}</span>
                  <PresetSwatches
                    preset={preset}
                    settings={settings}
                    systemPrefersDark={systemPrefersDark}
                  />
                  {isActive ? (
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {translate(
                        'auto.components.settings.SettingsFormControls.9119fb2268',
                        'Current'
                      )}
                    </span>
                  ) : null}
                </button>
                {!isActive ? (
                  <Button variant="outline" size="xs" onClick={() => applyPreset(preset)}>
                    {translate('auto.components.settings.AppearancePresetsSection.apply', 'Apply')}
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={translate(
                        'auto.components.settings.AppearancePresetsSection.presetActions',
                        'Preset actions'
                      )}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => updatePresetFromCurrent(preset)}>
                      {translate(
                        'auto.components.settings.AppearancePresetsSection.updateFromCurrent',
                        'Update from current appearance'
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openRenameDialog(preset)}>
                      {translate(
                        'auto.components.settings.AppearancePresetsSection.rename',
                        'Rename…'
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => deletePreset(preset)}>
                      {translate(
                        'auto.components.settings.AppearancePresetsSection.delete',
                        'Delete'
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={openCreateDialog} disabled={!canSaveMore}>
        <Plus />
        {translate(
          'auto.components.settings.AppearancePresetsSection.saveCurrent',
          'Save Current as Preset'
        )}
      </Button>

      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {nameDialog?.kind === 'rename'
                ? translate(
                    'auto.components.settings.AppearancePresetsSection.renameTitle',
                    'Rename Preset'
                  )
                : translate(
                    'auto.components.settings.AppearancePresetsSection.createTitle',
                    'Save Preset'
                  )}
            </DialogTitle>
            {nameDialog?.kind === 'create' ? (
              <DialogDescription>
                {translate(
                  'auto.components.settings.AppearancePresetsSection.createDescription',
                  'Captures the current theme, terminal theme, and custom colors.'
                )}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="appearance-preset-name">
              {translate('auto.components.settings.AppearancePresetsSection.nameLabel', 'Name')}
            </Label>
            <Input
              id="appearance-preset-name"
              // Why: the dialog exists to collect this one field; focus must
              // land where Enter submits.
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitNameDialog()
                }
              }}
              placeholder={translate(
                'auto.components.settings.AppearancePresetsSection.namePlaceholder',
                'e.g. Night coding'
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNameDialog(null)}>
              {translate('auto.components.settings.AppearancePresetsSection.cancel', 'Cancel')}
            </Button>
            <Button onClick={commitNameDialog} disabled={!nameDraft.trim()}>
              {nameDialog?.kind === 'rename'
                ? translate(
                    'auto.components.settings.AppearancePresetsSection.renameConfirm',
                    'Rename'
                  )
                : translate('auto.components.settings.AppearancePresetsSection.saveConfirm', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SearchableSetting>
  )
}
