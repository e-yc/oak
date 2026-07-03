import { useState } from 'react'
import { RotateCw } from 'lucide-react'
import type { GlobalSettings } from '../../../../shared/types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { isLiquidGlassAvailable } from '@/lib/liquid-glass'
import { useMountedRef } from '@/hooks/useMountedRef'
import { translate } from '@/i18n/i18n'

const isMacOS = typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')

type TerminalLiquidGlassSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

/** macOS-only switch: terminal backgrounds become translucent glass tinted
 *  with the theme background color over the window's vibrancy layer. */
export function TerminalLiquidGlassSetting({
  settings,
  updateSettings
}: TerminalLiquidGlassSettingProps): React.JSX.Element | null {
  const [relaunching, setRelaunching] = useState(false)
  const mountedRef = useMountedRef()
  // Why: compares against the live window state (not a mount snapshot) so the
  // banner stays truthful across settings pane remounts — vibrancy only
  // exists when the window was created for it.
  const pendingRestart = settings.terminalLiquidGlass === true && !isLiquidGlassAvailable()

  if (!isMacOS) {
    return null
  }

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
    <SearchableSetting
      title={translate(
        'auto.components.settings.TerminalWindowSection.terminalLiquidGlass',
        'Terminal Liquid Glass'
      )}
      description={translate(
        'auto.components.settings.TerminalWindowSection.terminalLiquidGlassDescription',
        'Render terminal backgrounds as translucent glass tinted with the theme background. Background Opacity controls the tint strength.'
      )}
      keywords={['glass', 'liquid', 'vibrancy', 'transparency', 'terminal', 'background']}
      className="space-y-3 py-2"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label>
            {translate(
              'auto.components.settings.TerminalWindowSection.terminalLiquidGlass',
              'Terminal Liquid Glass'
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.TerminalWindowSection.terminalLiquidGlassDescription',
              'Render terminal backgrounds as translucent glass tinted with the theme background. Background Opacity controls the tint strength.'
            )}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.terminalLiquidGlass ?? false}
          onClick={() => updateSettings({ terminalLiquidGlass: !settings.terminalLiquidGlass })}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            (settings.terminalLiquidGlass ?? false) ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-background shadow-sm transition-transform ${
              (settings.terminalLiquidGlass ?? false) ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {pendingRestart ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-3 py-2.5">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
              {translate(
                'auto.components.settings.TerminalWindowSection.c65bb9ce63',
                'Restart required'
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.settings.TerminalWindowSection.terminalLiquidGlassRestartDescription',
                'Restart Oak to enable terminal glass.'
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
                  'auto.components.settings.TerminalWindowSection.907131d741',
                  'Restarting…'
                )
              : translate(
                  'auto.components.settings.TerminalWindowSection.8abdab9f7c',
                  'Restart now'
                )}
          </Button>
        </div>
      ) : null}
    </SearchableSetting>
  )
}
