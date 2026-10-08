# PLAN.md — Ordered task list

Status: `[ ]` todo · `[~]` done, awaiting Meir's approval · `[x]` approved.
Pick the first `[ ]` task whose prerequisites are `[x]`. One task per session. Follow CLAUDE.md session protocol.

## Context (as of 2026-10-08)
- Full data lives in `neondb` (ep-little-dawn): 3 projects — "טרמינל סנטר 3 - אור יהודה" (257 tasks), "לוח זמנים תכנון" (120), "לוגיסטיקה" (104, 88 with cost, 17 with revenue). Backup: `neondb-backup-2026-10-07.sql`.
- Verified Preview: `terminal3-scheduler-o3qqitgwt-meir7.vercel.app` (on `neondb_test`) shows all 481 tasks.
- Production `terminal3-scheduler-nine.vercel.app` still on partial `schedulestudio` (185 tasks).
- terminal3-scheduler: local git commit `5e22d12`, no GitHub remote.
- External review (MyDynamics V2 review report, 2026-10-08): 87/148 requirements open; critical issues listed in tasks below.
- Old apps: 1 Terminal 3 schedule, 2 Studio schedule, 3 Lifting equipment, 4 Buyout (תמכור), 5 Supply chain, 6 Procurement search, 7 Meeting summaries, 8 Drawings.

---

## Phase 0 — Emergency: safety & stability

### [ ] T0.1 Backups + GitHub for all repos
Prereq: none.
- Install `gh` (`winget install GitHub.cli`); Meir authenticates in browser.
- For every app folder (mydynamics-v2, terminal3-scheduler, old apps): git init if missing, `.env*` in `.gitignore`, commit, private GitHub repo, push.
- `pg_dump` every DB (neondb, schedulestudio, mydynamics DB) to `backups/`.
- Create `docs/STATUS.md` in each repo (URL, DB name, last commit). Copy CLAUDE.md + docs/PLAN.md into mydynamics-v2 and terminal3-scheduler.
Done when: list of repos + backup files with sizes reported.

### [ ] T0.2 Close critical security holes
Prereq: T0.1.
- Buyout (app 4) + Lifting equipment (app 3): enable Vercel Deployment Protection (or give Meir exact manual steps). Do not delete.
- Studio (app 2): middleware must call `verifyToken` (today only checks cookie exists).
- Terminal 3: remove `emailPassword` from `GET /api/settings`; Gmail creds only in env vars. Remove hardcoded phone codes from `CostAnalysisGate`. Investigate empty `login` folder and fix before any deploy.
- Meeting summaries (app 7): local server must require auth.
- Produce list of secrets to rotate (Terminal 3 `AUTH_SECRET`, Gmail → App Password, Anthropic key if exposed, neondb_owner password on Neon — was printed in plain text in a previous chat session). Do NOT rotate — Meir approves (logs everyone out once).
Done when: each item committed, Preview deployed, report.

### [ ] T0.3 Scheduler ready for team use
Prereq: T0.2. Repo: terminal3-scheduler. Preview DB: `neondb_test`.
- Remove auto-seed entirely (`/api/auth/emails`; `src/lib/seed.ts` not imported by app).
- Remove "0 tasks → re-init/create project". Unknown projectId → project selector.
- No projectId/data in localStorage; validate against server.
- Multi-user sync per CLAUDE.md.
- Auth per CLAUDE.md (email + phone, 90-day session, autocomplete, Postgres rate limit, signature check).
- Verify every team member exists in `Recipient` with valid email + phone; report list (last 3 phone digits only).
- Lock down maintenance endpoints (`seed`, `migrate-durations`, `migrate-calendars`, `patch-ordering`): move to `scripts/`.
- Fix: deleting a task with procurement items returns 500; deleting a task leaves orphan dependencies.
- Playwright: correct/incorrect login; close + reopen browser → still logged in; edit → view stays; reload → data persists; two users concurrently → 409 message.
Done when: Preview URL + test results reported.

### [ ] T0.4 Production cut-over to one URL
Prereq: T0.3 `[x]`. Meir must explicitly say "מאושר מעבר Production" in this session.
- Show team changes in `schedulestudio` since 2026-10-05 (TaskChange, updatedAt). Meir decides what to carry over.
- Migrate approved changes to `neondb` (script, dry-run first).
- Fresh `pg_dump` of neondb.
- Production `DATABASE_URL` → neondb (this task is the approved exception). `vercel --prod`.
- Verify on `terminal3-scheduler-nine.vercel.app`: 3 projects, ≥481 tasks, all users log in, finance protected.
- Do not delete schedulestudio / neondb_test / schedule-studio.
Done when: verification reported.

### [ ] T0.5 Baseline feature
Prereq: T0.4. Baseline/BaselineTask tables are empty although the feature was requested.
- First diagnose: show code path, why save never persisted, error handling.
- Baseline = immutable snapshot (start, finish, duration) of all project tasks. Name, date, user. Multiple per project.
- Gantt: grey baseline bar under current bar. Table: variance-in-days column, colored (red = late).
- Excel export of comparison. Success message + DB verification.
- Playwright: save → reload → exists; other user sees it.

### [ ] T0.6 Show hidden data in the scheduler UI
Prereq: T0.5. Data exists in neondb but is not displayed.
- Task table/details: cost, costLogistics, costInstallation, costManagement, quotedPrice, revenue, costBreakdown, wbsStage, sdPhase — visible only to users with finance permission.
- FacadeRegion (2 records): view + filter by region in Gantt/table.
- cost-analysis page: protected by server-side permission (replaces hardcoded CostAnalysisGate from T0.2).
- Excel export includes the new columns (finance columns only for permitted users).

---

## Phase 1 — MyDynamics foundations (one schema, once)

### [ ] T1.0 Architecture plan (no code)
Prereq: T0.5.
Write `docs/architecture-plan.md`:
- 5 modules around Project: Projects · Schedule (apps 1+2) · Equipment (3) · Procurement & supply (4+5+6) · Meetings & documents (7+8).
- One schema: User, Project, ProjectMember(canViewFinance), Vendor, Task(+category), TaskDependency (table, not JSON), Baseline, Alert/AlertRule, Commitment, ChangeOrder, PaymentRequest. Money Decimal(14,2).
- Map `Recipient` (Terminal 3) → `User` (MyDynamics) without losing history.
- Data migration from neondb: script, before/after counts, rollback.
- Routes: /projects, /schedule, /equipment, /procurement, /meetings. Single login.
- Keep vs drop (see review report §5): drop/defer AI free-text search, DWG/DXF viewer, meeting audio, hardcoded project values, decorative SVGs.
- Phase order, risks, what the team sees at each step.
STOP for review.

### [ ] T1.1 MyDynamics security
Prereq: T1.0.
- Auth per CLAUDE.md (remove 30-min expiry).
- Postgres rate limit (replace in-memory `lib/rate-limit.ts`).
- User management: edit, deactivate (isActive checked every request), reset. No full phones in lists.
- Mobile drawer < 768px.
- seed: no passwords/phones in code, `update: {}`.
- Hebrew error messages, try/catch in `lib/api-utils.ts`, JWT typing in `next-auth/jwt`.
- Single entry per module (remove duplicate routes /schedule /equipment /buyout /drawings or wire them in sidebar).

### [ ] T1.2 Shared schema
Prereq: T1.1, architecture plan approved.
- Add Vendor, ProjectMember, TaskDependency, Task.category, Alert/AlertRule, Commitment, ChangeOrder, PaymentRequest; projectId on equipment orders; Decimal money.
- Backup before migration.
- Shared update library: version check + change log + periodic refresh (replace SSE `lib/realtime.ts`).

---

## Phase 2 — Projects + Schedule module

### [ ] T2.1 Project page + schedule module
Prereq: T1.2.
- Project page: tabs, dashboard with delays, budget, alerts — real data.
- Move Terminal 3 Gantt into /schedule: dependencies with install locking, cascade update on work calendar, Baseline, critical path, facade regions, P&L, weekly email, per-task procurement.
- Do not move: name-based gates, open maintenance endpoints, Terminal-3 hardcoded values.
- Migration script from neondb (dry-run, counts): 3 projects, 481 tasks, same dates.
- Old scheduler keeps running until Meir approves closing it.
- Report old vs new comparison.

### [ ] T2.2 "New project" builder from files
Prereq: T2.1.
FIRST deliver DB design + screen flow + open questions; STOP before building.
- Upload: WBS (Excel / MS Project), quotes (PDF/Excel), pricing/BOQ, aluminum spec.
- Parse with Claude API (key server-side only): facades, floors, systems, quantities, vendors, prices. Reuse Studio's Excel import with Hebrew/English header detection.
- Editable project Template: phases, dependencies, production rates (e.g. m²/crew/day), lead times per vendor. First template derived from Terminal 3.
- Review & approve screen — nothing created without approval.
- Outputs: tasks, milestones, baseline, procurement list with last-order dates, budget vs cost, logistics, Excel + PDF export.
- Uniform "copy to Excel" / "import from Excel" on every table (exceljs).
- Full isolation between projects.

---

## Phase 3 — Procurement & supply

### [ ] T3.1 Buyout module
Prereq: T2.1.
- Move buyout to /procurement: packages, quotes, normalization (lump sum / % / m² / lm), comparison, award → Commitment.
- Keep: AI PDF quote extraction, bundle calculator, margin netting. Drop: userId-from-URL separation.
- Supply statuses: pending, ordered, shipping, customs, received. "Order for task" button from Gantt.
- Open question for Meir before starting: Priority API access available? (direct link vs weekly Excel import)

---

## Phase 4 — Equipment, meetings, alerts, shutdown

### [ ] T4.1 Equipment
Equipment catalog + recommendation engine; orders linked to project and task.

### [ ] T4.2 Meetings
Summary that creates tasks with owner + due date; attachments; no local server.

### [ ] T4.3 Alerts
Alert engine + header bell; daily Vercel Cron (`CRON_SECRET` set and verified).

### [ ] T4.4 Retire old apps
List old apps/DBs/projects with recommendation. Delete NOTHING until Meir approves after one week of stable work.
