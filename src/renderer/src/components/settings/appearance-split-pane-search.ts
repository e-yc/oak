import type { SettingsSearchEntry } from './settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export const getSplitPaneEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate(
      'auto.components.settings.appearance.search.slimStackedPaneHeaders',
      'Slim Stacked Pane Headers'
    ),
    description: translate(
      'auto.components.settings.appearance.search.slimStackedPaneHeadersDescription',
      'Collapse the tab strip of panes stacked below another pane; mouse movement reveals it.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.appearance.search.paneKeyword', 'pane'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.splitKeyword', 'split'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.headerKeyword',
        'header'
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.slimKeyword', 'slim'),
      ...translateSearchKeyword(
        'auto.components.settings.appearance.search.stackedKeyword',
        'stacked'
      ),
      ...translateSearchKeyword('auto.components.settings.appearance.search.tabsKeyword', 'tabs')
    ]
  }
])
