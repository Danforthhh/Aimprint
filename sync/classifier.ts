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
  | 'random'
  | 'other'

export const ALL_CATEGORIES: Category[] = [
  'code_writing', 'code_process', 'quality', 'deep_analysis',
  'refinement', 'planning', 'random', 'other',
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

const RE_BASH_OPS   = /docker|kubectl|helm|wrangler|terraform|npm run (build|deploy|start|prod)|yarn build|gh pr|git push|git tag|release/i
const RE_BASH_QUAL  = /jest|vitest|npm test|yarn test|eslint|prettier|lint|coverage/i

// ── Main classifier ────────────────────────────────────────────────────────────

export function classify(input: ClassifyInput): Category {
  const { firstMessage = '', toolCounts, bashCommands, durationMinutes, requestCount } = input

  // Very short session with few tools → random
  if (requestCount <= 3 && toolCounts.total <= 2 && durationMinutes < 3) return 'random'

  // Bash command pattern analysis
  const bashAll = bashCommands.join(' ')
  const bashHasOps  = RE_BASH_OPS.test(bashAll)
  const bashHasQual = RE_BASH_QUAL.test(bashAll)

  // Score signals
  const signals = {
    planning:    (toolCounts.todo > 0 ? 3 : 0) + (RE_PLANNING.test(firstMessage) ? 2 : 0),
    code_process: (bashHasOps ? 4 : 0) + (RE_OPS.test(firstMessage) ? 2 : 0),
    quality:     (bashHasQual ? 4 : 0) + (RE_QUALITY.test(firstMessage) ? 2 : 0),
    refinement:  (RE_REFINEMENT.test(firstMessage) ? 3 : 0) + (toolCounts.edit > 2 && toolCounts.bash === 0 ? 1 : 0),
    deep_analysis: (toolCounts.read > 8 && toolCounts.edit < 2 ? 4 : 0) + (RE_ANALYSIS.test(firstMessage) ? 2 : 0),
    code_writing: (toolCounts.edit > 3 ? 3 : 0) + (RE_WRITING.test(firstMessage) ? 2 : 0) + (RE_DEBUG.test(firstMessage) ? 1 : 0),
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
