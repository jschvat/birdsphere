-- Migration: Add search keywords column for post search functionality
-- Date: 2025-09-18
-- Purpose: Add search_keywords column to enable hashtag and keyword search

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS search_keywords TEXT[] DEFAULT '{}';

-- Update existing posts with default values
UPDATE posts SET search_keywords = '{}' WHERE search_keywords IS NULL;