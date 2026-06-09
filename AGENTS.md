# PulseHR — Agent instructions

## First: install deps
Root and server each have their own `package.json`. Both need `npm install`.

| Action | Command |
|---|---|
| Frontend dev (:3000) | `npm run dev` |
| Backend dev (:4000) | `cd server && npm run dev` |
| Production build | `npm run build` (generates PWA icons + Vite build) |
| Init DB | `cd server && npm run db:init` |
| Install both | `cd server && npm install && npm install` |
| Docker full stack | `docker compose up -d` |
| Make shortcuts | `make dev` (backend only), `make install` (server deps only) |

## Project facts
- **Plain JS everywhere** — no TypeScript. Vue 3 (Composition API), Pinia, Vue Router 4, Vite 5.
- **No tests, no linter, no typechecker, no CI.**
- **No mock API.** `api.js` always calls the real backend. README mentions `USE_MOCK` but no such flag exists.
- **`.env` is tracked** (`.gitignore` lines are commented out). `server/.env` has test OTP code, VAPID keys, DB creds.
- Auth: OTP is always `111111` (`OTP_TEST_CODE`). Phone `+7 999 123-45-67` gets HR role; all others get `employee`.
- Session: token + user JSON in `localStorage` (`pulsehr_token`, `pulsehr_user`). 30-day expiry.
- 152-ФЗ consent required before first use; user redirects to `/consent` if `consentGiven` is false.
- PWA: `sw.js` + `manifest.json` in `public/`. Push subscription offered on first login.

## Notification system
- **Push**: Real VAPID via `web-push`. All other channels **mock** (console.log only).
- **Cascade**: Push → Telegram (+4h) → SMS (+8h) → Email (+7d), plus 48h/24h deadline reminders.
- **Scheduler**: Queue every 60s, reminders every 60min. Anti-spam: 5/day per user (`NOTIFY_DAILY_LIMIT`).
- `staff.txt` auto-import on server startup + every 60 min. Format: CSV with `phone,name,role,department,position` header.

## Database
- PostgreSQL via `pg.Pool` (max 20 conns, 5s timeout).
- Schema: `server/db/schema.sql` (idempotent with `IF NOT EXISTS` + migration `ALTER TABLE` patterns).
- Docker entrypoint auto-runs `db/init.js` (creates DB + schema + seeds test users).

## Known gaps (from `IMPRUVE.md`)
- Excel/CSV export: button in UI, handler missing.
- SMS provider integration not implemented.
- Telegram bot for in-chat surveys not implemented.

## Key files to read first
- `src/services/api.js` — all API calls + snake_case→camelCase conversion
- `server/services/notifier.js` — cascade scheduling logic
- `server/db/schema.sql` — full schema with indexes and migrations
- `src/stores/auth.js` — auth state + consent flow
- `IMPRUVE.md` — feature status checklist
