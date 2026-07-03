export const OAK_EDITOR_SAVE_DIRTY_FILES_EVENT = 'oak:editor-save-dirty-files'
export const OAK_EDITOR_PREPARE_HOT_EXIT_EVENT = 'oak:editor-prepare-hot-exit'

export type EditorSaveDirtyFilesDetail = {
  claim: () => void
  resolve: () => void
  reject: (message: string) => void
}

export type EditorPrepareHotExitDetail = EditorSaveDirtyFilesDetail
