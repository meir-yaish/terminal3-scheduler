# CLAUDE.md — Standing rules (MyDynamics V2 + Terminal 3 scheduler)

Owner: Meir Yaish, Eshet Dynamics. Reply to Meir in Hebrew. UI text in Hebrew, RTL.
These rules override any chat request. If a request conflicts with a rule: STOP, explain the conflict, wait for explicit approval.

## Session protocol
1. At session start read: `CLAUDE.md`, `docs/PLAN.md`, `docs/STATUS.md`.
2. Work on exactly ONE task: the first task in `docs/PLAN.md` with status `[ ]` whose prerequisites are `[x]`. Unless Meir names a different task ID.
3. Before changing anything: show a short plan (files, DB impact, risk).
4. Do only that task. No unrelated "improvements".
5. Verify: `npx tsc --noEmit`, `npm run build`, Playwright tests for the task.
6. `git commit` (clear message) + `git push`. Deploy to **Preview only**.
7. Update `docs/STATUS.md` (what changed, Preview URL, last commit, open issues). Mark task `[~]` (= done, awaiting Meir's approval) in `docs/PLAN.md`.
8. Report in Hebrew: what changed, Preview URL, what Meir should check manually. **STOP.**
9. When Meir says "מאושר" → mark the task `[x]`, commit, and the session ends.

## Hard prohibitions (need explicit per-item approval from Meir)
- Never delete: Vercel deployments/projects, Neon databases/branches, tables, rows, files, folders.
- Never run: `prisma migrate reset`, `db push --force-reset`, `DROP`, `TRUNCATE`, `DELETE` without `WHERE`.
- Never run seed against a DB containing data. No auto-seed code anywhere in the app.
- Never `vercel --prod` before Meir tested the Preview and approved.
- Never change `AUTH_SECRET` or Production `DATABASE_URL`.
- Never create a new Vercel project or new database.
- Never put secrets in code, git, or API responses to the browser (passwords, API keys, Gmail password, access codes).
- Never print connection strings, passwords, tokens or API keys in chat or in commands. Refer to env var names only.
- Never "fix" a bug by telling users to clear localStorage/cache.
- Before any DB write/migration: `pg_dump` to `backups/<db>-<YYYY-MM-DD-HHmm>.sql` (outside git).

## Single source of truth
- Main app: MyDynamics V2 (`mydynamics-v2`). All tools become modules inside it.
- Scheduler until migrated: Vercel project `terminal3-scheduler`, fixed URL `terminal3-scheduler-nine.vercel.app`.
- Scheduler DB: `neondb` on Neon host `ep-little-dawn` (us-east-1) = the REAL data (3 projects, 481 tasks, finance).
- Backup-only, never write: DBs `schedulestudio`, `neondb_test`; Vercel project `schedule-studio`.
- All data loaded from the server. localStorage = view preferences only (zoom, filters). Never projectId, data, or permissions.
- No "no data → create/re-init" logic. Missing data → show error or selector.
- No project-specific hardcoding (buildings A/B, floors 1–10, scaffolds 1–30, phase lists). Comes from DB or templates.

## git
- Every repo: git + private GitHub remote. `.env*` in `.gitignore`.
- Clean `git status` before starting. Commit + push after each working step.
- Large changes on a branch; merge only after approval.

## Authentication — Meir's decision, do not change
- Username = email (case-insensitive, trimmed).
- Password = user's phone number. Stored as text (keep leading 0), compare digits only, store bcrypt hash.
- Session persists 90 days, sliding renewal on use. Signed cookie, httpOnly, secure, sameSite=lax. No 30-minute timeout.
- Login form: `autocomplete="username"` and `autocomplete="current-password"`.
- Rate limit: 5 failures → 15-minute lock, stored in Postgres (not memory).
- `proxy.ts`/middleware verifies cookie signature + expiry, not just presence.
- `isActive=false` users blocked on every request.
- Finance data: server-side permission `ProjectMember.canViewFinance`. No access codes in client code.
- Never show full phone numbers in user lists (last 3 digits only).

## Multi-user sync
- Auto refresh every 30s and on tab focus, preserving scroll/filter.
- Updates send `version`; mismatch → HTTP 409 + Hebrew message "עודכן ע״י X ב-HH:MM".
- Every change logged in `TaskChange` with user + timestamp.
- No in-memory server state (no SSE/in-memory realtime) — Vercel is serverless.

## Data rules
- Money: `Decimal(14,2)`. Never Float.
- Dates: Israeli work calendar (`calendar.ts`): Shabbat + holidays; tasks never land on non-work days.
- Every entity has `projectId`. One `Vendor` table for suppliers/subcontractors.
- One-off scripts in `scripts/`, with `--dry-run`, never called by the app.

## Code & design
- Next.js 16, React 19, Tailwind 4, Prisma 7, Zod, date-fns, lucide-react. No UI library.
- Minimal, modern, muted palette. Every action button has a matching lucide icon.
- Mobile: drawer menu below 768px.
- Every API: try/catch, valid JSON on errors, Zod validation, Hebrew error messages.
