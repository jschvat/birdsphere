-- Posting System PostgreSQL Schema Migration
-- Creates all tables needed for the posting system

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 5000),
    post_type VARCHAR(20) DEFAULT 'standard' CHECK (post_type IN ('standard', 'share', 'announcement', 'question', 'sale')),
    visibility VARCHAR(20) DEFAULT 'followers' CHECK (visibility IN ('public', 'followers', 'private')),
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Location data
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),

    -- Hashtags extracted from content (stored as array)
    hashtags TEXT[],

    -- Search keywords for full-text search
    search_keywords TEXT[],

    -- Analytics counters
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    engagement_score DECIMAL(10, 4) DEFAULT 0.0,
    reach_count INTEGER DEFAULT 0,
    last_engagement TIMESTAMP,

    -- For shared posts
    original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    share_comment TEXT,

    -- Moderation
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media attachments for posts
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video', 'pdf', 'document', '3d_model', 'audio')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- For videos/audio in seconds
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 1000),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

    -- Analytics
    reaction_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    -- Moderation
    is_edited BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comment edit history
CREATE TABLE IF NOT EXISTS comment_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reactions table (for both posts and comments)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- Can reference posts or comments
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'comment')),
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one reaction per user per target
    UNIQUE (user_id, target_id, target_type)
);

-- Follow relationships table
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification preferences
    notify_all_posts BOOLEAN DEFAULT TRUE,
    notify_important_posts BOOLEAN DEFAULT TRUE,
    notify_live_stream BOOLEAN DEFAULT TRUE,

    -- Analytics
    engagement_score DECIMAL(4, 2) DEFAULT 1.0,
    last_interaction TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique follow relationships and prevent self-following
    UNIQUE (follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Moderation flags table
CREATE TABLE IF NOT EXISTS moderation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL, -- Can reference posts or comments
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'comment')),
    reason VARCHAR(100) NOT NULL,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score ON posts(engagement_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility_created ON posts(visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_lat, location_lng) WHERE location_lat IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_media_post_order ON post_media(post_id, display_order);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_created ON comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id, created_at ASC) WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_engagement ON follows(follower_id, engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_flags_target ON moderation_flags(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON moderation_flags(status, reported_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_posts_keywords ON posts USING GIN(search_keywords);
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING GIN(to_tsvector('english', content));

-- Function to automatically update comment counts
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;

        -- Update reply count for parent comment
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
        END IF;

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;

        -- Update reply count for parent comment
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
        END IF;

        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments SET reaction_count = reaction_count + 1 WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE posts SET reaction_count = reaction_count - 1 WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
            UPDATE comments SET reaction_count = reaction_count - 1 WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to extract hashtags and update search keywords
CREATE OR REPLACE FUNCTION extract_hashtags_and_keywords()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract hashtags using regex
    NEW.hashtags = ARRAY(
        SELECT DISTINCT lower(substring(match[1] from 2))
        FROM regexp_split_to_table(NEW.content, '\s+') AS word,
             regexp_matches(word, '(#\w+)', 'g') AS match
    );

    -- Extract search keywords (words longer than 2 characters)
    NEW.search_keywords = ARRAY(
        SELECT DISTINCT lower(word)
        FROM regexp_split_to_table(regexp_replace(NEW.content, '[^\w\s]', '', 'g'), '\s+') AS word
        WHERE length(word) > 2
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement score
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
    age_hours DECIMAL;
    recency_boost DECIMAL;
BEGIN
    -- Calculate age in hours
    age_hours = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at)) / 3600;

    -- Calculate recency boost (more recent posts get higher boost)
    recency_boost = GREATEST(1, (48 - age_hours) / 48);

    -- Update engagement score with weighted formula
    NEW.engagement_score = (
        (NEW.reaction_count * 1) +
        (NEW.comment_count * 2) +
        (NEW.share_count * 5) +
        (NEW.view_count * 0.1)
    ) * recency_boost;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_count();

CREATE TRIGGER trigger_update_reaction_count
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_count();

CREATE TRIGGER trigger_extract_hashtags_posts
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION extract_hashtags_and_keywords();

CREATE TRIGGER trigger_update_engagement_score
    BEFORE UPDATE ON posts
    FOR EACH ROW
    WHEN (OLD.reaction_count != NEW.reaction_count OR
          OLD.comment_count != NEW.comment_count OR
          OLD.share_count != NEW.share_count OR
          OLD.view_count != NEW.view_count)
    EXECUTE FUNCTION update_engagement_score();

CREATE TRIGGER trigger_update_posts_timestamp
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_comments_timestamp
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();