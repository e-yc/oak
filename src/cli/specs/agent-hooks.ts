import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const AGENT_HOOK_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['agent', 'hooks', 'status'],
    summary: 'Show whether Oak-managed agent status hooks are enabled',
    usage: 'oak agent hooks status [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['oak agent hooks status', 'oak agent hooks status --json']
  },
  {
    path: ['agent', 'hooks', 'off'],
    summary: 'Disable Oak-managed agent status hooks and remove local hook entries',
    usage: 'oak agent hooks off [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['oak agent hooks off']
  },
  {
    path: ['agent', 'hooks', 'on'],
    summary: 'Enable Oak-managed agent status hooks',
    usage: 'oak agent hooks on [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    examples: ['oak agent hooks on']
  }
]
