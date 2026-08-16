# Bubbly Bois: Energy-Aware Self-Powered Predictive Maintenance Node

A production-oriented industrial monitoring dashboard for a self-powered ESP32-C3 vibration/current
sensing node (ADXL335 + ACS712/SCT-013 + LTC3588-1 energy harvesting + 0.5F supercapacitor). The app
only ever displays data that has actually arrived from the physical hardware — there is no mock data,
simulated telemetry, or randomly generated chart points anywhere in the codebase.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS** — UI and routing
- **Netlify Database (managed Postgres) + Drizzle ORM** — `nodes`, `machines`, `maintenance_logs`, `alerts`,
  `maintenance_events`, `settings` tables
- **Netlify Identity** — Google OAuth + email/password authentication protecting every app route
- **Netlify Functions** — `/api/telemetry` (ESP32 ingestion, bearer-token secured) and `/api/eva` (AI assistant)
- **Recharts** — live vibration, current, supercap voltage, z-score, and kurtosis plots
- **Resend** — emergency operator email on anomaly detection
- **`ai` + `@ai-sdk/google` (Gemini Flash)** — "EVA", the multilingual assistant that answers strictly from
  recorded telemetry

## Running locally

```bash
npm install
netlify dev --port 8889
```

`netlify dev` provisions the Netlify Database connection, Identity, and Functions locally. Set the variables in
`.env.example` (copy to `.env`) — at minimum `ESP32_DEVICE_API_KEY` so the ingestion endpoint can be tested.

## Feeding real telemetry

Point an ESP32-C3 running `app/esp32/sketch.ino` at `POST /api/telemetry` with header
`Authorization: Bearer <ESP32_DEVICE_API_KEY>`. Until a real payload arrives, every page renders explicit
empty states ("NO TELEMETRY RECORDED") rather than placeholder numbers.

## Key behaviors

- **Energy states** are derived purely from `supercap_voltage`: HIGH (≥3.7V), NORMAL (3.4–3.7V), ENERGY
  SAVING (3.1–3.4V), CRITICAL (<3.1V) — see `lib/energy.ts`.
- **Offline detection**: a node is OFFLINE if `last_seen` is more than 30 seconds old; the dashboard shows
  the exact elapsed duration.
- **Anomaly / alerting rules** (`lib/anomaly.ts`): `panic`, vibration RMS > 4.5, peak current > 15.0,
  supercap voltage < 3.1, z-score > 3.0, or kurtosis > 4.2 triggers an alert row, a Resend email, and a
  webhook POST, with a 5-minute cooldown per node/trigger-reason.

## Database migrations

Schema lives in `db/schema.ts`. After changing it, run:

```bash
npx drizzle-kit generate --name <description>
```

Netlify applies the generated SQL under `netlify/database/migrations/` automatically at deploy time.
