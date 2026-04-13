-- ============================================================
-- WAVELENGTH v2 — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────
-- Stores Spotify user profiles + AI-generated taste fingerprint
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_id      TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  taste_fingerprint JSONB,
  taste_genres    TEXT[],
  taste_headline  TEXT,
  taste_summary   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Matches ───────────────────────────────────────────────────
-- Pairs of users matched by music taste
CREATE TABLE IF NOT EXISTS matches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a              TEXT NOT NULL,
  user_b              TEXT NOT NULL,
  compatibility_score FLOAT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

-- ── Messages ──────────────────────────────────────────────────
-- Chat messages between matched users
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id   UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS messages_match_id_idx ON messages(match_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
CREATE INDEX IF NOT EXISTS matches_user_a_idx ON matches(user_a);
CREATE INDEX IF NOT EXISTS matches_user_b_idx ON matches(user_b);
CREATE INDEX IF NOT EXISTS profiles_spotify_id_idx ON profiles(spotify_id);

-- ── Realtime ──────────────────────────────────────────────────
-- Enable Realtime on the messages table for live chat
-- Go to Supabase Dashboard → Database → Replication
-- and enable the messages table, OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ── Row Level Security ────────────────────────────────────────
-- We use the service role key server-side (bypasses RLS),
-- but enable RLS + a permissive read policy for the anon key
-- used by the Realtime subscription in the browser.

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to read messages (Realtime subscription)
CREATE POLICY "Allow read messages" ON messages
  FOR SELECT USING (true);

-- Allow anon/authenticated to read profiles
CREATE POLICY "Allow read profiles" ON profiles
  FOR SELECT USING (true);

-- Allow anon/authenticated to read matches
CREATE POLICY "Allow read matches" ON matches
  FOR SELECT USING (true);

-- ── Keep existing searches table intact ───────────────────────
-- (Already created in v1 — no changes needed)
