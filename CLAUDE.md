# Kenya Re Corporate Calendar

A corporate event publishing system for Kenya Re (subsidiaries in Kenya, Zambia,
Ivory Coast). Anyone with an account can propose an event; admins/superadmins
approve or reject it; the public calendar shows only Approved events, filtered
by audience and department.

## Stack
- Next.js (App Router, TypeScript, `src/` dir) + Tailwind v4
- shadcn/ui components in `src/components/ui` (base-ui primitives — use the
  `render={<Element/>}` prop for polymorphism, **not** Radix's `asChild`)
- MongoDB via Mongoose, connection helper at `src/lib/db.ts` (cached global connection — don't instantiate `mongoose.connect` elsewhere)
- Zod for all input validation — schemas live in `src/lib/validators/*`, reused by both API routes and client-side `react-hook-form` (`@hookform/resolvers/zod`)
- Auth.js v5 (`next-auth@beta`) with a Credentials provider (email + bcrypt password)
- FullCalendar (`@fullcalendar/react` + plugins) as the calendar engine — see `src/components/calendar/calendar-view.tsx`
- `date-fns-tz` for timezone conversion (organizer wall-clock → UTC on submit, UTC → viewer-local on display)
- Package manager: **pnpm** (not npm/yarn)

## Data model
`User` (role: superadmin/admin/user), `Department`, `Venue` (has its own IANA
`timezone`), `Event` (status: Draft → PendingApproval → Approved/Rejected,
Approved → Cancelled; never hard-deleted), `AuditLog` (append-only, one entry
per event mutation).

## Auth architecture — important
`src/lib/auth.config.ts` is **edge-safe**: no providers, no DB calls in
callbacks. `middleware.ts` builds its own `NextAuth(authConfig)` instance from
it, because the Edge middleware runtime can't bundle Mongoose/Node built-ins
(`tls`, etc.) — importing the full `src/lib/auth.ts` (which has the Credentials
provider + bcrypt + Mongoose) into middleware breaks the build. `src/lib/auth.ts`
extends `authConfig` with the real provider and a DB-refreshing `jwt` callback,
and is what route handlers/server components import via `auth()`.

Enums shared between server (Mongoose models, Zod validators) and client
components (forms) live in `src/lib/constants.ts`, which has zero Mongoose/Node
dependencies. Client components must import enums from there, never from
`@/models/*` — importing a model file pulls Mongoose into the browser bundle.

## Conventions
- Mongoose models: `src/models/*.ts`, guard re-registration with `models.X ?? model("X", schema)`
- API routes: parse+validate with the matching Zod schema before touching the DB; return `400` with `error.flatten()` on failure. Auth/role checks happen inside each route handler via `auth()`, not just middleware.
- Add new shadcn components with `pnpm dlx shadcn@latest add <name>`
- Forms: `useForm({ resolver: zodResolver(schema) })` + the shadcn `Form`/`FormField` components
- Event visibility (who sees which events) is centralized in `src/lib/event-visibility.ts` — reuse it rather than re-deriving the audience/department/status logic per route
- Every event status transition (submit/approve/reject/edit/cancel) writes an `AuditLog` entry via `writeAuditLog()` in `src/models/audit-log.ts`

## Running locally
```bash
docker compose up --build   # app on :3000, mongo on :27017
docker compose exec app pnpm seed   # or run `pnpm seed` locally against MONGODB_URI
```
or without Docker:
```bash
cp .env.example .env.local  # set MONGODB_URI, AUTH_SECRET, SEED_SUPERADMIN_EMAIL/PASSWORD
pnpm install
pnpm seed   # creates the initial superadmin user (idempotent)
pnpm dev
```

## Environment
- `MONGODB_URI` — required
- `AUTH_SECRET` — required by Auth.js (generate with `pnpm dlx auth secret`)
- `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` — used only by `pnpm seed`

## Testing
```bash
pnpm test         # vitest run — unit + integration, no Docker/env vars needed
pnpm test:watch
```
- Unit tests (`*.test.ts` next to the module) cover Zod validators, the
  timezone helpers, and the FullCalendar event-mapping adapter
  (`src/lib/calendar-mapping.ts` — the allDay exclusive-end-date math).
- Integration tests spin up a real, ephemeral MongoDB via
  `mongodb-memory-server` (`src/test/mongo-setup.ts`: `startTestDatabase` /
  `clearTestDatabase` / `stopTestDatabase` in `beforeAll`/`afterEach`/`afterAll`).
  They call API route handlers (e.g. `src/app/api/events/route.ts`'s `GET`/`POST`)
  directly as plain functions with a `Request` object — no HTTP server needed.
- Route tests mock only `@/lib/auth`'s `auth` export (`vi.mock` + `vi.hoisted`)
  to control the session; everything else (Mongoose, validators, visibility
  filtering) runs for real against the in-memory DB. This is deliberate:
  `src/lib/event-visibility.ts` is security-critical (it's what stops a
  department-scoped or pending event leaking to the public calendar), so it's
  tested by actually querying Mongo, not by asserting on the filter object's
  shape.
- When adding a new API route or changing an existing one's auth/status
  logic, add a test following the pattern in
  `src/app/api/events/[id]/route.test.ts` rather than only relying on
  `src/lib/event-visibility.test.ts` — ownership/role checks live in the
  route handlers themselves, not in the shared visibility filter.
