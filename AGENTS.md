# AGENTS.md

## Architecture

Next.js App Router application. Two kinds of server-side data access exist side by side:

- **App Router route handlers** (`app/api/**/route.ts`) — used by client components for polling reads
  (logs, alerts, nodes, history, settings, events) and for alert lifecycle mutations. These run through the
  Next.js runtime via `@netlify/plugin-nextjs` and query the Netlify Database directly with Drizzle.
- **Standalone Netlify Functions** (`netlify/functions/*.mts`) — used for the two endpoints that are
  external-facing or need to be reachable independent of the Next.js auth/session context:
  - `telemetry.mts` → `/api/telemetry`: the ESP32 ingestion endpoint, secured with a static
    `Authorization: Bearer <ESP32_DEVICE_API_KEY>` header (not a user session).
  - `eva.mts` → `/api/eva`: the Gemini-powered assistant, called directly from the client-side chat widget.

Both approaches read/write the same Drizzle schema in `db/schema.ts` / `db/index.ts`.

## Data model

Five core tables plus a small `settings` key/value table for operator-configurable notification targets:
`nodes`, `machines`, `maintenance_logs`, `alerts`, `maintenance_events`, `settings`. See `db/schema.ts` for
exact column definitions. Any schema change requires a new Drizzle migration
(`npx drizzle-kit generate --name ...`) — the app will not pick up schema changes otherwise.

## Non-negotiable data rule

Never introduce mock/random/simulated telemetry anywhere in this codebase — pages must render
"NO TELEMETRY RECORDED" when a table is empty, and node status must be computed from `last_seen` rather
than assumed. `lib/energy.ts` and `lib/anomaly.ts` are the single source of truth for energy-state
classification, health scoring, and anomaly thresholds; both the ingestion function and the firmware
(`app/esp32/sketch.ino`) reference the same threshold values, so keep them in sync if thresholds change.

## Auth

Netlify Identity (`@netlify/identity`) gates every route under `app/(protected)`. `app/(protected)/layout.tsx`
is a client component that checks `identity.getUser()` on mount and redirects to `/login` if absent — this is
a client-side gate, not middleware, so keep any new protected page under the `(protected)` route group.

## Realtime

There is no Supabase Realtime in this stack. "Live" pages (`/telemetry`, `/alerts`) poll the corresponding
`/api/*` route handler on an interval (`components/charts/use-live-logs.ts`) rather than holding a websocket
open. If a lower-latency push mechanism is needed later, Netlify does not offer a managed realtime
primitive — consider Server-Sent Events from a Function as the next step.

## Conventions

- Server Components fetch directly from `db` (see `app/(protected)/dashboard/page.tsx`) for the initial
  render; client components poll `/api/*` route handlers for live updates.
- UI primitives in `components/ui/` are hand-rolled, Tailwind-based, shadcn-style primitives (not the
  generated shadcn CLI output) to avoid a heavy dependency footprint.
- All monitoring-strategy / health-score logic is centralized in `lib/energy.ts` — do not duplicate
  threshold math inline in a page.
