# Terminal3 Scheduler — לוח זמנים טרמינל 3

@AGENTS.md

## Scope
אפליקציה זו בלבד. לא לטעון או לסרוק אפליקציות אחרות.
מידע כללי על MyDynamics: `../../Claude/ARCHITECTURE.md`, `../../Claude/APPS.md`

## על האפליקציה
ניהול לוח זמנים לפרויקט טרמינל 3 — Gantt, תלויות, baselines, רכש, דוחות שבועיים.
הגרסה המתקדמת ביותר של כלי לוח הזמנים.
URL: https://terminal3-scheduler-nine.vercel.app/

## Stack
Next.js 16.2.6, React 19, Prisma 7.8, PostgreSQL (Neon), Tailwind 4

## ENV נדרש
- `DATABASE_URL` — Neon PostgreSQL connection string
- `APP_PASSWORD` — סיסמת כניסה
- `AUTH_SECRET` — JWT secret

## Cron
- weekly-report כל יום ראשון 06:00 (vercel.json)

