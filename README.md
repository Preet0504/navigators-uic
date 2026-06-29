# UIC Navigators Hub

The community website for **UIC Navigators** — events, Bible studies, the Cold Brew
game-night leaderboard, and the team. Built on the official Navigators brand
(Navigator Teal `#008c95` + Navigator Gold `#d19f2a`, Montserrat + Playfair Display).

- **Stack:** React 19 · Vite · React Router · Supabase (Postgres + Auth + Storage + Realtime)
- **Audience:** Students just browse — no login. One **admin** maintains all content.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL + anon key
npm run dev                  # http://localhost:5173
```

> The site runs **without** a backend too — it shows built-in demo content so you can
> develop the UI offline. Connect Supabase to make it live.

## One-time backend setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates the tables, security rules (public read / admin-only write),
   the `highlights` storage bucket, and realtime.
3. Create your admin: **Authentication → Users → Add user** (email + password,
   "Auto confirm"). Put that email in `VITE_ADMIN_EMAIL` (optional convenience).
4. Copy your **Project URL** and **anon key** (Settings → API) into `.env.local`.

## Admin mode

- Press **Ctrl + Shift + A** anywhere to open the admin sign-in.
- Sign in with the Supabase user from step 3. You'll get inline **Edit / Delete**
  controls on events, studies, people, and the scoreboard.
- **Sign out** from the navbar. Security is enforced by Supabase Row Level Security —
  no password lives in the client code.

## How it scales

- Event highlight photos/videos go to **Supabase Storage**, not the database.
- Realtime updates refetch **only the changed table**.
- Lists paginate ("Load more"); images lazy-load.
- All writes are guarded by RLS, so the public anon key is safe to ship.

## Scripts

| command | what |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | production build → `dist/` |
| `npm run preview` | preview the production build |
| `npm run lint` | ESLint |

Deploys to Vercel as a static SPA (`vercel.json` handles client-side routing).
