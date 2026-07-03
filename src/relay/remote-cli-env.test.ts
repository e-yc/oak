import { describe, expect, it } from 'vitest'
import { pickRemoteCliEnv } from './remote-cli-env'

describe('pickRemoteCliEnv', () => {
  it('forwards SSH Oak terminal and worktree context for remote CLI calls', () => {
    expect(
      pickRemoteCliEnv({
        OAK_TERMINAL_HANDLE: 'term_ssh',
        OAK_WORKTREE_ID: 'repo::remote',
        OAK_USER_DATA_PATH: '/tmp/oak',
        PATH: '/usr/bin',
        SECRET_TOKEN: 'nope'
      })
    ).toEqual({
      OAK_TERMINAL_HANDLE: 'term_ssh',
      OAK_WORKTREE_ID: 'repo::remote',
      OAK_USER_DATA_PATH: '/tmp/oak',
      PATH: '/usr/bin'
    })
  })
})
