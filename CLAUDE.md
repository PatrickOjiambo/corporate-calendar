# Kenya Re Corporate Calendar

A corporate event publishing system for Kenya Re. **No login is required to
submit an event** — the site isn't reachable outside the Kenya Re network, so
anyone who can load it may propose one; the only thing recorded for an
anonymous submission is a best-effort IP (`Event.submitterIp`) and a required
contact email (`organizerEmail`). Admins/superadmins are the only accounts
that exist, reached by typing `/login` directly — there's no sign-in link
anywhere in the UI. Admins approve or reject submissions; the public calendar
shows only Approved events.

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
`User` (role: superadmin/admin — the `user` role still exists in the enum for
schema flexibility but nothing creates or needs one; there are no regular
logged-in accounts), `Department`, `Venue` (has its own IANA `timezone` and an
`isOnline` flag), `Event` (status: Draft → PendingApproval → Approved/Rejected,
Approved → Cancelled; never hard-deleted; `createdBy` is optional — set only
if an admin happens to submit while logged in), `AuditLog` (append-only, one
entry per event mutation; `actor` is optional for the same reason).

`src/lib/event-visibility.ts` is intentionally simple: admins see every
status, everyone else (always anonymous) sees only `status: "Approved"`.
Audience (EntireOrganization/Department/SpecificDepartments/Public) is an
informational tag only — it does **not** restrict who can view an event,
since there's no way to know an anonymous visitor's department.

Real Kenya Re departments (25, including the Zambia/Uganda/Ivory Coast
subsidiaries) and the two supported venues (**Kenya Re Academy**, **Online**)
are seeded by `scripts/seed-reference-data.ts` (`pnpm seed:data`), not
hardcoded as an enum — admins can still add more via `/admin/departments` and
`/admin/venues`. Every event requires an `organizerEmail` (contact for the
submission) and, when the selected venue's `isOnline` is true, a
`meetingLink` — the event form only shows/requires the link field once an
online venue is picked.

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
- API routes: parse+validate with the matching Zod schema before touching the DB; return `400` with `error.flatten()` on failure. Auth/role checks happen inside each route handler via `auth()`, not just middleware. `POST /api/events` is deliberately open to anyone; `PATCH`/approve/reject/cancel are admin-only (no ownership check — there are no owners).
- Add new shadcn components with `pnpm dlx shadcn@latest add <name>`
- Forms: `useForm({ resolver: zodResolver(schema) })` + the shadcn `Form`/`FormField` components
- Event visibility (who sees which events) is centralized in `src/lib/event-visibility.ts` — reuse it rather than re-deriving the status logic per route
- Every event status transition (submit/approve/reject/edit/cancel) writes an `AuditLog` entry via `writeAuditLog()` in `src/models/audit-log.ts`
- When building a query filter from client-supplied date/query params, always validate the parsed `Date` isn't `NaN` before handing it to Mongoose — an unencoded `+` in a query string (e.g. a timezone offset like `+03:00`) decodes as a space via `URLSearchParams`, and an uncaught Mongoose cast on an Invalid Date 500s instead of 400ing. On the client side, always build query strings with `URLSearchParams`, never raw template-literal interpolation (see `src/components/calendar/calendar-view.tsx`).

## Running locally
```bash
docker compose up --build   # app on :3000, mongo on :27017
docker compose exec app pnpm seed   # or run `pnpm seed` locally against MONGODB_URI
```
or without Docker:
```bash
cp .env.example .env.local  # set MONGODB_URI, AUTH_SECRET, SEED_SUPERADMIN_EMAIL/PASSWORD
pnpm install
pnpm seed        # creates the initial superadmin user (idempotent)
pnpm seed:data   # ensures the real Kenya Re departments + Kenya Re Academy/Online venues exist (idempotent)
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
