import '../assets/main.css'
// Why: registers the global window.agentPip type for this entry's module graph.
import type {} from '../../../preload/agent-pip-api-types'

import ReactDOM from 'react-dom/client'
import { applyDocumentTheme } from '../lib/document-theme'
import { setRendererUiLanguage } from '../i18n/i18n'
import { AgentPipApp } from './AgentPipApp'

// Why: this entry is intentionally store-free — it must not import anything
// that transitively reaches useAppStore or window.api, both of which only
// exist in the main window. Theme + language come from a one-shot init state.
async function bootstrap(): Promise<void> {
  const initState = await window.agentPip.getInitState().catch(() => null)
  if (initState?.platform === 'darwin') {
    // Why: the window carries macOS vibrancy; this switches the CSS surfaces
    // to translucent so the glass shows through (see main.css agent-pip block).
    document.documentElement.dataset.agentPipVibrancy = 'true'
  }
  const theme = initState?.theme ?? 'system'
  applyDocumentTheme(theme, { disableTransitions: false })
  if (theme === 'system') {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', () => applyDocumentTheme('system'))
  }
  if (initState) {
    await setRendererUiLanguage(initState.uiLanguage).catch(() => {})
  }
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<AgentPipApp />)
}

void bootstrap()
