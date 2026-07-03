import type { SettingsSearchEntry } from './settings-search'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export function getAgentPipSearchEntry(): SettingsSearchEntry {
  return {
    title: translate(
      'auto.components.settings.experimental.search.agentPip.title',
      'Pinned agent stack'
    ),
    description: translate(
      'auto.components.settings.experimental.search.agentPip.description',
      'Always-on-top mini window with agent statuses and quick replies.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.0d24759f14',
        'experimental'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.agent',
        'agent'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.agents',
        'agents'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.pinned',
        'pinned'
      ),
      ...translateSearchKeyword('auto.components.settings.experimental.search.agentPip.pip', 'pip'),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.floating',
        'floating'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.alwaysOnTop',
        'always on top'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.reply',
        'reply'
      ),
      ...translateSearchKeyword(
        'auto.components.settings.experimental.search.agentPip.window',
        'window'
      )
    ]
  }
}
