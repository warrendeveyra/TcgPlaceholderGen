-- Supabase Database Schema for Shareable Custom Sets
-- Run this in Supabase SQL Editor

-- Create the shared_sets table
CREATE TABLE IF NOT EXISTS shared_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_code VARCHAR(8) UNIQUE NOT NULL,
    set_name VARCHAR(255) NOT NULL,
    set_series VARCHAR(255),
    cards JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    view_count INTEGER DEFAULT 0
);

-- Create index for fast short_code lookups
CREATE INDEX IF NOT EXISTS idx_shared_sets_short_code ON shared_sets(short_code);

-- Create index for cleanup of expired sets
CREATE INDEX IF NOT EXISTS idx_shared_sets_expires_at ON shared_sets(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE shared_sets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read shared sets (public)
CREATE POLICY "Anyone can read shared sets" ON shared_sets
    FOR SELECT USING (true);

-- Policy: Anyone can insert (create shares from frontend)
CREATE POLICY "Anyone can create shared sets" ON shared_sets
    FOR INSERT WITH CHECK (true);

-- Policy: Allow updating view_count
CREATE POLICY "Anyone can update view count" ON shared_sets
    FOR UPDATE USING (true);

-- Optional: Cleanup function for expired sets :) (run as scheduled job)
-- You can set this up in Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cleanup-expired-sets', '0 0 * * *', 'DELETE FROM shared_sets WHERE expires_at < NOW()');
