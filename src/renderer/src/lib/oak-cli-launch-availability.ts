import { isOakCliAvailableOnPath } from '@/lib/agent-skill-cli-prerequisite'

/**
 * Whether the `oak` CLI will resolve on PATH in the terminal an agent launch
 * is about to create. Used to gate launch-prompt hints that recommend `oak`
 * commands, so prompts never point agents at a command that cannot run.
 */
export async function isOakCliAvailableForLaunch(args: { remote: boolean }): Promise<boolean> {
  // Why: SSH worktrees always have the CLI — the relay deploys an `oak` shim
  // and the remote PTY provider prepends it to PATH. Only local launches
  // depend on the user's install state.
  if (args.remote) {
    return true
  }
  try {
    return isOakCliAvailableOnPath(await window.api.cli.getInstallStatus())
  } catch {
    return false
  }
}
