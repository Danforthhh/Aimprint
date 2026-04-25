// Session category classifier
// Fully local — reads tool call patterns and first user message.
// No external API calls. No token cost.

export type Category =
  | 'code_writing'
  | 'code_process'
  | 'quality'
  | 'deep_analysis'
  | 'refinement'
  | 'planning'
  | 'document_writing'
  | 'random'
  | 'other'

export const ALL_CATEGORIES: Category[] = [
  'code_writing', 'code_process', 'quality', 'deep_analysis',
  'refinement', 'planning', 'document_writing', 'random', 'other',
]

export interface ToolCounts {
  edit: number      // Edit, Write, NotebookEdit
  bash: number      // Bash
  read: number      // Read, Grep, Glob
  todo: number      // TodoWrite
  agent: number     // Agent, subagent spawning
  total: number
}

export interface ClassifyInput {
  firstMessage?: string
  toolCounts: ToolCounts
  bashCommands: string[]  // stdin/commands from Bash tool calls
  durationMinutes: number
  requestCount: number
}

// ── Keyword helpers ────────────────────────────────────────────────────────────

const RE_REFINEMENT = /refactor|simplif|improve|clean|optim|restructur|reorganis|reorganiz/i
const RE_QUALITY    = /test|coverage|jest|vitest|eslint|lint|review|security|audit|sonar/i
const RE_OPS        = /deploy|docker|ci\b|cd\b|pipeline|github.?action|kubernetes|k8s|helm|terraform|wrangler deploy|npm run build|npm run deploy/i
const RE_PLANNING   = /plan|prd|ticket|story|roadmap|strateg|epic|sprint|backlog|clickup|jira|milestone/i
const RE_ANALYSIS   = /explai|analys|analyz|understand|how does|what is|why |architecture|investigate|research|explore/i
const RE_WRITING    = /implement|write|create|add|build|generat|develop|code/i
const RE_DEBUG      = /fix|bug|error|crash|broken|debug|issue|problem|fail/i
const RE_DOCUMENT   = /powerpoint|presentation|slides|slide.?deck|\.pptx|word.?doc|\.docx|spreadsheet|\.xlsx|generate.*(report|document|pdf)|pptx|docx|xlsx/i

const RE_BASH_OPS   = /docker|kubectl|helm|wrangler deploy|terraform|npm run (deploy|prod)|yarn deploy|gh pr create|gh release/i
const RE_BASH_QUAL  = /jest|vitest|npm test|yarn test|eslint|prettier|lint|coverage/i
const RE_BASH_DOC   = /\.pptx\b|\.docx\b|\.xlsx\b|python-pptx/i

// ── Per-request classifier ─────────────────────────────────────────────────────

/**
 * Classify a single assistant turn based on the tools it called.
 * Returns '' (empty) when no strong signal exists — the caller should store
 * '' and resolve it to the session category at query time (hybrid approach).
 *
 * Strong signals (always returns a non-empty category):
 *   - Bash with OPS/QUAL commands
 *   - Edit / Write / NotebookEdit (code_writing)
 *   - TodoWrite (planning)
 *
 * Weak signals (fall back to '' so session context is preserved):
 *   - Read / Grep / Glob only
 *   - Pure conversation (no tools)
 */
export function classifyRequest(input: {
  toolNames: string[]
  bashCommands: string[]
  userMessage?: string
}): Category | '' {
  const { toolNames, bashCommands, userMessage = '' } = input

  // Strong: bash command signals
  if (bashCommands.some(c => RE_BASH_OPS.test(c)))  return 'code_process'
  if (bashCommands.some(c => RE_BASH_QUAL.test(c))) return 'quality'
  if (bashCommands.some(c => RE_BASH_DOC.test(c)))  return 'document_writing'

  // Strong: editing / planning tools
  if (toolNames.includes('TodoWrite')) return 'planning'
  if (toolNames.some(t => ['Edit', 'Write', 'NotebookEdit'].includes(t))) return 'code_writing'

  // Weak: read-only tools — inherit session category at query time
  if (toolNames.length > 0 && toolNames.every(t => ['Read', 'Grep', 'Glob'].includes(t))) return ''

  // No tools at all (pure conversation) — fall back to message keywords
  if (toolNames.length === 0 && userMessage) {
    if (RE_OPS.test(userMessage))        return 'code_process'
    if (RE_QUALITY.test(userMessage))    return 'quality'
    if (RE_DOCUMENT.test(userMessage))   return 'document_writing'
    if (RE_PLANNING.test(userMessage))   return 'planning'
    if (RE_REFINEMENT.test(userMessage)) return 'refinement'
    if (RE_ANALYSIS.test(userMessage))   return 'deep_analysis'
    if (RE_WRITING.test(userMessage))    return 'code_writing'
    if (RE_DEBUG.test(userMessage))      return 'code_writing'
  }

  // Weak signal — inherit session category
  return ''
}

// ── Main classifier ────────────────────────────────────────────────────────────

export function classify(input: ClassifyInput): Category {
  const { firstMessage = '', toolCounts, bashCommands, durationMinutes, requestCount } = input

  // Very short session with few tools → random
  if (requestCount <= 3 && toolCounts.total <= 2 && durationMinutes < 3) return 'random'

  // Bash command pattern analysis
  const opsCount  = bashCommands.filter(c => RE_BASH_OPS.test(c)).length
  const qualCount = bashCommands.filter(c => RE_BASH_QUAL.test(c)).length
  const totalBash = bashCommands.length || 1

  // code_process only wins if OPS commands are a significant share of bash activity
  // (prevents 1 deploy at end of a coding session from tagging the whole session)
  const opsRatio  = opsCount / totalBash
  const bashHasOps  = opsCount >= 2 || (opsCount >= 1 && opsRatio >= 0.3)
  const bashHasQual = qualCount >= 1

  // Score signals
  const docBashCount = bashCommands.filter(c => RE_BASH_DOC.test(c)).length
  const signals = {
    planning:         (toolCounts.todo > 0 ? 3 : 0) + (RE_PLANNING.test(firstMessage) ? 2 : 0),
    code_process:     (bashHasOps ? 4 : 0) + (RE_OPS.test(firstMessage) ? 2 : 0),
    quality:          (bashHasQual ? 4 : 0) + (RE_QUALITY.test(firstMessage) ? 2 : 0),
    document_writing: (docBashCount >= 1 ? 4 : 0) + (RE_DOCUMENT.test(firstMessage) ? 3 : 0),
    refinement:       (RE_REFINEMENT.test(firstMessage) ? 3 : 0) + (toolCounts.edit > 2 && toolCounts.bash === 0 ? 1 : 0),
    deep_analysis:    (toolCounts.read > 8 && toolCounts.edit < 2 ? 4 : 0) + (RE_ANALYSIS.test(firstMessage) ? 2 : 0),
    code_writing:     (toolCounts.edit > 3 ? 3 : 0) + (RE_WRITING.test(firstMessage) ? 2 : 0) + (RE_DEBUG.test(firstMessage) ? 1 : 0),
  }

  // Pick highest score
  const top = (Object.entries(signals) as [Category, number][])
    .sort((a, b) => b[1] - a[1])[0]

  if (top[1] === 0) {
    // No signals — fall back based on tool mix
    if (toolCounts.edit > 2) return 'code_writing'
    if (toolCounts.read > 5) return 'deep_analysis'
    if (requestCount <= 4) return 'random'
    return 'other'
  }

  return top[0]
}
