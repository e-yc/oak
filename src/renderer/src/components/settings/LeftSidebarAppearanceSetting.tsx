import type React from 'react'
import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import type { GlobalSettings, LeftSidebarAppearanceMode } from '../../../../shared/types'
import {
  DEFAULT_LEFT_SIDEBAR_TINT_COLOR,
  DEFAULT_LEFT_SIDEBAR_TINT_OPACITY,
  MAX_LEFT_SIDEBAR_TINT_OPACITY
} from '../../../../shared/left-sidebar-appearance'
import { isLiquidGlassAvailable } from '@/lib/liquid-glass'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'
import { Button } from '../ui/button'
import {
  ColorField,
  NumberField,
  SettingsRow,
  SettingsSegmentedControl
} from './SettingsFormControls'

const isMacOS = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

type LeftSidebarAppearanceSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function LeftSidebarAppearanceSetting({
  settings,
  updateSettings
}: LeftSidebarAppearanceSettingProps): React.JSX.Element {
  const [relaunching, setRelaunching] = useState(false)
  const mountedRef = useMountedRef()
  // Why: vibrancy is a window-creation option, so glass selected on a window
  // created without it needs a restart — unlike the mount-snapshot pattern,
  // comparing against the live window state keeps the banner truthful across
  // settings pane remounts.
  const glassPendingRestart =
    isMacOS &&
    (settings.leftSidebarAppearanceMode ?? 'default') === 'liquid-glass' &&
    !isLiquidGlassAvailable()

  const handleRelaunch = async (): Promise<void> => {
    if (relaunching) {
      return
    }
    setRelaunching(true)
    try {
      await window.api.app.relaunch()
    } catch {
      if (mountedRef.current) {
        setRelaunching(false)
      }
    }
  }

  return (
    <div className="space-y-2">
      <SettingsRow
        alignTop
        label={translate(
          'auto.components.settings.AppearancePane.leftSidebarAppearance.title',
          'Left Sidebar Appearance'
        )}
        description={translate(
          'auto.components.settings.AppearancePane.leftSidebarAppearance.rowDescription',
          'Make the left sidebar match your terminal, stay default, or use a tint.'
        )}
        control={
          <SettingsSegmentedControl<LeftSidebarAppearanceMode>
            size="sm"
            value={settings.leftSidebarAppearanceMode ?? 'default'}
            onChange={(leftSidebarAppearanceMode) => updateSettings({ leftSidebarAppearanceMode })}
            ariaLabel={translate(
              'auto.components.settings.AppearancePane.leftSidebarAppearance.title',
              'Left Sidebar Appearance'
            )}
            options={[
              {
                value: 'default',
                label: translate(
                  'auto.components.settings.AppearancePane.leftSidebarAppearance.default',
                  'Default'
                )
              },
              {
                value: 'match-terminal',
                label: translate(
                  'auto.components.settings.AppearancePane.leftSidebarAppearance.matchTerminal',
                  'Match Terminal'
                )
              },
              {
                value: 'tinted',
                label: translate(
                  'auto.components.settings.AppearancePane.leftSidebarAppearance.tinted',
                  'Tinted'
                )
              },
              // Why: glass rides on macOS window vibrancy; other platforms
              // have no equivalent surface, so the option is hidden there.
              ...(isMacOS
                ? [
                    {
                      value: 'liquid-glass' as const,
                      label: translate(
                        'auto.components.settings.AppearancePane.leftSidebarAppearance.liquidGlass',
                        'Liquid Glass'
                      )
                    }
                  ]
                : [])
            ]}
          />
        }
      />
      {glassPendingRestart ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              {translate(
                'auto.components.settings.AppearancePane.leftSidebarAppearance.liquidGlassRestartTitle',
                'Restart required'
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.settings.AppearancePane.leftSidebarAppearance.liquidGlassRestartDescription',
                'Restart Oak to enable the glass sidebar.'
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="default"
            className="shrink-0 gap-1.5"
            disabled={relaunching}
            onClick={() => void handleRelaunch()}
          >
            <RotateCw className={`size-3 ${relaunching ? 'animate-spin' : ''}`} />
            {relaunching
              ? translate(
                  'auto.components.settings.AppearancePane.leftSidebarAppearance.liquidGlassRestarting',
                  'Restarting…'
                )
              : translate(
                  'auto.components.settings.AppearancePane.leftSidebarAppearance.liquidGlassRestartNow',
                  'Restart now'
                )}
          </Button>
        </div>
      ) : null}
      {(settings.leftSidebarAppearanceMode ?? 'default') === 'tinted' ? (
        <div className="space-y-2">
          <ColorField
            label={translate(
              'auto.components.settings.AppearancePane.leftSidebarAppearance.tintColor',
              'Sidebar Tint'
            )}
            description={translate(
              'auto.components.settings.AppearancePane.leftSidebarAppearance.tintColorDescription',
              'The color mixed into the left sidebar surface.'
            )}
            value={settings.leftSidebarTintColor ?? DEFAULT_LEFT_SIDEBAR_TINT_COLOR}
            fallback={DEFAULT_LEFT_SIDEBAR_TINT_COLOR}
            onChange={(leftSidebarTintColor) => updateSettings({ leftSidebarTintColor })}
          />
          <NumberField
            label={translate(
              'auto.components.settings.AppearancePane.leftSidebarAppearance.tintOpacity',
              'Tint Strength'
            )}
            description={translate(
              'auto.components.settings.AppearancePane.leftSidebarAppearance.tintOpacityDescription',
              'Controls how strongly the tint is mixed into the sidebar.'
            )}
            value={settings.leftSidebarTintOpacity ?? DEFAULT_LEFT_SIDEBAR_TINT_OPACITY}
            defaultValue={DEFAULT_LEFT_SIDEBAR_TINT_OPACITY}
            min={0}
            max={MAX_LEFT_SIDEBAR_TINT_OPACITY}
            step={0.01}
            suffix={`0 to ${MAX_LEFT_SIDEBAR_TINT_OPACITY}`}
            onChange={(leftSidebarTintOpacity) => updateSettings({ leftSidebarTintOpacity })}
          />
        </div>
      ) : null}
    </div>
  )
}
