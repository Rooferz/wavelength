# WAVELENGTH v2 — Setup Guide

## What's New in v2
- **Spotify Connect** — users log in with their Spotify account via OAuth
- **Playlist Analysis** — pick any playlist, AI reads its musical DNA and suggests songs you haven't heard
- **Taste Matching** — find other Wavelength users who share your exact musical fingerprint
- **Real-time Chat** — chat with your matches via Supabase Realtime

---

## 1. Supabase — Run the New Schema

Open your Supabase project → SQL Editor → paste the contents of `supabase-schema.sql` and run it.

This creates three new tables: `profiles`, `matches`, `messages`.

**Enable Realtime:**
Go to Supabase Dashboard → Database → Replication → enable the `messages` table.

---

## 2. New Environment Variables

Add these to your Vercel project settings (and `.env.local` for local dev):

```
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=https://your-vercel-url.vercel.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase → Settings → API → anon public>
```

Your existing vars (OPENAI_API_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY) stay the same.

---

## 3. Spotify Developer Dashboard

Your app already has a Client ID and Secret. Add one redirect URI:

1. Go to developer.spotify.com/dashboard
2. Open your app → Edit Settings
3. Under Redirect URIs, add:
   - https://your-vercel-url.vercel.app/api/auth/callback/spotify
   - http://localhost:3000/api/auth/callback/spotify
4. Save

---

## 4. Install & Deploy

```bash
npm install
git add .
git commit -m "v2: Spotify connect, playlist analysis, taste matching, chat"
git push
```

---

## Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Paste the output as NEXTAUTH_SECRET in Vercel.
