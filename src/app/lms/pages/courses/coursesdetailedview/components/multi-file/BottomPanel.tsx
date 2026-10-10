"use client"

// Two-tab bottom panel for the multi-file code editor: Terminal + Test Result.
//
// - Terminal hosts the interactive RunTerminal exactly as before; state
//   (termLines/stdin/awaitingInput) is owned by the parent and passed through
//   so switching tabs is pure UI — no output is dropped.
// - Test Result renders the last Submit answer response: a summary chip
//   (Accepted / Wrong answer / Partial / Compilation error / Runtime error /
//   Time limit / Submission failed / Evaluating), then a row of Case
//   selectors, then Input / Expected / Your output for the selected case.
//   Hidden cases never reveal the trainer's input/expected; the student's
//   own output is safe to show (helps debug format mismatches).

import React from "react"
import {
  ClipboardCheck, Copy, CheckCircle2, XCircle, AlertTriangle,
  Loader2, RefreshCw, Sparkles, TerminalSquare, Trash2, X, Maximize2, Minimize2,
} from "lucide-react"
import RunTerminal, { type TermLine } from "./RunTerminal"

export type SubmitStatus =
  | 'evaluating'
  | 'accepted'
  | 'wrong-answer'
  | 'partial'
  | 'compilation-error'
  | 'runtime-error'
  | 'time-limit'
  | 'submission-failed'

export interface TestResultCase {
  index: number
  hidden: boolean
  passed: boolean
  // `unlocked` — for hidden cases only. Server sets true once every visible
  // case has passed AND every prior hidden case has passed too (progressive
  // reveal). Non-hidden cases are always effectively unlocked; the client
  // treats missing flag as `true` for visible cases.
  unlocked?: boolean
  /**
   * AI mode only. 'question' = the trainer authored this case, 'ai' = the
   * grader generated it. Drives the chip label so a student can tell the two
   * apart; absent for Test Case scoring (every case is trainer-authored).
   */
  source?: 'question' | 'ai'
  /** AI mode only: the grader's one-line reason for its verdict. */
  comment?: string
  input: string
  expectedOutput: string
  actualOutput: string
  errorMessage?: string
  runtimeMs?: number | null
}

export interface TestResultState {
  status: SubmitStatus
  message?: string
  cases: TestResultCase[]
  passedCount?: number
  totalCount?: number
  runtimeMs?: number | null
  memoryKb?: number | null
  score?: number | null
  maxMarks?: number | null
  errorDetail?: string
  /**
   * Present only when the exercise is graded by AI. Adds the parameter
   * breakdown (which criteria the trainer selected, what the grader gave
   * each one) and the score allocation (how the two halves add up to the
   * total) underneath the same summary + case list Test Case scoring uses.
   */
  ai?: AiResultInfo
}

/** One selected evaluation criterion, as the AI grader scored it. */
export interface AiCriterionResult {
  key: string
  label: string
  /** 0-100, the grader's rating on this dimension. */
  percentage: number
  /** Marks awarded = maxScore x percentage/100. */
  score: number
  /** Marks this single criterion could contribute. */
  maxScore: number
  comment?: string
}

export interface AiResultInfo {
  criteria: AiCriterionResult[]
  /** Marks each criterion can contribute (= criteria half / criteria count). */
  perCriterionMax: number
  /** Marks earned from the criteria half. */
  criteriaPortion: number
  /** Marks earned from the test-case half. */
  testCasePortion: number
  /** Share of maxMarks the criteria half is worth, 0-100. */
  criteriaWeightPct: number
  /** Share of maxMarks the test-case half is worth, 0-100. */
  testCaseWeightPct: number
  passedTestCases: number
  totalTestCases: number
  model?: string
  failed?: boolean
}

interface BottomPanelProps {
  onToggleMaximize?: () => void
  maximized?: boolean
  onClose?: () => void
  activeTab: 'terminal' | 'test-result'
  onTabChange: (t: 'terminal' | 'test-result') => void
  testResult: TestResultState | null
  /**
   * Which surface this panel IS.
   *   'test-result' (default) — Test Case / AI grading: status summary, case
   *                             chips, per-case detail, AI breakdown.
   *   'terminal'              — Manual grading: nothing is evaluated, so the
   *                             panel is a plain console. The student pastes a
   *                             test case into stdin, presses Run, and reads
   *                             the raw output. No pass/fail, no counts, no
   *                             score.
   *   'both'                  — Test Case / AI grading with the live
   *                             interactive compiler on: Terminal (Run) and
   *                             Test Result (Run tests) as two tabs;
   *                             `activeTab` picks the one shown.
   */
  mode?: 'test-result' | 'terminal' | 'both'
  /**
   * Live interactive compiler: the terminal takes input line by line while
   * the program runs, so the batch stdin box is not shown.
   */
  liveTerminal?: boolean
  /** Live terminal: Ctrl+C stops the running program. */
  onStopRun?: () => void
  // Terminal
  termLines: TermLine[]
  running: boolean
  stdin: string
  lastRuntime: number | null
  setStdin: (v: string) => void
  onClearTerm: () => void
  interactive: boolean
  awaitingInput: boolean
  inputPrompt: string
  onSubmitInput: (text: string) => void
  // Test Result
  selectedCaseIndex: number
  onSelectCase: (i: number) => void
  onRetrySubmit?: () => void
  isSubmitting?: boolean
}

const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif"

// Status → { label, tone, Icon }. Tones map to green / amber / red / slate so
// we never rely on color alone — the icon + label carry the meaning.
const STATUS_META: Record<SubmitStatus, { label: string; tone: 'ok' | 'bad' | 'warn' | 'info'; Icon: any }> = {
  evaluating:          { label: 'Evaluating your answer…', tone: 'info', Icon: Loader2 },
  accepted:            { label: 'Accepted',                tone: 'ok',   Icon: CheckCircle2 },
  'wrong-answer':      { label: 'Wrong answer',            tone: 'bad',  Icon: XCircle },
  partial:             { label: 'Partially accepted',      tone: 'warn', Icon: AlertTriangle },
  'compilation-error': { label: 'Compilation error',       tone: 'bad',  Icon: XCircle },
  'runtime-error':     { label: 'Runtime error',           tone: 'bad',  Icon: XCircle },
  'time-limit':        { label: 'Time limit exceeded',     tone: 'warn', Icon: AlertTriangle },
  'submission-failed': { label: 'Submission failed',       tone: 'bad',  Icon: XCircle },
}

const TONE: Record<'ok' | 'bad' | 'warn' | 'info', { fg: string; bg: string; border: string }> = {
  ok:   { fg: '#046C4E', bg: '#ECFDF3', border: '#BBF7D0' },
  bad:  { fg: '#B42318', bg: '#FEF3F2', border: '#FBD3CE' },
  warn: { fg: '#B54708', bg: '#FFFAEB', border: '#F5DFA8' },
  info: { fg: '#175CD3', bg: '#EFF6FF', border: '#BFDBFE' },
}

export default function BottomPanel(props: BottomPanelProps) {
  const {
    mode = 'test-result', activeTab, liveTerminal = false, onStopRun,
    onTabChange, testResult, onClose, onToggleMaximize, maximized,
    termLines, running, stdin, lastRuntime, setStdin, onClearTerm,
    interactive, awaitingInput, inputPrompt, onSubmitInput,
    selectedCaseIndex, onSelectCase, onRetrySubmit, isSubmitting,
  } = props

  const bothTabs = mode === 'both'
  // The surface shown right now: fixed by the mode, or the active tab.
  const isTerminal = bothTabs ? activeTab === 'terminal' : mode === 'terminal'
  const isEval = testResult?.status === 'evaluating'

  const copyResult = async () => {
    if (!testResult) return
    const lines: string[] = []
    const meta = STATUS_META[testResult.status]
    lines.push(`Status: ${meta.label}`)
    if (typeof testResult.passedCount === 'number' && typeof testResult.totalCount === 'number') {
      lines.push(`Cases passed: ${testResult.passedCount} / ${testResult.totalCount}`)
    }
    if (typeof testResult.score === 'number' && typeof testResult.maxMarks === 'number') {
      lines.push(`Score: ${testResult.score} / ${testResult.maxMarks}`)
    }
    if (testResult.runtimeMs != null) lines.push(`Runtime: ${testResult.runtimeMs} ms`)
    if (testResult.ai) {
      const ai = testResult.ai
      lines.push('')
      lines.push(`AI evaluation${ai.model ? ` (${ai.model})` : ''}`)
      lines.push(`Test cases (${ai.testCaseWeightPct}% of marks): ${ai.testCasePortion}`)
      lines.push(`Criteria (${ai.criteriaWeightPct}% of marks): ${ai.criteriaPortion}`)
      ai.criteria.forEach((c) => {
        lines.push(`  • ${c.label}: ${c.percentage}% → ${c.score} / ${c.maxScore}`)
      })
    }
    try { await navigator.clipboard.writeText(lines.join('\n')) } catch { /* silent */ }
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontFamily: FONT }}>
      {/* Tab strip */}
      <div
        role="tablist"
        aria-label="Bottom output panel"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px', borderBottom: '1px solid #D9E1EA', background: '#F7F9FB',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Which tabs is a property of the exercise: a graded exercise
              shows Test Result, a Manual one shows Terminal, and a graded one
              with the live interactive compiler shows both. The strip stays
              either way so the panel reads as a labeled surface and the
              right-hand action has a home. */}
          {(bothTabs || isTerminal) && (
            <TabButton id="terminal" active={isTerminal} onClick={() => onTabChange('terminal')}>
              <TerminalSquare size={12} style={{ color: '#FF641A' }} />
              Terminal
            </TabButton>
          )}
          {(bothTabs || !isTerminal) && (
            <TabButton id="test-result" active={!isTerminal} onClick={() => onTabChange('test-result')}>
              <ClipboardCheck size={12} style={{ color: '#FF641A' }} />
              Test results
            </TabButton>
          )}
        </div>

        {/* Right-side action — Clear in terminal mode, Copy results otherwise. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isTerminal ? (
            <button
              type="button"
              onClick={onClearTerm}
              disabled={termLines.length === 0}
              title="Clear terminal"
              aria-label="Clear terminal output"
              style={{ ...smallBtn, opacity: termLines.length === 0 ? 0.5 : 1 }}
            >
              <Trash2 size={11} /> Clear
            </button>
          ) : (
            <button
              type="button"
              onClick={copyResult}
              disabled={!testResult || isEval}
              title="Copy results"
              aria-label="Copy results summary"
              style={{ ...smallBtn, opacity: (!testResult || isEval) ? 0.5 : 1 }}
            >
              <Copy size={11} /> Copy results
            </button>
          )}
          {onToggleMaximize && <button type="button" onClick={onToggleMaximize} title={maximized ? "Restore output panel" : "Maximize output panel"} aria-label={maximized ? "Restore output panel" : "Maximize output panel"} style={smallBtn}>{maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>}
          {onClose && <button type="button" onClick={onClose} title="Close output panel" aria-label="Close output panel" style={smallBtn}><X size={15} /></button>}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <div
          role="tabpanel"
          id={isTerminal ? 'bp-panel-terminal' : 'bp-panel-test-result'}
          aria-labelledby={isTerminal ? 'bp-tab-terminal' : 'bp-tab-test-result'}
          style={{ flex: 1, minWidth: 0, display: 'block' }}
        >
          {isTerminal ? (
            <RunTerminal
              lines={termLines}
              running={running}
              stdin={stdin}
              lastRuntimeMs={lastRuntime}
              onStdinChange={setStdin}
              onClear={onClearTerm}
              interactive={interactive}
              awaitingInput={awaitingInput}
              inputPrompt={inputPrompt}
              onSubmitInput={onSubmitInput}
              live={liveTerminal}
              onStop={onStopRun}
            />
          ) : (
            <TestResultView
              state={testResult}
              selectedIndex={selectedCaseIndex}
              onSelect={onSelectCase}
              onRetry={onRetrySubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 26, padding: '0 10px', borderRadius: 6,
  border: '1px solid #D9E1EA', background: '#fff', color: '#344054',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
}

function TabButton({ active, onClick, id, children }: { active: boolean; onClick: () => void; id: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      id={`bp-tab-${id}`}
      aria-selected={active}
      aria-controls={`bp-panel-${id}`}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        height: 34, padding: '0 12px', border: 'none', background: 'transparent',
        color: active ? '#172033' : '#667085', fontSize: 13, fontWeight: 600,
        borderBottom: active ? '2px solid #0F9D94' : '2px solid transparent',
        cursor: 'pointer', marginBottom: -1,
      }}
    >
      {children}
    </button>
  )
}

// ─── TestResultView ─────────────────────────────────────────────────────────

// Exported so the single-file We_Do editor can render the identical result
// view inside its own Console/Test Result tab strip, rather than nesting a
// second tab bar.
export function TestResultView({
  state, selectedIndex, onSelect, onRetry, isSubmitting,
}: {
  state: TestResultState | null
  selectedIndex: number
  onSelect: (i: number) => void
  onRetry?: () => void
  isSubmitting?: boolean
}) {
  if (!state) {
    return (
      <div style={{ padding: 20, color: '#667085', fontSize: 13 }} aria-live="polite">
        Click <b style={{ color: '#172033' }}>Run tests</b> to check your code without submitting. Results will appear here.
      </div>
    )
  }

  const isEval = state.status === 'evaluating'
  const meta = STATUS_META[state.status]
  const tone = TONE[meta.tone]
  const Icon = meta.Icon

  // Suppress the metrics line while evaluating — those numbers belong to
  // the PREVIOUS submission and would read as if the new one had already
  // been graded. The status line is enough on its own during eval.
  const summaryBits: string[] = []
  if (!isEval) {
    if (typeof state.passedCount === 'number' && typeof state.totalCount === 'number' && state.totalCount > 0) {
      summaryBits.push(`${state.passedCount} of ${state.totalCount} cases passed`)
    }
    if (state.runtimeMs != null) summaryBits.push(`Runtime ${state.runtimeMs} ms`)
    if (state.memoryKb != null) summaryBits.push(`Memory ${state.memoryKb} KB`)
    if (typeof state.score === 'number' && typeof state.maxMarks === 'number') {
      summaryBits.push(`Score ${state.score} / ${state.maxMarks}`)
    }
  }

  // Hidden cases unlock ONE BY ONE and only once every visible case has
  // passed. The server marks each case with `unlocked` (progressive: reveal
  // the first hidden case; keep revealing subsequent ones only while each
  // one passes; stop AT the first failing hidden case, which IS revealed
  // for debugging). If a later submission has any visible case failing,
  // the server sends every hidden as `unlocked: false` and nothing hidden
  // shows. Passed/total counts in the summary reflect the full case set
  // so the student can see they still have hidden cases pending.
  const visibleCases = state.cases.filter((c) => !c.hidden)
  const isUnlocked = (c: TestResultCase) => !c.hidden || c.unlocked === true
  const shownCases = state.cases.filter(isUnlocked)
  const totalHidden = state.cases.length - visibleCases.length
  const shownHidden = shownCases.length - visibleCases.length
  const hiddenPending = Math.max(0, totalHidden - shownHidden)
  const canPickCase = !isEval && shownCases.length > 0
  const clampedIndex = canPickCase ? Math.min(selectedIndex, shownCases.length - 1) : 0
  const active = canPickCase ? shownCases[clampedIndex] : null
  // Dim the previous submission's chips + detail while a new evaluation is
  // in flight so the student clearly sees the pane is "old, being replaced".
  const staleStyle: React.CSSProperties = isEval ? { opacity: 0.5, pointerEvents: 'none' } : {}

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }} aria-live="polite">
      {/* Summary */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
          }}
        >
          <Icon size={18} className={isEval ? 'animate-spin' : ''} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tone.fg }}>{state.ai ? (isEval ? 'Evaluating with Gemini…' : state.ai.failed ? 'AI evaluation unavailable' : 'AI evaluation complete') : state.totalCount && typeof state.passedCount === 'number' && ['accepted', 'partial', 'wrong-answer'].includes(state.status) ? (state.passedCount === state.totalCount ? `All ${state.totalCount} tests passed` : `${state.totalCount - state.passedCount} of ${state.totalCount} tests failed`) : meta.label}</div>
          {(state.message || summaryBits.length > 0) && (
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 3, lineHeight: 1.5 }}>
              {state.message ? state.message : ''}
              {state.message && summaryBits.length > 0 ? ' · ' : ''}
              {summaryBits.join(' · ')}
            </div>
          )}
        </div>
        {state.status === 'submission-failed' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 12px', borderRadius: 8,
              border: '1px solid #FF641A', background: '#fff', color: '#FF641A',
              fontSize: 12.5, fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            <RefreshCw size={12} /> Try again
          </button>
        )}
      </div>

      {!isEval && !state.ai?.failed && typeof state.passedCount === 'number' && typeof state.totalCount === 'number' && state.totalCount > 0 && <div className="flex flex-wrap gap-2 px-4 pb-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700"><CheckCircle2 size={14} />{state.passedCount} Passed</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-red-700"><XCircle size={14} />{Math.max(0, state.totalCount - state.passedCount)} Failed</span>
      </div>}
      {/* Error detail (compilation / runtime / submission-failed) */}
      {state.errorDetail && (
        <div style={{ margin: '0 16px 12px', padding: 12, borderRadius: 8, background: '#FEF3F2', border: '1px solid #FBD3CE' }}>
          <pre style={{ margin: 0, fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#912018', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {state.errorDetail}
          </pre>
        </div>
      )}

      {/* AI evaluation — the parameters the trainer selected, what the
          grader gave each one, and how the two halves add up to the total.
          Rendered above the case list so the "why did I get this mark?"
          answer is the first thing visible. Hidden while re-evaluating so
          the previous submission's numbers never read as the new ones. */}
      {state.ai && !isEval && <AiEvaluationBlock ai={state.ai} score={state.score} maxMarks={state.maxMarks} />}

      {/* Only unlocked cases are included, preserving server reveal rules. */}
      {shownCases.length > 0 && (
        <div style={{ padding: '0 16px 12px', overflowX: 'auto', flexShrink: 0, ...staleStyle }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }} aria-label="Test case results">
            <thead style={{ background: '#F7F9FB', color: '#475467' }}>
              <tr>{['Test case', 'Input', 'Expected output', state.ai ? 'AI verdict' : 'Your output', 'Status', ...(!state.ai ? ['Time'] : [])].map(label => <th key={label} scope="col" style={{ padding: '10px 12px', borderBottom: '1px solid #D9E1EA' }}>{label}</th>)}</tr>
            </thead>
            <tbody>{shownCases.map((c, i) => {
              const reveal = !c.hidden || c.input !== '' || c.expectedOutput !== ''
              const label = `${c.hidden ? 'Hidden case' : c.source === 'ai' ? 'AI case' : 'Case'} ${c.index + 1}`
              return <tr key={`${c.source || "question"}-${c.index}-${i}`} style={{ background: i === clampedIndex ? (c.passed ? '#ECFDF3' : '#FEF3F2') : '#fff', borderBottom: '1px solid #EAECF0' }}>
                <th scope="row" style={{ padding: '10px 12px' }}><button type="button" disabled={isEval} onClick={() => onSelect(i)} aria-pressed={i === clampedIndex} style={{ color: '#0F766E', background: 'transparent', border: 0, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</button></th>
                {[reveal ? c.input : 'Hidden', reveal ? c.expectedOutput : 'Hidden', state.ai ? (c.comment || 'No feedback provided') : c.actualOutput].map((value, column) => <td key={column} style={{ padding: '10px 12px', maxWidth: 220 }}><pre style={{ margin: 0, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 80, overflow: 'auto' }}>{value || '(empty)'}</pre></td>)}
                <td style={{ padding: '10px 12px', color: c.passed ? '#046C4E' : '#B42318', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{c.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{c.passed ? 'Passed' : 'Failed'}</span></td>
                {!state.ai && <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#667085' }}>{typeof c.runtimeMs === 'number' ? `${c.runtimeMs} ms` : '—'}</td>}
              </tr>
            })}</tbody>
          </table>
        </div>
      )}
      {hiddenPending > 0 && <div style={{ padding: '0 16px 12px', color: '#667085', fontSize: 12 }}>{hiddenPending} hidden case{hiddenPending === 1 ? '' : 's'} locked — pass the current cases to unlock the next.</div>}

      {/* Selected case detail. Hidden cases normally keep trainer input +
          expected concealed; the server unlocks them once every visible
          case has passed (an unlocked hidden case arrives with non-empty
          input/expected). Presence of those fields drives the reveal —
          no client-side rule of its own. Dimmed while evaluating so the
          student sees the details as outdated. */}
      {active && (() => {
        const revealHiddenTrainerFields =
          active.hidden && (active.input !== '' || active.expectedOutput !== '')
        const showTrainerFields = !active.hidden || revealHiddenTrainerFields
        return (
          <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #D9E1EA', ...staleStyle }}>
            <strong style={{ fontSize: 13, color: '#172033' }}>Case {active.index + 1} details · {active.passed ? 'Passed' : 'Failed'}</strong>
            {active.hidden && !showTrainerFields && (
              <div style={{ fontSize: 12.5, color: '#667085', lineHeight: 1.55 }}>
                This is a hidden case. Trainer input and expected output stay concealed until every visible case passes.
              </div>
            )}
            {showTrainerFields && <Row label="Input" value={active.input} />}
            {!active.passed && !state.ai && <p style={{ margin: 0, color: '#667085', fontSize: 12 }}>Output does not match the expected result.</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {showTrainerFields && <Row label="Expected output" value={active.expectedOutput} />}
              {state.ai ? <Row label="AI verdict" value={active.comment || 'No feedback provided'} tone={active.passed ? 'ok' : 'bad'} /> : <Row label="Your output" value={active.actualOutput} tone={active.passed ? 'ok' : 'bad'} />}
            </div>
            {active.errorMessage && (
              <Row label="Error" value={active.errorMessage} tone="bad" />
            )}
          </div>
        )
      })()}
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  const border = tone === 'ok' ? '#BBF7D0' : tone === 'bad' ? '#FBD3CE' : '#E4E7EC'
  const bg     = tone === 'ok' ? '#F5FEF9' : tone === 'bad' ? '#FEF6F5' : '#F7F8FA'
  const shown = value == null || value === '' ? '(empty)' : String(value)
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </div>
      <pre
        style={{
          margin: 0, padding: '8px 10px', borderRadius: 7,
          border: `1px solid ${border}`, background: bg,
          fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: '#172033',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 160, overflow: 'auto',
        }}
      >
        {shown}
      </pre>
    </div>
  )
}

// ─── AiEvaluationBlock ───────────────────────────────────────────────────────
// Only rendered for AI-graded exercises. Two parts:
//   • Score allocation — the test-case half and the criteria half, each with
//     the marks it contributed and the share of maxMarks it is worth, then
//     the total. This is what makes an AI score auditable: a 5-mark question
//     can only ever add up to 5.
//   • Evaluation parameters — one row per criterion the trainer selected,
//     with the grader's percentage, the marks that converts to, and its
//     one-line rationale.

function AiEvaluationBlock({
  ai, score, maxMarks,
}: {
  ai: AiResultInfo
  score?: number | null
  maxMarks?: number | null
}) {
  const fmt = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toString()
  const critAvg = ai.criteria.length > 0
    ? Math.round(ai.criteria.reduce((sum, c) => sum + c.percentage, 0) / ai.criteria.length)
    : 0
  const criteriaMax = ai.criteria.reduce((sum, c) => sum + c.maxScore, 0)
  const testCaseMax = typeof maxMarks === 'number' ? (maxMarks * ai.testCaseWeightPct) / 100 : null

  return (
    <div style={{
      margin: '0 16px 12px', borderRadius: 10,
      border: '1px solid #E4E7EC', background: '#FBFCFD', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderBottom: '1px solid #E9EDF2', background: '#F5F7FA',
      }}>
        <Sparkles size={13} style={{ color: '#6957E5' }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#172033' }}>AI evaluation · Gemini</span>
        <span style={{ flex: 1 }} />
        {ai.model && (
          <span style={{ fontSize: 11, color: '#8A94A6' }} title="Model used to grade this answer">
            {ai.model}
          </span>
        )}
      </div>

      {ai.failed ? (
        <div style={{ padding: '10px 12px', fontSize: 12.5, color: '#B54708', lineHeight: 1.55 }}>
          Gemini could not complete this evaluation. Retry the check or submit your answer for trainer review.
        </div>
      ) : (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#667085', lineHeight: 1.5 }}>Gemini reviews your code against test cases and the selected criteria. AI verdicts are model assessments; use Run to see actual program output in Terminal.</p>
          {/* Score allocation */}
          <div>
            <SectionCaption>Score allocation</SectionCaption>
            <AllocationRow
              label="Test cases"
              detail={ai.totalTestCases > 0
                ? `${ai.passedTestCases} of ${ai.totalTestCases} passed`
                : 'no test cases'}
              weightPct={ai.testCaseWeightPct}
              earned={fmt(ai.testCasePortion)}
              outOf={testCaseMax != null ? fmt(testCaseMax) : null}
            />
            <AllocationRow
              label="Criteria"
              detail={ai.criteria.length > 0
                ? `${ai.criteria.length} parameter${ai.criteria.length === 1 ? '' : 's'} · avg ${critAvg}%`
                : 'no parameters selected'}
              weightPct={ai.criteriaWeightPct}
              earned={fmt(ai.criteriaPortion)}
              outOf={fmt(criteriaMax)}
            />
            {typeof score === 'number' && typeof maxMarks === 'number' && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 6, paddingTop: 7, borderTop: '1px solid #E9EDF2',
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#172033' }}>Total awarded</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#046C4E' }}>
                  {fmt(score)} / {fmt(maxMarks)}
                </span>
              </div>
            )}
          </div>

          {/* Per-criterion rows */}
          {ai.criteria.length > 0 && (
            <div>
              <SectionCaption>Evaluation parameters</SectionCaption>
              <div style={{ overflowX: 'auto' }}>
                <table aria-label="AI evaluation criteria" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead style={{ background: '#F5F7FA', color: '#475467' }}>
                    <tr>{['Criterion', 'Rating', 'Marks', 'Gemini feedback'].map(label => <th key={label} scope="col" style={{ padding: '8px 10px', borderBottom: '1px solid #E4E7EC' }}>{label}</th>)}</tr>
                  </thead>
                  <tbody>{ai.criteria.map(c => <tr key={c.key} style={{ borderBottom: '1px solid #E4E7EC' }}>
                    <th scope="row" style={{ padding: '8px 10px', color: '#172033', fontWeight: 600 }}>{c.label}</th>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c.percentage}%</td>
                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{fmt(c.score)} / {fmt(c.maxScore)}</td>
                    <td style={{ padding: '8px 10px', color: '#667085', minWidth: 180, overflowWrap: 'anywhere' }}>{c.comment || 'No feedback provided'}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCaption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: '#8A94A6',
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function AllocationRow({
  label, detail, weightPct, earned, outOf,
}: {
  label: string
  detail: string
  weightPct: number
  earned: string
  outOf: string | null
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '3px 0', fontSize: 12.5,
    }}>
      <span style={{ fontWeight: 600, color: '#172033' }}>{label}</span>
      <span style={{ fontSize: 11.5, color: '#667085', flex: 1, minWidth: 0 }}>
        {detail} · worth {weightPct}% of the marks
      </span>
      <span style={{ fontWeight: 600, color: '#344054', whiteSpace: 'nowrap' }}>
        {earned}{outOf != null ? ` / ${outOf}` : ''}
      </span>
    </div>
  )
}
