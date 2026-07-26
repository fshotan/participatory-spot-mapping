---
name: testing-important-places-map
description: Local end-to-end testing setup for the Japanese Next.js participatory spot mapping app.
---

# Testing important-places-map locally

## Local setup

From the repository root:

```bash
npm install
cat > .env.local <<'EOF'
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
AUTH_SECRET=<long-random-string>
EOF
npm run db:migrate
npm run dev
```

The dev server uses port 3000 if free, otherwise Next.js may choose 3001. Check the `next dev` output before opening the browser.

## Test accounts

No external credentials are required. Create fresh test users through the signup form. Use separate users to verify that `/api/places` only returns the authenticated user's own places.

## Japanese input during browser tests

If the computer-use `type` action fails to send Japanese characters, focus the real browser input and use `xdotool type --delay 60 '日本語テキスト'` with `DISPLAY=:0`. Verify round-trip display through the UI list sheet and, when useful, query the local libSQL file with `@libsql/client`.

## Stale cookie caveat

If you reset `local.db` while Chrome still has a valid JWT cookie for a now-deleted user, `/login` may redirect to `/map` while `/map` redirects back to `/login`. Clear browser cookies for localhost (or use the app's logout flow before deleting the DB) before continuing.

## Devin Secrets Needed

None for local testing.
