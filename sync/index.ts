#!/usr/bin/env node
/**
 * Aimprint Sync Agent
 * Scans ~/.claude/projects/, parses JSONL session logs, classifies sessions,
 * and pushes new records to the Aimprint Cloudflare Worker.
 *
 * Usage: npx @danforthh/aimprint-sync
 * Config: ~/.aimprint  (WORKER_URL, SYNC_TOKEN)
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { loadCursors, saveCursors } from './cursor'
import { classify, classifyRequest, type ClassifyInput, type ToolCounts } from './classifier'

// ── Load env ──────────────────────────────────────────────────────────────────
// Check ~/.aimprint first (npx usage), fall back to sync/.env (git clone usage)

const ALLOWED_ENV_KEYS = new Set(['WORKER_URL', 'SYNC_TOKEN'])

const envCandidates = [
  path.join(os.homedir(), '.aimprint'),
  path.join(process.cwd(), 'sync', '.env'),
]
for (const f of envCandidates) {
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.+)$/)
      if (m && ALLOWED_ENV_KEYS.has(m[1]) && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
    break
  }
}

const WORKER_URL = process.env['WORKER_URL']
const SYNC_TOKEN = process.env['SYNC_TOKEN']

if (!WORKER_URL || !SYNC_TOKEN) {
  console.error('Error: WORKER_URL and SYNC_TOKEN are required.')
  console.error('Create ~/.aimprint with:')
  console.error('  WORKER_URL=https://your-worker.workers.dev')
  console.error('  SYNC_TOKEN=your-sync-token')
  process.exit(1)
}

// Reject non-https schemes to prevent accidental data exfiltration
try {
  const u = new URL(WORKER_URL)
  if (u.protocol !== 'https:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
    console.error(`Error: WORKER_URL must use https:// (got ${u.protocol})`)
    process.exit(1)
  }
} catch {
  console.error('Error: WORKER_URL is not a valid URL')
  process.exit(1)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')
const REAL_PROJECTS_DIR = (() => {
  try { return fs.realpathSync(CLAUDE_PROJECTS_DIR) } catch { return CLAUDE_PROJECTS_DIR }
})()
const MACHINE = os.hostname()
const BATCH_SIZE = 100

// ── Line ending detection ─────────────────────────────────────────────────────

// readline strips \r before delivering lines, so Buffer.byteLength(line + '\n')
// under-counts by 1 byte per line on CRLF files (common on Windows).
// Sample the file header to detect the actual separator size used.
function detectLineSepSize(filePath: string): 1 | 2 {
  const buf = Buffer.alloc(1024)
  let fd: number | undefined
  try {
    fd = fs.openSync(filePath, 'r')
    const n = fs.readSync(fd, buf, 0, 1024, 0)
    for (let i = 0; i < n - 1; i++) {
      if (buf[i] === 0x0d && buf[i + 1] === 0x0a) return 2
    }
    return 1
  } catch { return 1 }
  finally { if (fd !== undefined) try { fs.closeSync(fd) } catch { /* ignore */ } }
}

// ── Ticket extraction ─────────────────────────────────────────────────────────

const TICKET_RE = /\b(PROTOP-\d+|PORTV4-\d+|NODE20-\d+)\b/i

function extractTicket(branch?: string): string | undefined {
  if (!branch) return undefined
  const m = branch.match(TICKET_RE)
  return m ? m[1].toUpperCase() : undefined
}

// ── JSONL types ───────────────────────────────────────────────────────────────

interface JLine {
  type?: string
  message?: {
    role?: string
    model?: string
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
    content?: Array<{ type: string; name?: string; input?: Record<string, unknown> }>
  }
  requestId?: string
  sessionId?: string
  cwd?: string
  entrypoint?: string
  timestamp?: string
  gitBranch?: string
  isSidechain?: boolean
  userType?: string
}

// ── Session accumulator ───────────────────────────────────────────────────────

interface SessionAccum {
  sessionId: string
  cwd: string
  model: string
  entrypoint: string
  gitBranch: string
  firstMessageAt?: string
  lastMessageAt?: string
  firstMessage?: string
  toolCounts: ToolCounts
  bashCommands: string[]
  requestCount: number
}

interface TokenRecord {
  request_id: string
  session_id: string
  timestamp: string
  date: string
  machine: string
  project: string
  cwd?: string
  model: string
  entrypoint?: string
  git_branch?: string
  ticket?: string
  input_tokens: number
  output_tokens: number
  cache_read: number
  cache_creation: number
  is_sidechain: number
  cost_usd: number
  request_category: string  // '' = inherit session category at query time
}

// ── Parse a single JSONL file ─────────────────────────────────────────────────

async function parseFile(
  filePath: string,
  offset: number,
): Promise<{ records: Map<string, TokenRecord>; sessions: Map<string, SessionAccum>; newOffset: number }> {
  const stat = fs.statSync(filePath)
  if (stat.size <= offset) return { records: new Map(), sessions: new Map(), newOffset: offset }

  const sepSize = detectLineSepSize(filePath)
  const fd = fs.openSync(filePath, 'r')
  const stream = fs.createReadStream(filePath, { start: offset, fd, autoClose: true })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const records = new Map<string, TokenRecord>()
  const sessions = new Map<string, SessionAccum>()
  let newOffset = offset
  // Track last user message per session for per-request classification context
  const lastUserMessage = new Map<string, string>()

  for await (const line of rl) {
    newOffset += Buffer.byteLength(line) + sepSize
    if (!line.trim()) continue

    let d: JLine
    try { d = JSON.parse(line) } catch { continue }

    const sid = d.sessionId ?? ''
    if (!sid) continue

    // Ensure session accumulator
    if (!sessions.has(sid)) {
      sessions.set(sid, {
        sessionId: sid,
        cwd: d.cwd ?? '',
        model: '',
        entrypoint: d.entrypoint ?? '',
        gitBranch: d.gitBranch ?? '',
        toolCounts: { edit: 0, bash: 0, read: 0, todo: 0, agent: 0, total: 0 },
        bashCommands: [],
        requestCount: 0,
      })
    }
    const sess = sessions.get(sid)!

    // Update session metadata from any message
    if (d.cwd)        sess.cwd       = d.cwd
    if (d.entrypoint) sess.entrypoint = d.entrypoint
    if (d.gitBranch)  sess.gitBranch  = d.gitBranch

    // Capture first user message text + track last user message for per-request context
    if (d.type === 'user' && d.message?.role === 'user') {
      const content = d.message.content
      let msgText: string | undefined
      if (Array.isArray(content)) {
        const textBlock = content.find((b: Record<string, unknown>) => b['type'] === 'text')
        if (textBlock && 'text' in textBlock) {
          msgText = String((textBlock as Record<string, unknown>)['text']).slice(0, 500)
        }
      } else if (typeof content === 'string') {
        msgText = (content as string).slice(0, 500)
      }
      if (msgText) {
        if (!sess.firstMessage) sess.firstMessage = msgText
        lastUserMessage.set(sid, msgText)
      }
    }

    // Count tool calls (session-level totals) + collect per-turn tool info in one pass.
    // For assistant turns, this also feeds the per-request classifier below.
    const turnToolNames: string[] = []
    const turnBashCmds: string[] = []
    if (d.type === 'assistant' && d.message?.content) {
      for (const block of d.message.content) {
        if (block.type !== 'tool_use') continue
        const name = block.name ?? ''
        // Session-level accumulator
        sess.toolCounts.total++
        if (/^(Edit|Write|NotebookEdit)$/.test(name))  sess.toolCounts.edit++
        else if (name === 'Bash') {
          sess.toolCounts.bash++
          const cmd = String((block.input as Record<string, unknown>)?.['command'] ?? '')
          if (cmd) { sess.bashCommands.push(cmd.slice(0, 200)); turnBashCmds.push(cmd.slice(0, 200)) }
        }
        else if (/^(Read|Grep|Glob)$/.test(name))      sess.toolCounts.read++
        else if (name === 'TodoWrite')                  sess.toolCounts.todo++
        else if (name === 'Agent')                      sess.toolCounts.agent++
        // Per-turn list (reused by classifyRequest below)
        turnToolNames.push(name)
      }
    }

    // Token usage from assistant messages
    if (d.type === 'assistant' && d.requestId && d.message?.usage) {
      const usage = d.message.usage
      const input   = usage.input_tokens   ?? 0
      const output  = usage.output_tokens  ?? 0
      const cacheR  = usage.cache_read_input_tokens    ?? 0
      const cacheC  = usage.cache_creation_input_tokens ?? 0

      if (output > 0) {
        sess.requestCount++
        sess.model = d.message.model ?? sess.model
        const tsMs = new Date(d.timestamp!).getTime()
        if (!sess.firstMessageAt || tsMs < new Date(sess.firstMessageAt).getTime()) sess.firstMessageAt = d.timestamp
        if (!sess.lastMessageAt  || tsMs > new Date(sess.lastMessageAt).getTime())  sess.lastMessageAt  = d.timestamp

        const project = path.basename(d.cwd ?? sess.cwd ?? 'unknown')
        const ticket  = extractTicket(d.gitBranch ?? sess.gitBranch)
        const ts      = d.timestamp ?? new Date().toISOString()

        if (!records.has(d.requestId)) {
          // turnToolNames + turnBashCmds already populated by the single pass above
          const reqCategory = classifyRequest({
            toolNames: turnToolNames,
            bashCommands: turnBashCmds,
            userMessage: lastUserMessage.get(sid) ?? '',
          })

          records.set(d.requestId, {
            request_id:    d.requestId,
            session_id:    sid,
            timestamp:     ts,
            date:          ts.slice(0, 10),
            machine:       MACHINE,
            project,
            cwd:           d.cwd ?? sess.cwd,
            model:         sess.model,
            entrypoint:    d.entrypoint ?? sess.entrypoint,
            git_branch:    d.gitBranch ?? sess.gitBranch ?? undefined,
            ticket,
            input_tokens:  input,
            output_tokens: output,
            cache_read:    cacheR,
            cache_creation: cacheC,
            is_sidechain:  d.isSidechain ? 1 : 0,
            cost_usd:      0,  // worker recomputes server-side from its own pricing table
            request_category: reqCategory,
          })
        }
      }
    }
  }

  return { records, sessions, newOffset }
}

// ── POST to worker ────────────────────────────────────────────────────────────

async function postBatch(records: TokenRecord[], sessions: SessionMeta[], attempt = 1): Promise<void> {
  try {
    const res = await fetch(`${WORKER_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Token': SYNC_TOKEN! },
      body: JSON.stringify({ records, sessions }),
    })
    if (!res.ok) {
      const text = await res.text()
      // Retry on server errors (5xx), not client errors (4xx)
      if (res.status >= 500 && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
        return postBatch(records, sessions, attempt + 1)
      }
      throw new Error(`Ingest failed ${res.status}: ${text}`)
    }
    const result = await res.json() as { inserted: number; skipped: number }
    console.log(`  → inserted: ${result.inserted}, skipped: ${result.skipped}`)
  } catch (e) {
    if (attempt < 3 && e instanceof TypeError) {
      // Network error — retry with backoff
      await new Promise(r => setTimeout(r, 1000 * attempt))
      return postBatch(records, sessions, attempt + 1)
    }
    throw e
  }
}

interface SessionMeta {
  session_id: string
  category: string
  category_source: string
  first_message?: string
  tool_summary?: string
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Aimprint sync agent`)
  console.log(`Machine: ${MACHINE}`)
  console.log(`Scanning: ${CLAUDE_PROJECTS_DIR}\n`)

  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    console.error(`Directory not found: ${CLAUDE_PROJECTS_DIR}`)
    process.exit(1)
  }

  const cursors = loadCursors()
  const allRecords = new Map<string, TokenRecord>()
  const allSessions = new Map<string, SessionAccum>()

  // Scan all project dirs (top-level JSONL + subagents/ subdirectory)
  const scanDir = async (dir: string) => {
    let entries: string[]
    try { entries = fs.readdirSync(dir) } catch { return }
    for (const file of entries) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = path.join(dir, file)
      try {
        const realFilePath = fs.realpathSync(filePath)
        if (!realFilePath.startsWith(REAL_PROJECTS_DIR + path.sep)) continue
      } catch { continue }
      const offset = cursors[filePath] ?? 0
      try {
        const { records, sessions, newOffset } = await parseFile(filePath, offset)
        for (const [k, v] of records) allRecords.set(k, v)
        for (const [k, v] of sessions) {
          const existing = allSessions.get(k)
          if (!existing) {
            allSessions.set(k, v)
          } else {
            // Merge — backfill missing fields, accumulate counts
            existing.requestCount += v.requestCount
            existing.toolCounts.edit  += v.toolCounts.edit
            existing.toolCounts.bash  += v.toolCounts.bash
            existing.toolCounts.read  += v.toolCounts.read
            existing.toolCounts.todo  += v.toolCounts.todo
            existing.toolCounts.agent += v.toolCounts.agent
            existing.toolCounts.total += v.toolCounts.total
            existing.bashCommands.push(...v.bashCommands)
            if (!existing.firstMessage && v.firstMessage) existing.firstMessage = v.firstMessage
            if (!existing.model && v.model)               existing.model = v.model
            if (!existing.cwd && v.cwd)                   existing.cwd = v.cwd
            if (!existing.gitBranch && v.gitBranch)       existing.gitBranch = v.gitBranch
            if (!existing.entrypoint && v.entrypoint)     existing.entrypoint = v.entrypoint
            // Keep earliest firstMessageAt, latest lastMessageAt
            if (v.firstMessageAt && (!existing.firstMessageAt || new Date(v.firstMessageAt).getTime() < new Date(existing.firstMessageAt).getTime()))
              existing.firstMessageAt = v.firstMessageAt
            if (v.lastMessageAt && (!existing.lastMessageAt || new Date(v.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime()))
              existing.lastMessageAt = v.lastMessageAt
          }
        }
        cursors[filePath] = newOffset
      } catch (e) {
        console.warn(`  Warning: could not parse ${filePath}: ${e}`)
      }
    }
  }

  for (const projectDir of fs.readdirSync(CLAUDE_PROJECTS_DIR)) {
    const fullDir = path.join(CLAUDE_PROJECTS_DIR, projectDir)
    try { if (!fs.statSync(fullDir).isDirectory()) continue } catch { continue }
    await scanDir(fullDir)
    // Each session may have a same-named subdirectory containing subagents/
    for (const entry of fs.readdirSync(fullDir)) {
      const sessionSubDir = path.join(fullDir, entry)
      try {
        if (!fs.statSync(sessionSubDir).isDirectory()) continue
      } catch { continue }
      await scanDir(path.join(sessionSubDir, 'subagents'))
    }
  }

  console.log(`Found ${allRecords.size} new request records across ${allSessions.size} sessions`)

  if (allRecords.size === 0) {
    console.log('Nothing new to sync.')
    saveCursors(cursors)
    return
  }

  // Classify sessions
  const sessionMetas: SessionMeta[] = []
  for (const [, sess] of allSessions) {
    const duration = (() => {
      if (!sess.firstMessageAt || !sess.lastMessageAt) return 0
      const start = new Date(sess.firstMessageAt).getTime()
      const end   = new Date(sess.lastMessageAt).getTime()
      if (isNaN(start) || isNaN(end) || end < start) return 0
      return (end - start) / 60_000
    })()

    const input: ClassifyInput = {
      firstMessage: sess.firstMessage,
      toolCounts: sess.toolCounts,
      bashCommands: sess.bashCommands,
      durationMinutes: duration,
      requestCount: sess.requestCount,
    }

    sessionMetas.push({
      session_id: sess.sessionId,
      category: classify(input),
      category_source: 'auto',
      first_message: sess.firstMessage,
      tool_summary: JSON.stringify({
        edit: sess.toolCounts.edit,
        bash: sess.toolCounts.bash,
        read: sess.toolCounts.read,
        todo: sess.toolCounts.todo,
        agent: sess.toolCounts.agent,
        total: sess.toolCounts.total,
      }),
    })
  }

  // Post records in batches — always include full sessionMetas (upsert is idempotent)
  const records = Array.from(allRecords.values())
  const totalBatches = Math.ceil(records.length / BATCH_SIZE)
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    console.log(`Posting batch ${Math.floor(i / BATCH_SIZE) + 1}/${totalBatches}...`)
    await postBatch(batch, sessionMetas)
  }

  saveCursors(cursors)
  console.log('\nSync complete.')
}

main().catch(e => { console.error(e); process.exit(1) })
