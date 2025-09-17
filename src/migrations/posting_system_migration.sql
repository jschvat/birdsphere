-- Posting System Migration for BirdSphere
-- Date: 2025-09-16
-- Description: Comprehensive social posting, timeline, and interaction system

-- =================================================================================
-- USER FOLLOWS SYSTEM - Who follows whom
-- =================================================================================

CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id) -- Can't follow yourself
);

-- =================================================================================
-- POSTS TABLE - Main content posts
-- =================================================================================

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- Post text content
    post_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'share', 'announcement'
    visibility VARCHAR(20) DEFAULT 'followers', -- 'public', 'followers', 'private'
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Analytics counters (updated by triggers)
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,

    -- Algorithmic score (for timeline ranking)
    engagement_score DECIMAL(10,2) DEFAULT 0.0,

    -- Location data (optional)
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- POST MEDIA - Multiple media attachments per post
-- =================================================================================

CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'pdf', 'document', '3d_model'
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER, -- Size in bytes
    mime_type VARCHAR(100),

    -- Image/Video specific
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- For videos, in seconds

    -- Thumbnail for videos/3D models
    thumbnail_url VARCHAR(500),

    -- Display order in post
    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- POST REACTIONS - Emoji reactions (like, love, laugh, etc.)
-- =================================================================================

CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL, -- 'like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- =================================================================================
-- POST SHARES - When users share posts
-- =================================================================================

CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_comment TEXT, -- Optional comment when sharing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- POST COMMENTS - Comments on posts
-- =================================================================================

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For threaded replies
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,

    -- Comment reactions
    reaction_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================================
-- COMMENT REACTIONS - Reactions on comments
-- =================================================================================

CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);

-- =================================================================================
-- POST VIEWS - Track who viewed posts (for analytics)
-- =================================================================================

CREATE TABLE IF NOT EXISTS post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous views
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    view_duration INTEGER DEFAULT 0, -- Seconds spent viewing
    UNIQUE(post_id, user_id, DATE(viewed_at)) -- One record per user per post per day
);

-- =================================================================================
-- USER INTERESTS TRACKING - Enhanced for algorithm
-- =================================================================================

CREATE TABLE IF NOT EXISTS user_interest_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES animal_categories(id) ON DELETE CASCADE,
    score DECIMAL(5,2) DEFAULT 1.0, -- Interest strength (0.0 - 10.0)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id)
);

-- =================================================================================
-- TIMELINE CACHE - Pre-computed timeline for faster loading
-- =================================================================================

CREATE TABLE IF NOT EXISTS timeline_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL, -- Relevance score for this user
    position INTEGER, -- Position in timeline
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id)
);

-- =================================================================================
-- HASHTAGS - Extract and track hashtags
-- =================================================================================

CREATE TABLE IF NOT EXISTS hashtags (
    id SERIAL PRIMARY KEY,
    tag VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY(post_id, hashtag_id)
);

-- =================================================================================
-- PERFORMANCE INDEXES
-- =================================================================================

-- User follows indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score ON posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);

-- Post media indexes
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_type ON post_media(file_type);
CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, display_order);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created ON post_comments(created_at DESC);

-- Views indexes
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_date ON post_views(viewed_at);

-- Timeline cache indexes
CREATE INDEX IF NOT EXISTS idx_timeline_cache_user ON timeline_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_cache_score ON timeline_cache(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_cache_position ON timeline_cache(user_id, position);

-- Interest scores indexes
CREATE INDEX IF NOT EXISTS idx_user_interest_scores_user ON user_interest_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interest_scores_category ON user_interest_scores(category_id);
CREATE INDEX IF NOT EXISTS idx_user_interest_scores_score ON user_interest_scores(user_id, score DESC);

-- Hashtag indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage ON hashtags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(hashtag_id);

-- =================================================================================
-- TRIGGERS FOR AUTOMATIC COUNTERS
-- =================================================================================

-- Function to update post counters
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
    -- Update reaction count
    IF TG_TABLE_NAME = 'post_reactions' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE posts SET
                reaction_count = reaction_count + 1,
                engagement_score = engagement_score + 1.0
            WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE posts SET
                reaction_count = reaction_count - 1,
                engagement_score = engagement_score - 1.0
            WHERE id = OLD.post_id;
        END IF;
    END IF;

    -- Update comment count
    IF TG_TABLE_NAME = 'post_comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE posts SET
                comment_count = comment_count + 1,
                engagement_score = engagement_score + 2.0  -- Comments worth more than reactions
            WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE posts SET
                comment_count = comment_count - 1,
                engagement_score = engagement_score - 2.0
            WHERE id = OLD.post_id;
        END IF;
    END IF;

    -- Update share count
    IF TG_TABLE_NAME = 'post_shares' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE posts SET
                share_count = share_count + 1,
                engagement_score = engagement_score + 5.0  -- Shares worth most
            WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE posts SET
                share_count = share_count - 1,
                engagement_score = engagement_score - 5.0
            WHERE id = OLD.post_id;
        END IF;
    END IF;

    -- Update view count (only for inserts)
    IF TG_TABLE_NAME = 'post_views' AND TG_OP = 'INSERT' THEN
        UPDATE posts SET
            view_count = view_count + 1,
            engagement_score = engagement_score + 0.1  -- Views worth least
        WHERE id = NEW.post_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_post_reactions ON post_reactions;
CREATE TRIGGER trigger_update_post_reactions
    AFTER INSERT OR DELETE ON post_reactions
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS trigger_update_post_comments ON post_comments;
CREATE TRIGGER trigger_update_post_comments
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS trigger_update_post_shares ON post_shares;
CREATE TRIGGER trigger_update_post_shares
    AFTER INSERT OR DELETE ON post_shares
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

DROP TRIGGER IF EXISTS trigger_update_post_views ON post_views;
CREATE TRIGGER trigger_update_post_views
    AFTER INSERT ON post_views
    FOR EACH ROW EXECUTE FUNCTION update_post_counters();

-- Function to update comment counters
CREATE OR REPLACE FUNCTION update_comment_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE post_comments SET reaction_count = reaction_count + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE post_comments SET reaction_count = reaction_count - 1
        WHERE id = OLD.comment_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comment_reactions ON comment_reactions;
CREATE TRIGGER trigger_update_comment_reactions
    AFTER INSERT OR DELETE ON comment_reactions
    FOR EACH ROW EXECUTE FUNCTION update_comment_counters();

-- Function to update hashtag usage
CREATE OR REPLACE FUNCTION update_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE hashtags SET usage_count = usage_count + 1
        WHERE id = NEW.hashtag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE hashtags SET usage_count = usage_count - 1
        WHERE id = OLD.hashtag_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hashtag_usage ON post_hashtags;
CREATE TRIGGER trigger_update_hashtag_usage
    AFTER INSERT OR DELETE ON post_hashtags
    FOR EACH ROW EXECUTE FUNCTION update_hashtag_usage();

-- =================================================================================
-- VIEWS FOR COMMON QUERIES
-- =================================================================================

-- Popular posts view (for trending)
CREATE OR REPLACE VIEW popular_posts AS
SELECT
    p.*,
    u.username,
    u.first_name,
    u.last_name,
    u.profile_image,
    u.is_verified,
    (p.reaction_count + p.comment_count + p.share_count) as total_interactions
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE p.created_at > NOW() - INTERVAL '7 days'
AND p.visibility = 'public'
ORDER BY p.engagement_score DESC, p.created_at DESC;

-- User timeline view
CREATE OR REPLACE VIEW user_timeline AS
SELECT DISTINCT
    p.*,
    u.username,
    u.first_name,
    u.last_name,
    u.profile_image,
    u.is_verified
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE p.visibility IN ('public', 'followers')
ORDER BY p.created_at DESC;

-- =================================================================================
-- INITIAL DATA - Reaction types configuration
-- =================================================================================

-- We don't insert data here, but document the expected reaction types:
-- 'like' 👍, 'love' ❤️, 'laugh' 😂, 'wow' 😮, 'sad' 😢, 'angry' 😡, 'hug' 🤗

-- =================================================================================
-- MIGRATION COMPLETE
-- =================================================================================