# Oncology Regimen Review (MVP)

Pharmacist clicks **Review Regimen** on an active oncology Rx. Rules compare the Rx against the patient's paid claims and the text of the submitted chart PDF, then show a checklist popup of what is present / missing. Currently covers **lenalidomide (multiple myeloma)**. All data is synthetic.

## Setup

1. Create a Neon Postgres database (or add the Neon integration in Vercel, which sets `DATABASE_URL`).
2. `copy .env.example .env.local` and paste the connection string.
3. `npm run db:push` – creates tables.
4. `npm run db:seed` – inserts 6 fake patients, active Rx, claims, and generated chart PDFs.
5. `npm run dev` → http://localhost:3000
6. `npm test` – rule tests for every seeded scenario (no database needed).

## Deploy to Vercel

Push to GitHub, import in Vercel, add the Neon integration (Storage tab), then run `db:push` and `db:seed` once locally against the same `DATABASE_URL`.

## Adding a drug

1. Create `src/rules/drugs/<drug>.ts` exporting a `RegimenRule` (list of `checks`).
2. Register it in `src/rules/registry.ts`.
3. Add seed scenarios in `scripts/seedData.ts` and expected statuses (tests pick them up automatically).

Shared helpers: `src/rules/helpers.ts`, drug class lists: `src/rules/drugClasses.ts`.

> Clinical thresholds in the lenalidomide rules are simplified and illustrative. Validate with a clinical pharmacist before any real use.

## This project is currently in progress 
🚧check back for updates👷🏻‍♀️
