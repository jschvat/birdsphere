-- ====================================================================
-- PHASE 1: ENHANCED COMMENTS MIGRATION
-- Adds media support to existing comments without breaking changes
-- Part of the unified post-comment system implementation
-- ====================================================================

-- Add media support columns to existing comments table
ALTER TABLE comments
ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) DEFAULT 'standard' CHECK (comment_type IN ('standard', 'media', 'reaction', 'question')),
ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS media_attachments JSONB DEFAULT '[]'::jsonb;

-- Create comment_media table for file storage
CREATE TABLE IF NOT EXISTS comment_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(comment_type);
CREATE INDEX IF NOT EXISTS idx_comments_has_media ON comments(has_media) WHERE has_media = TRUE;
CREATE INDEX IF NOT EXISTS idx_comment_media_comment_id ON comment_media(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_media_display_order ON comment_media(comment_id, display_order);
CREATE INDEX IF NOT EXISTS idx_comment_media_file_type ON comment_media(file_type);

-- Create enhanced function to get comments with media
CREATE OR REPLACE FUNCTION get_comments_with_media(
    p_post_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_sort VARCHAR(10) DEFAULT 'newest'
)
RETURNS TABLE (
    id UUID,
    post_id UUID,
    author_id UUID,
    content TEXT,
    comment_type VARCHAR(20),
    parent_comment_id UUID,
    reaction_count INTEGER,
    reply_count INTEGER,
    has_media BOOLEAN,
    is_edited BOOLEAN,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    media JSONB
) AS $$
DECLARE
    order_clause TEXT;
BEGIN
    -- Determine sort order
    CASE p_sort
        WHEN 'oldest' THEN order_clause := 'c.created_at ASC';
        WHEN 'popular' THEN order_clause := 'c.reaction_count DESC, c.created_at DESC';
        ELSE order_clause := 'c.created_at DESC';
    END CASE;

    RETURN QUERY EXECUTE format('
        SELECT c.*,
               COALESCE(json_agg(
                 json_build_object(
                   ''id'', cm.id,
                   ''fileType'', cm.file_type,
                   ''fileUrl'', cm.file_url,
                   ''fileName'', cm.file_name,
                   ''fileSize'', cm.file_size,
                   ''mimeType'', cm.mime_type,
                   ''width'', cm.width,
                   ''height'', cm.height,
                   ''duration'', cm.duration,
                   ''thumbnailUrl'', cm.thumbnail_url,
                   ''displayOrder'', cm.display_order
                 ) ORDER BY cm.display_order
               ) FILTER (WHERE cm.id IS NOT NULL), ''[]''::json)::jsonb as media
        FROM comments c
        LEFT JOIN comment_media cm ON c.id = cm.comment_id
        WHERE c.post_id = $1
          AND c.parent_comment_id IS NULL
          AND c.is_active = TRUE
        GROUP BY c.id, c.post_id, c.author_id, c.content, c.comment_type,
                 c.parent_comment_id, c.reaction_count, c.reply_count,
                 c.has_media, c.is_edited, c.is_hidden, c.is_active,
                 c.created_at, c.updated_at
        ORDER BY %s
        LIMIT $2 OFFSET $3
    ', order_clause)
    USING p_post_id, p_limit, p_offset;
END;
$$ LANGUAGE plpgsql;

-- Update existing comments to set default values
UPDATE comments
SET comment_type = 'standard',
    has_media = FALSE,
    media_attachments = '[]'::jsonb
WHERE comment_type IS NULL;

-- Create trigger to update has_media flag when media is added/removed
CREATE OR REPLACE FUNCTION update_comment_media_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments
        SET has_media = TRUE
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if this was the last media file
        IF NOT EXISTS (
            SELECT 1 FROM comment_media
            WHERE comment_id = OLD.comment_id
            AND id != OLD.id
        ) THEN
            UPDATE comments
            SET has_media = FALSE
            WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic media flag updates
DROP TRIGGER IF EXISTS update_comment_media_flag_trigger ON comment_media;
CREATE TRIGGER update_comment_media_flag_trigger
    AFTER INSERT OR DELETE ON comment_media
    FOR EACH ROW EXECUTE FUNCTION update_comment_media_flag();

-- Update search vector for comments (if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comments' AND column_name = 'search_vector'
    ) THEN
        UPDATE comments
        SET search_vector = to_tsvector('english', COALESCE(content, ''))
        WHERE search_vector IS NULL;
    END IF;
END $$;

-- Ensure uploads directory exists for comments
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 Enhanced Comments Migration Completed Successfully!';
    RAISE NOTICE 'Added features:';
    RAISE NOTICE '- comment_type field for categorization';
    RAISE NOTICE '- has_media flag for media detection';
    RAISE NOTICE '- comment_media table for file storage';
    RAISE NOTICE '- Performance indexes added';
    RAISE NOTICE '- Helper function get_comments_with_media() created';
    RAISE NOTICE 'Comments can now support media attachments!';
END $$;