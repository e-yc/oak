export const OAK_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY = '__oakFeatureInteractionSource'

export const OAK_RUNTIME_RPC_BROWSER_UI_SOURCE = 'browser-pane-ui'

export function withBrowserPaneUiRuntimeRpcSource(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      [OAK_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY]: OAK_RUNTIME_RPC_BROWSER_UI_SOURCE
    }
  }
  return {
    ...value,
    [OAK_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY]: OAK_RUNTIME_RPC_BROWSER_UI_SOURCE
  }
}

export function isBrowserPaneUiRuntimeRpcParams(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>)[OAK_RUNTIME_RPC_FEATURE_INTERACTION_SOURCE_KEY] ===
      OAK_RUNTIME_RPC_BROWSER_UI_SOURCE
  )
}
