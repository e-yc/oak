import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CornerDownLeft } from 'lucide-react'
import { AgentStateDot, agentStateLabel, type AgentDotState } from '@/components/AgentStateDot'
import { activeAgentNotesSendFailureMessage } from '@/lib/active-agent-note-send-result'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { AgentPipReplyStatus } from '../../../shared/agent-pip-types'
import type { AgentPipRow as AgentPipRowData } from './agent-pip-rows'

const SENT_FLASH_MS = 1500

type SendPhase =
  | { kind: 'idle' }
  | { kind: 'typing' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'error'; message: string }

function agentPipReplyFailureMessage(status: AgentPipReplyStatus): string {
  if (status === 'main-window-unavailable') {
    return translate('agentPip.error.mainWindowUnavailable', 'Open Orca to reply.')
  }
  if (status === 'renderer-timeout') {
    return translate(
      'agentPip.error.rendererTimeout',
      'Orca did not confirm the send. Check the terminal.'
    )
  }
  if (status === 'unknown-pane') {
    return translate('agentPip.error.unknownPane', 'This agent session is no longer available.')
  }
  return activeAgentNotesSendFailureMessage(status, { explicitTarget: true })
}

function rowDotState(row: AgentPipRowData): AgentDotState {
  if (row.closedAt !== null) {
    return 'idle'
  }
  const entry = row.payload
  if (entry.interrupted === true) {
    return 'interrupted'
  }
  if (entry.state === 'working') {
    return 'working'
  }
  if (entry.state === 'blocked') {
    return 'blocked'
  }
  if (entry.state === 'waiting') {
    return 'waiting'
  }
  return 'done'
}

function rowSecondaryText(row: AgentPipRowData): string {
  const entry = row.payload
  if (entry.interrupted === true) {
    return translate('agentPip.row.interrupted', 'Interrupted by user')
  }
  if (entry.state === 'working') {
    const toolName = entry.toolName?.trim() ?? ''
    const toolInput = entry.toolInput?.trim() ?? ''
    if (toolName && toolInput) {
      return `${toolName}: ${toolInput}`
    }
    if (toolName) {
      return toolName
    }
  }
  return entry.lastAssistantMessage?.trim() ?? ''
}

type AgentPipRowProps = {
  row: AgentPipRowData
  onFocusPane: (paneKey: string) => void
}

export function AgentPipRow({ row, onFocusPane }: AgentPipRowProps): React.JSX.Element {
  const [phase, setPhase] = useState<SendPhase>({ kind: 'idle' })
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const sentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closed = row.closedAt !== null
  const entry = row.payload
  const paneKey = entry.paneKey
  const editing = phase.kind === 'typing' || phase.kind === 'sending' || phase.kind === 'error'

  useEffect(() => {
    return () => {
      if (sentTimerRef.current) {
        clearTimeout(sentTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const beginTyping = useCallback(() => {
    if (!closed && phase.kind === 'idle') {
      setPhase({ kind: 'typing' })
    }
  }, [closed, phase.kind])

  const send = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || phase.kind === 'sending') {
      return
    }
    setPhase({ kind: 'sending' })
    const result = await window.agentPip.reply({ paneKey, text: trimmed }).catch(() => null)
    if (!result || result.status !== 'sent') {
      setPhase({
        kind: 'error',
        message: agentPipReplyFailureMessage(result?.status ?? 'renderer-timeout')
      })
      return
    }
    setText('')
    setPhase({ kind: 'sent' })
    sentTimerRef.current = setTimeout(() => {
      setPhase({ kind: 'idle' })
    }, SENT_FLASH_MS)
  }, [paneKey, phase.kind, text])

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault()
        void send()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setText('')
        setPhase({ kind: 'idle' })
      }
    },
    [send]
  )

  const dotState = rowDotState(row)
  const secondary = rowSecondaryText(row)
  const title = entry.derivedTitle ?? entry.prompt
  const stateText = closed
    ? translate('agentPip.row.sessionClosed', 'Session closed')
    : agentStateLabel(dotState)

  if (editing) {
    return (
      <div
        className="agent-pip-row agent-pip-no-drag agent-pip-row-active flex flex-col justify-center gap-0.5 px-3.5 py-1"
        data-pane-key={paneKey}
      >
        <div className="flex items-center gap-1.5">
          <AgentStateDot state={dotState} size="sm" />
          <input
            ref={inputRef}
            value={text}
            disabled={phase.kind === 'sending'}
            spellCheck={false}
            placeholder={translate('agentPip.row.replyPlaceholder', 'Reply to {{agent}}…', {
              agent: entry.agentLabel
            })}
            className="h-6 min-w-0 flex-1 bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
            onChange={(event) => {
              setText(event.target.value)
              if (phase.kind === 'error') {
                setPhase({ kind: 'typing' })
              }
            }}
            onKeyDown={handleInputKeyDown}
            onBlur={() => {
              // Why: an abandoned empty input collapses back to the status
              // row; typed text survives blur so a stray click doesn't eat it.
              if (phase.kind === 'typing' && text.trim().length === 0) {
                setPhase({ kind: 'idle' })
              }
            }}
          />
          {phase.kind === 'sending' ? (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {translate('agentPip.row.sending', 'Sending…')}
            </span>
          ) : (
            <CornerDownLeft className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
          )}
        </div>
        {phase.kind === 'error' && (
          <span className="pl-4 text-[10px] leading-tight text-red-500">{phase.message}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'agent-pip-row agent-pip-no-drag agent-pip-row-hover group flex h-7.5 cursor-text items-center gap-2 px-3.5',
        closed && 'cursor-default opacity-55'
      )}
      data-pane-key={paneKey}
      onClick={beginTyping}
      title={
        closed
          ? stateText
          : translate('agentPip.row.clickToReply', 'Click to reply — {{agent}}', {
              agent: entry.agentLabel
            })
      }
    >
      <AgentStateDot state={dotState} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[11px] leading-none">
        <span className="text-foreground/90">
          {entry.agentLabel}
          {title ? ` · ${title}` : ''}
        </span>
        <span className="text-muted-foreground/80">
          {' '}
          — {stateText}
          {secondary ? ` · ${secondary}` : ''}
        </span>
      </span>
      {phase.kind === 'sent' && (
        <span className="shrink-0 text-[10px] text-emerald-500">
          {translate('agentPip.row.sent', 'Sent')}
        </span>
      )}
      {entry.worktreeName && (
        <span className="max-w-24 shrink-0 truncate text-[10px] text-muted-foreground/60">
          {entry.worktreeName}
        </span>
      )}
      {!closed && phase.kind !== 'sent' && (
        <span className="hidden shrink-0 text-[10px] text-muted-foreground group-hover:inline">
          {translate('agentPip.row.reply', 'Reply')}
        </span>
      )}
      <button
        type="button"
        className="agent-pip-row-hover hidden size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground group-hover:flex"
        aria-label={translate('agentPip.row.openInOrca', 'Open in Orca')}
        onClick={(event) => {
          event.stopPropagation()
          onFocusPane(paneKey)
        }}
      >
        <ArrowUpRight className="size-3" aria-hidden />
      </button>
    </div>
  )
}
