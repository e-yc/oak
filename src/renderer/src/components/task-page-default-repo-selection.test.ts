import { describe, expect, it } from 'vitest'
import type { Repo } from '../../../shared/types'
import {
  getDefaultTaskRepoSelection,
  getTaskProjectPickerGroups,
  getTaskProjectPickerRepos,
  normalizeTaskRepoSelection
} from './task-page-default-repo-selection'

function repo(overrides: Partial<Repo> & Pick<Repo, 'id'>): Repo {
  return {
    path: `/repos/${overrides.id}`,
    displayName: overrides.id,
    badgeColor: '#737373',
    addedAt: 100,
    kind: 'git',
    ...overrides
  }
}

describe('getDefaultTaskRepoSelection', () => {
  it('selects one source per logical GitHub project', () => {
    const selection = getDefaultTaskRepoSelection([
      repo({
        id: 'local-oak',
        upstream: { owner: 'E-yc', repo: 'Oak' }
      }),
      repo({
        id: 'ssh-oak',
        connectionId: 'builder',
        upstream: { owner: 'e-yc', repo: 'oak' }
      }),
      repo({
        id: 'other',
        upstream: { owner: 'stablyai', repo: 'other' }
      })
    ])

    expect([...selection].sort()).toEqual(['local-oak', 'other'])
  })

  it('prefers local checkout over a remote checkout for the same project', () => {
    const selection = getDefaultTaskRepoSelection([
      repo({
        id: 'ssh-oak',
        addedAt: 1,
        connectionId: 'builder',
        upstream: { owner: 'e-yc', repo: 'oak' }
      }),
      repo({
        id: 'local-oak',
        addedAt: 2,
        upstream: { owner: 'e-yc', repo: 'oak' }
      })
    ])

    expect([...selection]).toEqual(['local-oak'])
  })

  it('keeps same-named folders separate when provider identity is missing', () => {
    const selection = getDefaultTaskRepoSelection([
      repo({ id: 'local-app', displayName: 'app' }),
      repo({ id: 'ssh-app', displayName: 'app', connectionId: 'builder' })
    ])

    expect([...selection].sort()).toEqual(['local-app', 'ssh-app'])
  })

  it('uses GitHub repo icon metadata to identify legacy duplicate projects', () => {
    const selection = getDefaultTaskRepoSelection([
      repo({
        id: 'local-claude-swap',
        displayName: 'claude-swap',
        repoIcon: {
          type: 'image',
          src: 'https://github.com/stablyai.png?size=64',
          source: 'github',
          label: 'stablyai/claude-swap'
        }
      }),
      repo({
        id: 'ssh-claude-swap',
        displayName: 'claude-swap',
        connectionId: 'builder',
        repoIcon: {
          type: 'image',
          src: 'https://github.com/stablyai.png?size=64',
          source: 'github',
          label: 'StablyAI/claude-swap'
        }
      })
    ])

    expect([...selection]).toEqual(['local-claude-swap'])
  })
})

describe('getTaskProjectPickerRepos', () => {
  it('shows one picker row per logical GitHub project', () => {
    const pickerRepos = getTaskProjectPickerRepos([
      repo({
        id: 'local-oak',
        upstream: { owner: 'E-yc', repo: 'Oak' }
      }),
      repo({
        id: 'ssh-oak',
        connectionId: 'builder',
        upstream: { owner: 'e-yc', repo: 'oak' }
      }),
      repo({
        id: 'other',
        upstream: { owner: 'stablyai', repo: 'other' }
      })
    ])

    expect(pickerRepos.map((candidate) => candidate.id)).toEqual(['local-oak', 'other'])
  })

  it('uses an explicitly selected remote source as the visible project row', () => {
    const pickerRepos = getTaskProjectPickerRepos(
      [
        repo({
          id: 'local-oak',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'ssh-oak',
          connectionId: 'builder',
          upstream: { owner: 'e-yc', repo: 'oak' }
        })
      ],
      new Set(['ssh-oak'])
    )

    expect(pickerRepos.map((candidate) => candidate.id)).toEqual(['ssh-oak'])
  })

  it('collapses legacy local and SSH rows that share a GitHub repo icon identity', () => {
    const pickerRepos = getTaskProjectPickerRepos([
      repo({
        id: 'local-claude-swap',
        displayName: 'claude-swap',
        repoIcon: {
          type: 'image',
          src: 'https://github.com/stablyai.png?size=64',
          source: 'github',
          label: 'stablyai/claude-swap'
        }
      }),
      repo({
        id: 'ssh-claude-swap',
        displayName: 'claude-swap',
        connectionId: 'builder',
        repoIcon: {
          type: 'image',
          src: 'https://github.com/stablyai.png?size=64',
          source: 'github',
          label: 'StablyAI/claude-swap'
        }
      })
    ])

    expect(pickerRepos.map((candidate) => candidate.id)).toEqual(['local-claude-swap'])
  })
})

describe('getTaskProjectPickerGroups', () => {
  it('keeps all host sources under one logical project row', () => {
    const groups = getTaskProjectPickerGroups([
      repo({
        id: 'local-oak',
        upstream: { owner: 'e-yc', repo: 'oak' }
      }),
      repo({
        id: 'ssh-oak',
        connectionId: 'builder',
        upstream: { owner: 'e-yc', repo: 'oak' }
      }),
      repo({
        id: 'docs',
        upstream: { owner: 'stablyai', repo: 'docs' }
      })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      projectKey: 'github:e-yc/oak',
      repo: { id: 'local-oak' }
    })
    expect(groups[0]?.sources.map((source) => source.id)).toEqual(['local-oak', 'ssh-oak'])
    expect(groups[1]).toMatchObject({
      projectKey: 'github:stablyai/docs',
      repo: { id: 'docs' }
    })
  })

  it('uses the explicitly selected source as the project representative', () => {
    const groups = getTaskProjectPickerGroups(
      [
        repo({
          id: 'local-oak',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'ssh-oak',
          connectionId: 'builder',
          upstream: { owner: 'e-yc', repo: 'oak' }
        })
      ],
      new Set(['ssh-oak'])
    )

    expect(groups[0]?.repo.id).toBe('ssh-oak')
    expect(groups[0]?.sources.map((source) => source.id)).toEqual(['local-oak', 'ssh-oak'])
  })
})

describe('normalizeTaskRepoSelection', () => {
  it('collapses duplicate selected sources for the same logical project', () => {
    const selection = normalizeTaskRepoSelection(
      [
        repo({
          id: 'local-oak',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'ssh-oak',
          connectionId: 'builder',
          upstream: { owner: 'e-yc', repo: 'oak' }
        })
      ],
      new Set(['local-oak', 'ssh-oak'])
    )

    expect([...selection]).toEqual(['local-oak'])
  })

  it('preserves a single explicit remote source selection', () => {
    const selection = normalizeTaskRepoSelection(
      [
        repo({
          id: 'local-oak',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'ssh-oak',
          connectionId: 'builder',
          upstream: { owner: 'e-yc', repo: 'oak' }
        })
      ],
      new Set(['ssh-oak'])
    )

    expect([...selection]).toEqual(['ssh-oak'])
  })

  it('normalizes raw all-host selection to one source per logical project', () => {
    const selection = normalizeTaskRepoSelection(
      [
        repo({
          id: 'local-oak',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'ssh-oak',
          connectionId: 'builder',
          upstream: { owner: 'e-yc', repo: 'oak' }
        }),
        repo({
          id: 'docs',
          upstream: { owner: 'stablyai', repo: 'docs' }
        })
      ],
      new Set(['local-oak', 'ssh-oak', 'docs'])
    )

    expect([...selection].sort()).toEqual(['docs', 'local-oak'])
  })
})
