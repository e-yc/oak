import { track } from '@/lib/telemetry'
import type { EventProps } from '../../../../shared/telemetry-events'

export type OakCliFeatureTipSource = EventProps<'oak_cli_feature_tip_shown'>['source']
export type OakCliFeatureTipSetupResult = EventProps<'oak_cli_feature_tip_setup_result'>['result']
export type CmdJPaletteFeatureTipSource = EventProps<'cmd_j_palette_feature_tip_shown'>['source']

export function getOakCliFeatureTipTelemetrySource(value: unknown): OakCliFeatureTipSource {
  return value === 'app_open' ? 'app_open' : 'manual'
}

export function trackOakCliFeatureTipShown(source: OakCliFeatureTipSource): void {
  track('oak_cli_feature_tip_shown', { source })
}

export function trackOakCliFeatureTipSetupClicked(source: OakCliFeatureTipSource): void {
  track('oak_cli_feature_tip_setup_clicked', { source })
}

export function trackOakCliFeatureTipSetupResult(
  source: OakCliFeatureTipSource,
  result: OakCliFeatureTipSetupResult
): void {
  track('oak_cli_feature_tip_setup_result', { source, result })
}

export function trackCmdJPaletteFeatureTipShown(source: CmdJPaletteFeatureTipSource): void {
  track('cmd_j_palette_feature_tip_shown', { source })
}

export function trackCmdJPaletteFeatureTipAcknowledged(source: CmdJPaletteFeatureTipSource): void {
  track('cmd_j_palette_feature_tip_acknowledged', { source })
}
