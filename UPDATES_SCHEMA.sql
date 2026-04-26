-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATES/NEWS SYSTEM - Database Schema
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── POSTS TABLE ──────────────────────────────────────────────────────────

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  pinned BOOLEAN DEFAULT FALSE,
  is_poll BOOLEAN DEFAULT FALSE,
  poll_options JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0
);

-- ─── COMMENTS TABLE ───────────────────────────────────────────────────────

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REACTIONS TABLE ──────────────────────────────────────────────────────

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- ─── INDEXES FOR PERFORMANCE ──────────────────────────────────────────────

CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(pinned, created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX idx_reactions_post_id ON post_reactions(post_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Everyone can read posts
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

-- Only admins can create/update/delete posts
CREATE POLICY "Only admins can insert posts"
ON posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Only admins can update posts"
ON posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Only admins can delete posts"
ON posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Everyone can read comments
CREATE POLICY "Anyone can read comments"
ON comments FOR SELECT
USING (true);

-- Logged-in users can create comments
CREATE POLICY "Logged-in users can create comments"
ON comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
ON comments FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Everyone can read reactions
CREATE POLICY "Anyone can read reactions"
ON post_reactions FOR SELECT
USING (true);

-- Logged-in users can add reactions
CREATE POLICY "Logged-in users can add reactions"
ON post_reactions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON post_reactions FOR DELETE
USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Run this entire file in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
