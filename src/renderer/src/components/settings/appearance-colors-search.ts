import type { SettingsSearchEntry } from './settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export const getInterfaceColorEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate(
      'auto.components.settings.AppearanceColorsSection.terminalBackgroundTitle',
      'Terminal Background'
    ),
    description: translate(
      'auto.components.settings.AppearanceColorsSection.terminalBackgroundDescription',
      'Override the background of the active terminal theme.'
    ),
    keywords: [
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.background',
        'background'
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.color', 'color')
    ]
  },
  {
    title: translate(
      'auto.components.settings.AppearanceColorsSection.paneColorsTitle',
      'Interface Panes'
    ),
    description: translate(
      'auto.components.settings.AppearanceColorsSection.paneColorsDescription',
      'Recolor the app background, sidebar, editor, and panels.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.appearance.search.pane', 'pane'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.workbench', 'workbench'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.customColors',
        'custom colors'
      )
    ]
  }
])
