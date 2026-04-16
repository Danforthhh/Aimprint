#!/usr/bin/env node
/**
 * Aimprint Sync Agent
 * Scans ~/.claude/projects/, parses JSONL session logs, classifies sessions,
 * and pushes new records to the Aimprint Cloudflare Worker.
 *
 * Usage: npm run sync
 * Config: sync/.env  (WORKER_URL, SYNC_TOKEN)
 */

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { loadCursors, saveCursors } from './cursor'
import { classify, classifyRequest, type ClassifyInput, type ToolCounts } from './classifier'

// ── Load env ──────────────────────────────────────────────────────────────────

const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
}

const WORKER_URL = process.env['WORKER_URL']
const SYNC_TOKEN = process.env['SYNC_TOKEN']

if (!WORKER_URL || !SYNC_TOKEN) {
  console.error('Error: WORKER_URL and SYNC_TOKEN must be set in sync/.env')
  process.exit(1)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')
const MACHINE = os.hostname()
const BATCH_SIZE = 100

// ── Pricing (same as worker) ──────────────────────────────────────────────────

function estimateCost(model: string, input: number, output: number, cacheRead: number, cacheCreation: number): number {
  const p: Record<string, [number, number, number, number]> = {
    'claude-opus-4-6':   [15.00, 75.00, 1.50,  18.75],
    'claude-sonnet-4-6': [ 3.00, 15.00, 0.30,   3.75],
    'claude-haiku-4-5':  [ 0.80,  4.00, 0.08,   1.00],
  }
  const [pi, po, pr, pc] = p[model] ?? [3.00, 15.00, 0.30, 3.75]
  return (input * pi + output * po + cacheRead * pr + cacheCreation * pc) / 1_000_000
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

  const fd = fs.openSync(filePath, 'r')
  const stream = fs.createReadStream(filePath, { start: offset, fd, autoClose: true })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const records = new Map<string, TokenRecord>()
  const sessions = new Map<string, SessionAccum>()
  let newOffset = offset
  // Track last user message per session for per-request classification context
  const lastUserMessage = new Map<string, string>()

  for await (const line of rl) {
    newOffset += Buffer.byteLength(line + '\n')
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
        if (!sess.firstMessageAt || d.timestamp! < sess.firstMessageAt) sess.firstMessageAt = d.timestamp
        if (!sess.lastMessageAt  || d.timestamp! > sess.lastMessageAt)  sess.lastMessageAt  = d.timestamp

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
            cost_usd:      estimateCost(sess.model, input, output, cacheR, cacheC),
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

  // Scan all project dirs
  for (const projectDir of fs.readdirSync(CLAUDE_PROJECTS_DIR)) {
    const fullDir = path.join(CLAUDE_PROJECTS_DIR, projectDir)
    if (!fs.statSync(fullDir).isDirectory()) continue

    for (const file of fs.readdirSync(fullDir)) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = path.join(fullDir, file)
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
            if (v.firstMessageAt && (!existing.firstMessageAt || v.firstMessageAt < existing.firstMessageAt))
              existing.firstMessageAt = v.firstMessageAt
            if (v.lastMessageAt && (!existing.lastMessageAt || v.lastMessageAt > existing.lastMessageAt))
              existing.lastMessageAt = v.lastMessageAt
          }
        }
        cursors[filePath] = newOffset
      } catch (e) {
        console.warn(`  Warning: could not parse ${filePath}: ${e}`)
      }
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
