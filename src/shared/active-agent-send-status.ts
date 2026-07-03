// Why: shared between the main-window renderer (which executes agent note
// sends) and the main process / agent PiP window (which relay send requests
// and render the outcome). Lives in shared so the main process can type the
// relay result without importing renderer code.
export type ActiveAgentNotesSendStatus =
  | 'sent'
  | 'empty'
  | 'no-active-terminal'
  | 'no-agent'
  | 'permission'
  | 'status-unavailable'
  | 'not-ready'
  | 'not-writable'
  | 'partial-submit-failed'
