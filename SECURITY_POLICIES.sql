-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Run these in Supabase SQL Editor to secure your database
-- This ensures users can only access/modify their own data
-- ============================================================================

-- ─── PROFILES TABLE ──────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (for public profile pages)
CREATE POLICY "Anyone can view profiles"
ON profiles FOR SELECT
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can only delete their own profile
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);

-- Anyone can insert (for wallet-only signups)
CREATE POLICY "Anyone can create profile"
ON profiles FOR INSERT
WITH CHECK (true);

-- ─── INVENTORY TABLE ─────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Everyone can read inventory (public shop)
CREATE POLICY "Anyone can view inventory"
ON inventory FOR SELECT
USING (true);

-- Only admins can insert inventory
CREATE POLICY "Only admins can add inventory"
ON inventory FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can update inventory
CREATE POLICY "Only admins can update inventory"
ON inventory FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only admins can delete inventory
CREATE POLICY "Only admins can delete inventory"
ON inventory FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ─── ORDERS TABLE ────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can see their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (
  profile_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Anyone can create orders (guests + logged in)
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Only admins can update orders (status changes)
CREATE POLICY "Only admins can update orders"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ─── REVIEWS TABLE ───────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read reviews
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create own reviews"
ON reviews FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
USING (profile_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
USING (profile_id = auth.uid());

-- ============================================================================
-- ADDITIONAL SECURITY: Add is_admin and email_confirmed columns if missing
-- ============================================================================

-- Add is_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add email_confirmed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='email_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Set joeyr1989@gmail.com as admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'joeyr1989@gmail.com';

-- ============================================================================
-- VERIFICATION QUERIES - Run these to check if policies are active
-- ============================================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'inventory', 'orders', 'reviews');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'inventory', 'orders', 'reviews');
