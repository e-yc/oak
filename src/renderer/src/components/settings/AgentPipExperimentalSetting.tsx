import type { GlobalSettings } from '../../../../shared/types'
import { translate } from '@/i18n/i18n'
import { Label } from '../ui/label'
import { SearchableSetting } from './SearchableSetting'
import { getExperimentalSearchEntry } from './experimental-search'

type AgentPipExperimentalSettingProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

export function AgentPipExperimentalSetting({
  settings,
  updateSettings
}: AgentPipExperimentalSettingProps): React.JSX.Element {
  return (
    <SearchableSetting
      title={translate(
        'auto.components.settings.ExperimentalPane.agentPip.title',
        'Pinned agent stack'
      )}
      description={translate(
        'auto.components.settings.ExperimentalPane.agentPip.searchDescription',
        'Always-on-top mini window with agent statuses and quick replies.'
      )}
      keywords={getExperimentalSearchEntry().agentPip.keywords}
      className="space-y-3 py-2"
      id="experimental-agent-pip"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 shrink space-y-0.5">
          <Label>
            {translate(
              'auto.components.settings.ExperimentalPane.agentPip.title',
              'Pinned agent stack'
            )}
          </Label>
          <p className="text-xs text-muted-foreground">
            {translate(
              'auto.components.settings.ExperimentalPane.agentPip.description',
              'Adds a status-bar toggle for a small always-on-top window that lists your agent sessions across workspaces — like a video pop-out. Click a row to reply to that agent without switching back to Oak.'
            )}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.experimentalAgentPip}
          onClick={() =>
            updateSettings({
              experimentalAgentPip: !settings.experimentalAgentPip
            })
          }
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors ${
            settings.experimentalAgentPip ? 'bg-foreground' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform ${
              settings.experimentalAgentPip ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </SearchableSetting>
  )
}
