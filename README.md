# Cocoa Stake Temple Day — "No One Rides Alone"

Carpool sign-up site for Cocoa Stake Temple Day at the Fort Lauderdale Florida
Temple, Saturday, November 14, 2026. Public sign-up + counts-only board at
`/`, full roster for stake leaders at `/admin`.

Runs entirely on free tiers: **Vite + React** (static site), **Supabase**
(Postgres + auth), **Netlify** (hosting). No credit card required anywhere in
this walkthrough.

---

## 1. Add the temple photo

Put your photo at `public/temple.jpg`. If it's missing, the hero just shows a
navy/sky gradient block instead of a broken image — the site still works.

## 2. Create the free Supabase project

1. Go to supabase.com and sign up (GitHub login is easiest). No card needed
   for the free tier.
2. Click **New project**. Pick any name (e.g. "cocoa-stake-temple-day"), set
   a database password (save it somewhere — you likely won't need it again,
   Supabase manages the connection for you), pick the region closest to you,
   and click **Create new project**. Wait ~1-2 minutes for it to spin up.
3. In the left sidebar go to **SQL Editor** → **New query**. Open
   `supabase/schema.sql` from this repo, copy the whole file, paste it into
   the editor, and click **Run**. This creates the `signups` table, locks it
   down with row-level security, and creates the `get_ward_counts()` function
   the public page uses.
4. Go to **Project Settings** (gear icon) → **API**. Copy:
   - **Project URL** → this is `VITE_SUPABASE_URL`
   - **anon / public** key → this is `VITE_SUPABASE_ANON_KEY`
   (The anon key is meant to be public/embedded in frontend code — it's safe
   because every permission it has is enforced by the RLS policies in
   `schema.sql`, not by keeping the key secret.)

### Create your 2–3 admin accounts

1. In the Supabase dashboard, go to **Authentication** → **Users** → **Add
   user** → **Create new user**.
2. Enter each stake leader's email and a temporary password, check **Auto
   Confirm User** (so they don't need to click an email link), and click
   **Create user**. Repeat for each admin.
3. Share the email + temporary password with each leader; they can log in at
   `yoursite.netlify.app/admin`. There's no self-serve password reset flow
   built into this app — if someone needs a new password, reset it from the
   same **Authentication → Users** screen in Supabase.

## 3. Run it locally (optional, to test before deploying)

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste in your Project URL + anon key
npm run dev
```

Visit `http://localhost:5173` for the public page and
`http://localhost:5173/admin` for the login screen.

## 4. Deploy to Netlify (free tier)

**Easiest path — connect to GitHub:**

1. Push this project to a new GitHub repository (Netlify deploys from git,
   which also gives you automatic redeploys whenever you push changes).
2. Go to app.netlify.com and sign up free (GitHub login works, no card
   needed).
3. Click **Add new site** → **Import an existing project** → **Deploy with
   GitHub**, authorize Netlify, and pick your repo.
4. Build settings should auto-detect from `package.json`, but confirm:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Before clicking deploy, expand **Environment variables** and add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click **Deploy site**. After the build finishes you'll get a URL like
   `random-name-123.netlify.app` — you can rename it under **Site
   configuration → Change site name**.

The `public/_redirects` file in this repo (`/* /index.html 200`) is already
set up so that `/admin` loads correctly instead of a Netlify 404 — Netlify
needs this because React Router handles that route client-side.

**Alternative — drag and drop (no GitHub required):**

1. Run `npm run build` locally with `.env.local` filled in (env vars get
   baked into the build at this step, so this only works if you set them
   before building).
2. Go to app.netlify.com → **Add new site** → **Deploy manually**, then drag
   the generated `dist/` folder onto the page.
3. Note: with this method you'd need to rebuild and re-drag every time you
   change the site. The GitHub method above is much easier to maintain.

## Free tier limits (so you know you're nowhere close)

- **Supabase free tier:** 500 MB database storage, 5 GB bandwidth/month, up
  to 50,000 monthly active users for auth, project pauses after 1 week of no
  API activity (visiting the site or admin panel wakes it right back up in a
  few seconds). A stake with a few hundred sign-ups uses a tiny fraction of a
  percent of the storage limit.
- **Netlify free tier:** 100 GB bandwidth/month, 300 build minutes/month.
  This is a small static site with no images beyond the temple photo, so a
  single event's traffic won't come close.

## What's enforced where

- The public page (`/`) can only ever **insert** rows — enforced by
  PostgreSQL row-level security in `supabase/schema.sql`, not just hidden in
  the UI. It reads counts exclusively through the `get_ward_counts()`
  database function, which returns per-ward sums and never a name, phone
  number, or note — even if you open the browser network tab or call the
  Supabase REST API directly.
- The admin page (`/admin`) requires a Supabase-authenticated session before
  it can `select` or `delete` rows — also enforced by RLS, not client code.

## Project structure

```
supabase/schema.sql      SQL to paste into the Supabase SQL editor (run once)
src/lib/                 Supabase client, shared theme/colors, form styles, CSV export
src/components/          SignupForm, WardCountsBoard (public), AdminLogin, AdminRoster
src/pages/                PublicPage (/), AdminPage (/admin)
public/temple.jpg         Add your own temple photo here
public/_redirects         Netlify SPA routing config
```
