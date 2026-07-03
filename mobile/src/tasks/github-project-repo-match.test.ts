import { describe, expect, it } from 'vitest'
import {
  filterGitHubProjectRowsForRepos,
  findRepoForGitHubProjectRepository,
  normalizeGitHubRepositorySlug
} from './github-project-repo-match'

const repos = [
  { id: 'repo-1', path: '/Users/me/oak', displayName: 'oak' },
  { id: 'repo-2', path: '/Users/me/other', displayName: 'other' }
]

describe('GitHub project repo matching', () => {
  it('normalizes owner/repo slugs case-insensitively', () => {
    expect(normalizeGitHubRepositorySlug(' StablyAI/Oak ')).toBe('stablyai/oak')
    expect(normalizeGitHubRepositorySlug('oak')).toBeNull()
    expect(normalizeGitHubRepositorySlug('stablyai/oak/extra')).toBeNull()
  })

  it('matches project rows by resolved repo slug before path/display heuristics', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/oak', repos, {
        'repo-1': { path: '/Users/me/oak', slug: 'stablyai/oak' }
      })
    ).toBe(repos[0])
  })

  it('does not pick a repo when resolved slugs are ambiguous', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/oak', repos, {
        'repo-1': { path: '/Users/me/oak', slug: 'stablyai/oak' },
        'repo-2': { path: '/Users/me/other', slug: 'stablyai/oak' }
      })
    ).toBeNull()
  })

  it('falls back to exact display/path slug matching when slug resolution is unavailable', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/oak', [
        { id: 'repo-1', path: '/Users/me/stablyai/oak', displayName: 'oak' }
      ])
    ).toEqual({ id: 'repo-1', path: '/Users/me/stablyai/oak', displayName: 'oak' })
  })

  it('normalizes Windows paths before path slug fallback matching', () => {
    expect(
      findRepoForGitHubProjectRepository('stablyai/oak', [
        { id: 'repo-1', path: 'C:\\Users\\me\\stablyai\\oak', displayName: 'oak' }
      ])
    ).toEqual({ id: 'repo-1', path: 'C:\\Users\\me\\stablyai\\oak', displayName: 'oak' })
  })

  it('does not path-match a repo whose resolved slug points somewhere else', () => {
    expect(
      findRepoForGitHubProjectRepository(
        'stablyai/oak',
        [{ id: 'repo-1', path: '/Users/me/stablyai/oak', displayName: 'oak' }],
        {
          'repo-1': { path: '/Users/me/stablyai/oak', slug: 'fork/oak' }
        }
      )
    ).toBeNull()
  })

  it('filters project rows to rows backed by open repositories', () => {
    const rows = [
      { id: 'row-1', content: { repository: 'stablyai/oak' } },
      { id: 'row-2', content: { repository: 'other/missing' } },
      { id: 'row-3', content: { repository: null } }
    ]

    expect(
      filterGitHubProjectRowsForRepos(rows, repos, {
        'repo-1': { path: '/Users/me/oak', slug: 'stablyai/oak' }
      }).map((row) => row.id)
    ).toEqual(['row-1'])
  })
})
