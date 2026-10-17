# Cocoa Stake Temple Day — "No One Rides Alone"

Carpool sign-up site for Cocoa Stake Temple Day at the Fort Lauderdale Florida
Temple, Saturday, November 14, 2026. Public sign-up + counts-only board at
`/`, full roster for stake leaders at `/admin`.

Runs entirely on Netlify's free tier: **Vite + React** (static site) and one
**Netlify Function** (`netlify/functions/api.mjs`) that stores sign-ups in
**Netlify Blobs**. No other accounts, no database to pause or run out of
project slots, no credit card.

## 1. Add the temple photo

Put your photo at `public/temple.jpg`. If it's missing, the hero just shows a
navy/sky gradient block instead of a broken image.

## 2. Deploy to Netlify

1. Connect this GitHub repo to a Netlify site (**Add new site → Import an
   existing project**). `netlify.toml` already sets the build command
   (`npm run build`), publish folder (`dist`) and functions folder.
2. In **Site configuration → Environment variables**, add three variables
   (set them for all scopes, including Functions):

   | Variable | What it is |
   |---|---|
   | `LEADER_USERNAME` | The stake leader username (not case-sensitive) |
   | `LEADER_PASSWORD` | The stake leader password |
   | `SESSION_SECRET` | A long random string (40+ characters). Make one up; nobody ever types it. Changing it logs every leader out. |

3. Trigger a deploy (**Deploys → Trigger deploy → Deploy site**). Env vars
   only apply to deploys made after you add them.

To change the leader login later, edit `LEADER_USERNAME` / `LEADER_PASSWORD`
in Netlify and redeploy. There is no password in the code or the repo.

## 3. Run it locally (optional)

```bash
npm install
npx netlify dev     # runs the site + function + a local Blobs store
```

Put `LEADER_USERNAME`, `LEADER_PASSWORD` and `SESSION_SECRET` in a `.env`
file first (see `.env.example`; `.env` is git-ignored). Use throwaway test
values, not the real ones.

`npm test` runs the backend's test suite (no network or accounts needed).

## What's enforced where

All of this is enforced in `netlify/lib/api.mjs` on the server, not just
hidden in the UI:

- The public page can only **create** sign-ups and read **per-ward counts**.
  `/api/counts` returns sums only — never a name, phone number or note.
- `/api/roster` and delete require a leader session: an `HttpOnly`,
  `Secure`, `SameSite=Strict` cookie signed with `SESSION_SECRET`, valid
  12 hours.
- Login locks out a connection after 8 wrong attempts for 15 minutes.
  Sign-ups are limited to 30 per hour per connection.
- Sign-ups are validated server-side (ward must be on the list, seat and
  group sizes 1–20, text lengths capped).

## Free tier limits

- **Netlify:** 100 GB bandwidth/month, 300 build minutes/month, 125k
  function requests/month, plus Blobs storage. A stake's worth of sign-ups
  is a tiny fraction of that.

## Project structure

```
netlify/lib/api.mjs        The whole backend (routes, auth, validation)
netlify/functions/api.mjs  Wires the backend to Netlify Blobs
scripts/test-api.mjs       Backend tests (npm test)
src/lib/api.js             Front-end fetch helpers
src/lib/                   Theme/colors, form styles, CSV export
src/components/            SignupForm, WardCountsBoard (public), AdminLogin, AdminRoster
src/pages/                 PublicPage (/), AdminPage (/admin)
public/temple.jpg          Your temple photo
public/_redirects          /api -> function, everything else -> the app
```
