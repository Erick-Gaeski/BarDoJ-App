# Conta Bar release readiness

## Current state

The business screens still use the browser-only demo store in
`lib/contabar/loja.tsx`. They do not yet read or write business records in
Supabase. The SQL migration and the one-time initializer prepare the database,
but by themselves they do not make the application a live point-of-sale system.
Do not use demo mode to record real sales.

The demo store is kept in each browser under `contabar-exemplo-v1`. Users may
have changed that data, so treat it as potentially valuable. The Settings screen
offers a JSON backup before restoring or replacing anything. No automatic import
or deletion is performed.

## Supabase staging sequence

1. Confirm the intended Supabase project and make a database backup if it has
   existing data.
2. Review `migrations/20231001000000_create_schema.sql` with the project owner.
   It has not been executed by this repository workflow. Apply it only to a
   disposable or staging Supabase project first.
3. In Supabase Auth, create and confirm the existing user that will own the
   pilot bar. The initializer does not create users or passwords.
4. Run `npm run init-bar` from this app directory with
   `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `ADMIN_USER_EMAIL` supplied to
   that one process through a trusted local shell or secret manager. Do not put
   the secret key in `.env.local`, Vercel, source code, or a browser setting.
5. Verify the first admin's access and test tenant isolation with separate Auth
   users for admin, waiter, and cumim. Confirm each role cannot read or write a
   different bar.
6. Complete the application data-layer integration and Realtime client before
   using the screens for real business activity. Realtime private-channel
   authorization also requires disabling public channel access in the Supabase
   Realtime settings.
7. Decide and test a manual import only after exporting and inspecting the
   browser demo data. Keep the backup untouched until import and totals are
   verified.

The initializer is intentionally not run by build, deployment, or application
startup. It is a separate privileged operation.

## Vercel preparation

- Git repository root: `BarDoJ-App`.
- Next.js application root: `contabar`.
- Build command: `npm run build`.
- Add only `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Vercel app environment after
  the live data layer has been implemented and staging-tested.
- Do not add `SUPABASE_SECRET_KEY` to the deployed app. It is only needed by
  the one-time local/staging initializer.
- Deploy only after the app stops relying on demo localStorage for business
  operations, authentication and membership checks work, and the RLS role
  checks pass in staging.
