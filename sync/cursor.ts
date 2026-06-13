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
  // Write to a temp file then rename — rename is atomic on POSIX/NTFS, so a
  // kill mid-write can never leave cursor.json partially written/truncated.
  const tmp = CURSOR_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(cursors, null, 2))
  fs.renameSync(tmp, CURSOR_FILE)
}
