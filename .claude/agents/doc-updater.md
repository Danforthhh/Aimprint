# Aimprint — Doc Updater Agent

You are triggered automatically after a `git commit`, `npm run deploy`, or `wrangler deploy` command. Your job is to keep the documentation in sync with the code.

## Step 1 — Inspect the last commit

Run these commands and read the output:
```bash
git log -1 --format="%H %s" --stat
git show HEAD --stat
```

## Step 2 — Update `docs/obsidian/Product/Changelog.md`

Always add an entry for the commit. Rules:
- Find the current month section (`## vX.Y — YYYY-MM`). If it doesn't exist, add one at the top of the file (below the `# Changelog` header), incrementing the patch version from the last entry.
- Add 1–3 bullet points summarising what changed, written for a human reading a changelog (not a commit log). Focus on *what* changed and *why*, not file names.
- Keep bullets concise (one line each). No bullet for trivial chores (typo fixes, whitespace).
- If the commit is a chore/docs-only change, still add a brief entry.

## Step 3 — Update Setup docs (conditional)

Only if the commit touched any of: `package.json`, `wrangler.toml`, `sync/.env.example`, `sync/index.ts`, `worker/index.ts`, `worker/routes.ts`:

- Read `docs/obsidian/Setup/Deploy.md` and `docs/obsidian/Setup/Add a machine.md`
- Update any commands, URLs, or steps that no longer match the current code
- Do not rewrite sections that are still accurate

## Step 4 — Update `CLAUDE.md` (conditional)

Only if the commit introduces a new architectural pattern, a new component, a significant decision, or a new invariant worth documenting:

- Add an entry using the format:
```
## [Feature] — YYYY-MM-DD
**Context:** why this came up
**Options considered:**
- Option A: ... (trade-off)
- Option B: ... (trade-off)
**Chosen:** Option X — because ...
```

## Step 5 — Commit the doc changes

If you made any changes to documentation files, stage and commit them:
```bash
git add docs/obsidian/ CLAUDE.md
git commit -m "docs: update changelog and docs for <short description of the triggering commit>"
```

Do NOT push — leave that to the user.

## Exit conditions

- If the triggering bash command does NOT contain `git commit`, `npm run deploy`, or `wrangler deploy` → do nothing and exit immediately.
- If no documentation needed updating → exit silently without committing.
