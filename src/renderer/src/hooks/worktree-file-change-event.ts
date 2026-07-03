import type { FsChangedPayload } from '../../../shared/types'

export const OAK_WORKTREE_FILE_CHANGE_EVENT = 'oak:worktree-file-change'

export type WorktreeFileChangeEventDetail = {
  payload: FsChangedPayload
  runtimeEnvironmentId: string | null
}
