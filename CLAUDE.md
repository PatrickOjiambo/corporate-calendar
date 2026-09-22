# Kenyare Corporate Calendar

Internal corporate calendar app for Kenyare.

## Stack
- Next.js (App Router, TypeScript, `src/` dir) + Tailwind v4
- shadcn/ui components in `src/components/ui`
- MongoDB via Mongoose, connection helper at `src/lib/db.ts` (cached global connection — don't instantiate `mongoose.connect` elsewhere)
- Zod for all input validation — schemas live in `src/lib/validators/*`, reused by both API routes and client-side `react-hook-form` (`@hookform/resolvers/zod`)
- Package manager: **pnpm** (not npm/yarn)

## Conventions
- Mongoose models: `src/models/*.ts`, guard re-registration with `models.X ?? model("X", schema)`
- API routes: parse+validate with the matching Zod schema before touching the DB; return `400` with `error.flatten()` on failure
- Add new shadcn components with `pnpm dlx shadcn@latest add <name>`
- Forms: `useForm({ resolver: zodResolver(schema) })` + the shadcn `Form`/`FormField` components

## Running locally
```bash
docker compose up --build   # app on :3000, mongo on :27017
```
or without Docker:
```bash
cp .env.example .env.local  # set MONGODB_URI
pnpm install
pnpm dev
```

## Environment
- `MONGODB_URI` — required, see `.env.example`
