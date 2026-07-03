import type React from 'react'
import { useState } from 'react'

import type { GlobalSettings } from '../../../../shared/types'
import type { InterfacePaneColorKey } from '../../../../shared/interface-color-overrides'
import { SearchableSetting } from './SearchableSetting'
import {
  ColorField,
  SettingsSegmentedControl,
  SettingsSubsectionHeader
} from './SettingsFormControls'
import { Button } from '../ui/button'
import { resolveEffectiveTerminalAppearance } from '@/lib/terminal-theme'
import {
  INTERFACE_PANE_DEFAULT_COLORS,
  resolveInterfaceModeIsDark
} from '@/lib/interface-color-overrides'
import { translate } from '@/i18n/i18n'

type AppearanceColorsSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
  systemPrefersDark: boolean
  forceVisiblePrimary?: boolean
}

type PaneColorRow = {
  key: InterfacePaneColorKey
  label: string
  description: string
}

function getPaneColorRows(): PaneColorRow[] {
  return [
    {
      key: 'background',
      label: translate(
        'auto.components.settings.AppearanceColorsSection.paneBackground',
        'App Background'
      ),
      description: translate(
        'auto.components.settings.AppearanceColorsSection.paneBackgroundDescription',
        'The main window canvas behind all panes.'
      )
    },
    {
      key: 'sidebar',
      label: translate('auto.components.settings.AppearanceColorsSection.paneSidebar', 'Sidebar'),
      description: translate(
        'auto.components.settings.AppearanceColorsSection.paneSidebarDescription',
        'The workspace sidebar surface.'
      )
    },
    {
      key: 'editorSurface',
      label: translate('auto.components.settings.AppearanceColorsSection.paneEditor', 'Editor'),
      description: translate(
        'auto.components.settings.AppearanceColorsSection.paneEditorDescription',
        'Code and markdown editor panes.'
      )
    },
    {
      key: 'card',
      label: translate(
        'auto.components.settings.AppearanceColorsSection.paneCards',
        'Panels & Cards'
      ),
      description: translate(
        'auto.components.settings.AppearanceColorsSection.paneCardsDescription',
        'Panels lifted off the canvas, like workspace cards.'
      )
    }
  ]
}

export function AppearanceColorsSection({
  settings,
  updateSettings,
  systemPrefersDark,
  forceVisiblePrimary = false
}: AppearanceColorsSectionProps): React.JSX.Element {
  // Default to the mode the user is looking at right now.
  const [editingMode, setEditingMode] = useState<'dark' | 'light'>(
    resolveInterfaceModeIsDark(settings.theme, systemPrefersDark) ? 'dark' : 'light'
  )

  const terminalBackgroundFallback =
    resolveEffectiveTerminalAppearance(settings, systemPrefersDark).theme?.background ?? '#000000'
  const terminalBackgroundValue = settings.terminalColorOverrides?.background ?? ''

  const modeColors = settings.interfaceColorOverrides?.[editingMode]
  const hasModeOverrides = Boolean(modeColors && Object.values(modeColors).some(Boolean))

  function updatePaneColor(key: InterfacePaneColorKey, value: string): void {
    const current = settings.interfaceColorOverrides ?? {}
    updateSettings({
      interfaceColorOverrides: {
        ...current,
        [editingMode]: { ...current[editingMode], [key]: value || undefined }
      }
    })
  }

  function resetModeOverrides(): void {
    const current = settings.interfaceColorOverrides ?? {}
    updateSettings({
      interfaceColorOverrides: { ...current, [editingMode]: undefined }
    })
  }

  const terminalBackgroundTitle = translate(
    'auto.components.settings.AppearanceColorsSection.terminalBackgroundTitle',
    'Terminal Background'
  )
  const paneColorsTitle = translate(
    'auto.components.settings.AppearanceColorsSection.paneColorsTitle',
    'Interface Panes'
  )

  return (
    <div className="space-y-2">
      <div className="divide-y divide-border/40">
        <SearchableSetting
          title={terminalBackgroundTitle}
          description={translate(
            'auto.components.settings.AppearanceColorsSection.terminalBackgroundDescription',
            'Override the background of the active terminal theme.'
          )}
          keywords={['terminal', 'background', 'color', 'custom']}
          className="space-y-2 pb-3"
          forceVisible={forceVisiblePrimary}
        >
          <SettingsSubsectionHeader title={terminalBackgroundTitle} />
          <div className="ml-4">
            <ColorField
              label={translate(
                'auto.components.settings.AppearanceColorsSection.terminalBackgroundLabel',
                'Background'
              )}
              description={translate(
                'auto.components.settings.AppearanceColorsSection.terminalBackgroundFieldDescription',
                'Applied on top of the selected terminal theme in both modes.'
              )}
              value={terminalBackgroundValue}
              fallback={terminalBackgroundFallback}
              onChange={(value) =>
                updateSettings({
                  terminalColorOverrides: {
                    ...settings.terminalColorOverrides,
                    background: value || undefined
                  }
                })
              }
            />
            {terminalBackgroundValue ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateSettings({
                    terminalColorOverrides: {
                      ...settings.terminalColorOverrides,
                      background: undefined
                    }
                  })
                }
              >
                {translate(
                  'auto.components.settings.AppearanceColorsSection.terminalBackgroundReset',
                  'Reset to theme background'
                )}
              </Button>
            ) : null}
          </div>
        </SearchableSetting>

        <SearchableSetting
          title={paneColorsTitle}
          description={translate(
            'auto.components.settings.AppearanceColorsSection.paneColorsDescription',
            'Recolor the app background, sidebar, editor, and panels.'
          )}
          keywords={['pane', 'sidebar', 'editor', 'background', 'color', 'custom', 'workbench']}
          className="space-y-3 pt-3"
          forceVisible={forceVisiblePrimary}
        >
          <div className="flex items-center justify-between gap-4">
            <SettingsSubsectionHeader title={paneColorsTitle} />
            <SettingsSegmentedControl
              value={editingMode}
              onChange={setEditingMode}
              ariaLabel={translate(
                'auto.components.settings.AppearanceColorsSection.paneColorsModeAria',
                'Choose which mode to edit pane colors for'
              )}
              options={[
                {
                  value: 'dark',
                  label: translate('auto.components.settings.AppearancePane.7d26ccabe8', 'Dark')
                },
                {
                  value: 'light',
                  label: translate('auto.components.settings.AppearancePane.fd89b5487c', 'Light')
                }
              ]}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {editingMode === 'dark'
              ? translate(
                  'auto.components.settings.AppearanceColorsSection.paneColorsDarkHint',
                  'These colors apply while Oak is in dark mode.'
                )
              : translate(
                  'auto.components.settings.AppearanceColorsSection.paneColorsLightHint',
                  'These colors apply while Oak is in light mode.'
                )}
          </p>
          <div className="ml-4 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              {getPaneColorRows().map((row) => (
                <ColorField
                  key={row.key}
                  label={row.label}
                  description={row.description}
                  value={settings.interfaceColorOverrides?.[editingMode]?.[row.key] ?? ''}
                  fallback={INTERFACE_PANE_DEFAULT_COLORS[editingMode][row.key]}
                  onChange={(value) => updatePaneColor(row.key, value)}
                />
              ))}
            </div>
            {hasModeOverrides ? (
              <Button variant="outline" size="sm" onClick={resetModeOverrides}>
                {editingMode === 'dark'
                  ? translate(
                      'auto.components.settings.AppearanceColorsSection.paneColorsResetDark',
                      'Reset dark pane colors'
                    )
                  : translate(
                      'auto.components.settings.AppearanceColorsSection.paneColorsResetLight',
                      'Reset light pane colors'
                    )}
              </Button>
            ) : null}
          </div>
        </SearchableSetting>
      </div>
    </div>
  )
}
