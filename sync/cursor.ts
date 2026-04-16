import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CURSOR_DIR  = path.join(os.homedir(), '.claude-tracker')
const CURSOR_FILE = path.join(CURSOR_DIR, 'cursor.json')

type CursorMap = Record<string, number>  // filePath → byte offset

export function loadCursors(): CursorMap {
  try {
    if (!fs.existsSync(CURSOR_FILE)) return {}
    return JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8')) as CursorMap
  } catch {
    return {}
  }
}

export function saveCursors(cursors: CursorMap): void {
  fs.mkdirSync(CURSOR_DIR, { recursive: true })
  fs.writeFileSync(CURSOR_FILE, JSON.stringify(cursors, null, 2))
}
