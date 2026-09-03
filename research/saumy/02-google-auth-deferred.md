# Change of Plan — Google Auth Deferred in the Frontend

> **Last updated:** 2026-09-02 (uncommitted — not yet pushed, exists only in this local working tree) · 
**Status:** CURRENT — records a deliberate scope decision

## What changed

Google OAuth is fully built on **both** sides — backend (`POST /auth/google`, ID token verification, invite-only email matching) and frontend (`Login.tsx`'s Google button, `@react-oauth/google`, the `loginWithGoogle` action in `authStore.ts`) — but the frontend button is now **disabled by a flag**, not removed:

```ts
// frontend/src/pages/auth/Login.tsx
const GOOGLE_AUTH_ENABLED = false
```

The button's render is gated on `GOOGLE_AUTH_ENABLED && GOOGLE_CLIENT_ID`, so it doesn't show up in the live app right now regardless of what's in `.env`.

## Why

While testing, the value in `frontend/.env`'s `VITE_GOOGLE_CLIENT_ID` turned out to be a Google **API key** (`AIzaSy...` prefix), not an OAuth 2.0 **Client ID** — two different credential types that sit next to each other in Google Cloud Console and are easy to mix up. There's no real OAuth Client ID configured yet. Rather than block frontend progress on setting one up right now, Google sign-in is being switched off in the UI until that's sorted, while keeping every line of code that implements it intact and ready.

## How to re-enable it later

1. In Google Cloud Console → *APIs & Services → Credentials*, create (or find) an **OAuth 2.0 Client ID** — not an API key — of type "Web application," with `http://localhost:5173` (and later the real deployed frontend URL) under Authorized JavaScript origins.
2. Put that value in both `backend/.env`'s `GOOGLE_CLIENT_ID` and `frontend/.env`'s `VITE_GOOGLE_CLIENT_ID` — same value, both sides.
3. Flip `GOOGLE_AUTH_ENABLED` to `true` in `Login.tsx`.

No other code changes needed — the backend verification, the store action, and the button component are all already correct and untouched.

## What's unaffected

- Email/password login — fully live, unaffected by this.
- The backend `/auth/google` route — still there, still correct, just unreachable without a frontend button pointed at it.
