-- Migration: Add missing columns to posts table for analytics and engagement
-- Date: 2025-09-18
-- Purpose: Add view_count, reach_count, engagement_score, reaction_count columns

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reach_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reaction_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_engagement TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing posts with default values
UPDATE posts SET
  view_count = 0,
  reach_count = 0,
  engagement_score = 0,
  reaction_count = 0,
  last_engagement = NOW()
WHERE view_count IS NULL;