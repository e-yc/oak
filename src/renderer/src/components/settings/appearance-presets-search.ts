import type { SettingsSearchEntry } from './settings-search'
import { createLocalizedCatalog } from '@/i18n/localized-catalog'
import { translate } from '@/i18n/i18n'
import { translateSearchKeyword } from './settings-search-keywords'

export const getAppearancePresetEntries = createLocalizedCatalog((): SettingsSearchEntry[] => [
  {
    title: translate('auto.components.settings.AppearancePresetsSection.title', 'Presets'),
    description: translate(
      'auto.components.settings.AppearancePresetsSection.description',
      'Save the current appearance as a preset and switch between saved setups.'
    ),
    keywords: [
      ...translateSearchKeyword('auto.components.settings.appearance.search.preset', 'preset'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.profile', 'profile'),
      ...translateSearchKeyword('auto.components.settings.appearance.search.saveTheme', 'save theme')
    ]
  }
])
