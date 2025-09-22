-- ====================================================================
-- BIRDSPHERE UNIFIED DATABASE MIGRATION v2.0
-- Complete database schema creation and migration script
-- Creates all tables, indexes, constraints, functions, triggers, and seed data
-- Compatible with existing models and enhanced for unified comment system
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "gen_random_uuid";

-- Set timezone for consistent timestamp handling
SET timezone TO 'UTC';

-- ====================================================================
-- DATABASE UTILITY FUNCTIONS
-- ====================================================================

-- Function to safely drop triggers if they exist
CREATE OR REPLACE FUNCTION drop_trigger_if_exists(trigger_name TEXT, table_name TEXT)
RETURNS void AS $$
BEGIN
    EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || table_name;
END;
$$ LANGUAGE plpgsql;

-- Function to extract hashtags and keywords from posts
CREATE OR REPLACE FUNCTION extract_hashtags_and_keywords()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Extract hashtags using regex (words starting with #)
    NEW.hashtags = ARRAY(
        SELECT DISTINCT lower(substring(match[1] from 2))
        FROM regexp_split_to_table(NEW.content, '\s+') AS word,
             regexp_matches(word, '(#\w+)', 'g') AS match
    );

    -- Extract search keywords (words longer than 2 characters, no special chars)
    NEW.search_keywords = ARRAY(
        SELECT DISTINCT lower(word)
        FROM regexp_split_to_table(
            regexp_replace(NEW.content, '[^\w\s]', '', 'g'),
            '\s+'
        ) AS word
        WHERE length(word) > 2 AND word !~ '^[0-9]+$'
    );

    RETURN NEW;
END;
$$;

-- Function to update comment counts and reply counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment post comment count for top-level comments
        IF NEW.parent_comment_id IS NULL THEN
            UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        END IF;

        -- Increment reply count for parent comment
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement post comment count for top-level comments
        IF OLD.parent_comment_id IS NULL THEN
            UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
        END IF;

        -- Decrement reply count for parent comment
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE comments SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.parent_comment_id;
        END IF;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    target_table TEXT;
    reaction_counts_json JSONB;
BEGIN
    -- Determine which table we're updating
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        target_table := COALESCE(NEW.target_type, OLD.target_type);

        -- Calculate new reaction counts for the target
        SELECT json_object_agg(reaction_type, reaction_count)::jsonb
        INTO reaction_counts_json
        FROM (
            SELECT reaction_type, COUNT(*) as reaction_count
            FROM reactions
            WHERE target_id = COALESCE(NEW.target_id, OLD.target_id)
              AND target_type = target_table
            GROUP BY reaction_type
        ) counts;

        -- Update the appropriate table
        IF target_table = 'post' THEN
            UPDATE posts
            SET reaction_counts = COALESCE(reaction_counts_json, '{}'::jsonb),
                reaction_count = COALESCE(
                    (SELECT SUM((value::int)) FROM jsonb_each_text(reaction_counts_json)),
                    0
                )
            WHERE id = COALESCE(NEW.target_id, OLD.target_id);

        ELSIF target_table = 'comment' THEN
            UPDATE comments
            SET reaction_count = COALESCE(
                (SELECT SUM((value::int)) FROM jsonb_each_text(reaction_counts_json)),
                0
            )
            WHERE id = COALESCE(NEW.target_id, OLD.target_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function to update engagement scores
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    age_hours INTEGER DEFAULT 1
)
RETURNS DECIMAL AS $$
BEGIN
    -- Engagement score formula: (likes * 1 + comments * 2 + shares * 3) / sqrt(age_hours + 1)
    RETURN ROUND(
        (like_count * 1.0 + comment_count * 2.0 + share_count * 3.0 + view_count * 0.1) /
        SQRT(GREATEST(age_hours, 1)),
        4
    );
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- CORE USER AND AUTHENTICATION TABLES
-- ====================================================================

-- Users table with comprehensive profile information
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    bio TEXT CHECK (length(bio) <= 500),
    profile_image VARCHAR(255),

    -- Location information
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Address information
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_country VARCHAR(50) DEFAULT 'USA',
    address_postal_code VARCHAR(20),

    -- User roles and permissions
    user_roles TEXT[] DEFAULT ARRAY['buyer'],

    -- Reputation system
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    rating_count INTEGER DEFAULT 0,

    -- Account status
    is_verified BOOLEAN DEFAULT FALSE,
    is_breeder BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT valid_rating_count CHECK (
        (rating = 0.00 AND rating_count = 0) OR (rating > 0.00 AND rating_count > 0)
    )
);

-- User ratings system
CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    transaction_type VARCHAR(50) DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(rater_id, rated_user_id, transaction_type),
    CHECK(rater_id != rated_user_id)
);

-- ====================================================================
-- ANIMAL CATEGORIES AND INTERESTS
-- ====================================================================

-- Animal categories (hierarchical structure for interests and listings)
CREATE TABLE IF NOT EXISTS animal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES animal_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(parent_id, name),
    CHECK ((parent_id IS NULL AND level = 1) OR (parent_id IS NOT NULL AND level > 1))
);

-- User animal interests junction table
CREATE TABLE IF NOT EXISTS user_animal_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES animal_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, category_id)
);

-- ====================================================================
-- MARKETPLACE SYSTEM
-- ====================================================================

-- Legacy categories table (for backward compatibility)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table for marketplace
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    animal_category_id INTEGER REFERENCES animal_categories(id),

    -- Basic listing information
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL CHECK (length(description) <= 5000),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Animal specific details
    species VARCHAR(100),
    breed VARCHAR(100),
    age VARCHAR(50),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'unknown', 'pair')),
    color VARCHAR(100),
    health_status VARCHAR(100),
    vaccination_status VARCHAR(100),

    -- Shipping options
    shipping_available BOOLEAN DEFAULT FALSE,
    local_pickup_only BOOLEAN DEFAULT TRUE,
    shipping_cost DECIMAL(8, 2),

    -- Location information
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Listing status and visibility
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive', 'pending')),
    is_featured BOOLEAN DEFAULT FALSE,

    -- Analytics
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Search optimization
    search_vector TSVECTOR
);

-- Listing media
CREATE TABLE IF NOT EXISTS listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, listing_id)
);

-- ====================================================================
-- MESSAGING SYSTEM
-- ====================================================================

-- Conversations (for marketplace messaging)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(buyer_id, seller_id, listing_id)
);

-- Messages (for marketplace messaging)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 2000),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- SOCIAL MEDIA SYSTEM (POSTS AND COMMENTS)
-- ====================================================================

-- Posts table with comprehensive features
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 5000),

    -- Post classification
    post_type VARCHAR(20) DEFAULT 'standard' CHECK (post_type IN
        ('standard', 'share', 'announcement', 'question', 'sale', 'poll')),
    visibility VARCHAR(20) DEFAULT 'followers' CHECK (visibility IN
        ('public', 'followers', 'private')),

    -- Content organization
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    search_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Location data
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),

    -- Analytics and engagement
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    reaction_counts JSONB DEFAULT '{}'::jsonb,
    engagement_score DECIMAL(10, 4) DEFAULT 0.0,
    reach_count INTEGER DEFAULT 0,
    last_engagement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Sharing functionality
    original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    share_comment TEXT,

    -- Post management
    is_pinned BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Moderation
    is_moderated BOOLEAN DEFAULT FALSE,
    moderation_reason TEXT,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Search optimization
    search_vector TSVECTOR
);

-- Post media attachments
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- For videos/audio in seconds
    thumbnail_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table with enhanced features
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) <= 1000),
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

    -- Comment types and features
    comment_type VARCHAR(20) DEFAULT 'standard' CHECK (comment_type IN
        ('standard', 'media', 'reaction', 'question')),

    -- Analytics
    reaction_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,

    -- Media support (for Phase 1 enhancement)
    has_media BOOLEAN DEFAULT FALSE,
    media_attachments JSONB DEFAULT '[]'::jsonb,

    -- Moderation and editing
    is_edited BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Search optimization
    search_vector TSVECTOR
);

-- Comment media attachments (Phase 1 enhancement)
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

-- Comment edit history
CREATE TABLE IF NOT EXISTS comment_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unified reactions table (for both posts and comments)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'comment')),
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN
        ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'hug')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (user_id, target_id, target_type)
);

-- User follows/following relationships
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification preferences
    notify_posts BOOLEAN DEFAULT TRUE,
    notify_important BOOLEAN DEFAULT TRUE,

    -- Relationship analytics
    engagement_score DECIMAL(4, 2) DEFAULT 1.0,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- Post shares
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    share_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, post_id)
);

-- ====================================================================
-- MODERATION SYSTEM
-- ====================================================================

-- Content moderation flags
CREATE TABLE IF NOT EXISTS moderation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'listing')),
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- CHAT SYSTEM (POSTGRESQL IMPLEMENTATION)
-- ====================================================================

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) DEFAULT 'public' CHECK (room_type IN ('public', 'private', 'direct')),
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat room members
CREATE TABLE IF NOT EXISTS chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT FALSE,

    UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edit_history JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message read status
CREATE TABLE IF NOT EXISTS message_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(message_id, user_id)
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC, rating_count DESC);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(user_roles);
CREATE INDEX IF NOT EXISTS idx_users_active_verified ON users(is_active, is_verified, created_at DESC);

-- Animal categories indexes
CREATE INDEX IF NOT EXISTS idx_animal_categories_parent ON animal_categories(parent_id, display_order);
CREATE INDEX IF NOT EXISTS idx_animal_categories_level ON animal_categories(level, name);
CREATE INDEX IF NOT EXISTS idx_animal_categories_active ON animal_categories(is_active, level);

-- User animal interests indexes
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_animal_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_animal_interests(category_id);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated ON user_ratings(rated_user_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON user_ratings(rater_id, created_at DESC);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_animal_category ON listings(animal_category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude, status)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(is_featured, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(search_vector);

-- Listing media indexes
CREATE INDEX IF NOT EXISTS idx_listing_media_listing ON listing_media(listing_id, display_order);
CREATE INDEX IF NOT EXISTS idx_listing_media_primary ON listing_media(listing_id, is_primary);

-- Conversation and message indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read, created_at)
    WHERE is_read = FALSE;

-- Posts and social media indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_timeline ON posts(visibility, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(engagement_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type, visibility, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_search_keywords ON posts USING GIN(search_keywords);
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location_lat, location_lng)
    WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Post media indexes
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id, display_order);
CREATE INDEX IF NOT EXISTS idx_post_media_type ON post_media(file_type, created_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id, created_at ASC)
    WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_search_vector ON comments USING GIN(search_vector);

-- Comment media indexes (Phase 1 enhancement)
CREATE INDEX IF NOT EXISTS idx_comment_media_comment ON comment_media(comment_id, display_order);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_type_target ON reactions(reaction_type, target_type, created_at DESC);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_engagement ON follows(follower_id, engagement_score DESC);

-- Shares indexes
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_post ON shares(post_id, created_at DESC);

-- Moderation indexes
CREATE INDEX IF NOT EXISTS idx_moderation_flags_target ON moderation_flags(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON moderation_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_reporter ON moderation_flags(reporter_id, created_at DESC);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(room_type, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room ON chat_room_members(room_id, is_online);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(user_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user ON message_read_status(user_id, read_at DESC);

-- ====================================================================
-- TRIGGERS FOR AUTOMATED UPDATES
-- ====================================================================

-- Drop existing triggers to avoid conflicts
SELECT drop_trigger_if_exists('update_users_updated_at', 'users');
SELECT drop_trigger_if_exists('update_listings_updated_at', 'listings');
SELECT drop_trigger_if_exists('update_posts_updated_at', 'posts');
SELECT drop_trigger_if_exists('update_comments_updated_at', 'comments');
SELECT drop_trigger_if_exists('update_user_ratings_updated_at', 'user_ratings');
SELECT drop_trigger_if_exists('extract_hashtags_keywords', 'posts');
SELECT drop_trigger_if_exists('update_comment_count_trigger', 'comments');
SELECT drop_trigger_if_exists('update_reaction_count_trigger', 'reactions');

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ratings_updated_at
    BEFORE UPDATE ON user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for content processing
CREATE TRIGGER extract_hashtags_keywords
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION extract_hashtags_and_keywords();

-- Create triggers for count updates
CREATE TRIGGER update_comment_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_counts();

CREATE TRIGGER update_reaction_count_trigger
    AFTER INSERT OR DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_reaction_counts();

-- ====================================================================
-- DATABASE VIEWS FOR COMPLEX QUERIES
-- ====================================================================

-- Animal category hierarchy view with full paths
CREATE OR REPLACE VIEW animal_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT
        id,
        name,
        parent_id,
        level,
        icon,
        display_order,
        name::text AS full_path,
        ARRAY[id] AS path_ids,
        ARRAY[name] AS path_names
    FROM animal_categories
    WHERE parent_id IS NULL AND is_active = TRUE

    UNION ALL

    -- Recursive case: child categories
    SELECT
        c.id,
        c.name,
        c.parent_id,
        c.level,
        c.icon,
        c.display_order,
        (ct.full_path || ' > ' || c.name)::text AS full_path,
        ct.path_ids || c.id AS path_ids,
        ct.path_names || c.name AS path_names
    FROM animal_categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = TRUE
)
SELECT
    id,
    name,
    parent_id,
    level,
    icon,
    display_order,
    full_path,
    path_ids,
    path_names
FROM category_tree
ORDER BY level, display_order, full_path;

-- User profile with ratings summary
CREATE OR REPLACE VIEW user_profiles AS
SELECT
    u.*,
    COALESCE(rating_stats.avg_rating, 0.0) as average_rating,
    COALESCE(rating_stats.total_ratings, 0) as total_ratings,
    COALESCE(listing_stats.active_listings, 0) as active_listings,
    COALESCE(social_stats.follower_count, 0) as follower_count,
    COALESCE(social_stats.following_count, 0) as following_count,
    COALESCE(social_stats.post_count, 0) as post_count
FROM users u
LEFT JOIN (
    SELECT
        rated_user_id,
        ROUND(AVG(rating), 2) as avg_rating,
        COUNT(*) as total_ratings
    FROM user_ratings
    GROUP BY rated_user_id
) rating_stats ON u.id = rating_stats.rated_user_id
LEFT JOIN (
    SELECT
        seller_id,
        COUNT(*) as active_listings
    FROM listings
    WHERE status = 'active'
    GROUP BY seller_id
) listing_stats ON u.id = listing_stats.seller_id
LEFT JOIN (
    SELECT
        u.id as user_id,
        COALESCE(followers.count, 0) as follower_count,
        COALESCE(following.count, 0) as following_count,
        COALESCE(posts.count, 0) as post_count
    FROM users u
    LEFT JOIN (SELECT following_id, COUNT(*) as count FROM follows GROUP BY following_id) followers
        ON u.id = followers.following_id
    LEFT JOIN (SELECT follower_id, COUNT(*) as count FROM follows GROUP BY follower_id) following
        ON u.id = following.follower_id
    LEFT JOIN (SELECT author_id, COUNT(*) as count FROM posts WHERE is_active = TRUE GROUP BY author_id) posts
        ON u.id = posts.author_id
) social_stats ON u.id = social_stats.user_id
WHERE u.is_active = TRUE;

-- ====================================================================
-- SEED DATA - COMPREHENSIVE ANIMAL CATEGORIES
-- ====================================================================

-- Clear existing animal categories
TRUNCATE TABLE animal_categories RESTART IDENTITY CASCADE;

-- Level 1: Main animal categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Birds', NULL, 1, '🐦', 1),
('Dogs', NULL, 1, '🐕', 2),
('Cats', NULL, 1, '🐱', 3),
('Reptiles', NULL, 1, '🦎', 4),
('Fish', NULL, 1, '🐠', 5),
('Small Mammals', NULL, 1, '🐰', 6),
('Farm Animals', NULL, 1, '🐄', 7);

-- Level 2: Bird subcategories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Parrots', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🦜', 1),
('Finches', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🐦', 2),
('Canaries', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🐤', 3),
('Cockatiels', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🦜', 4),
('Budgerigars', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🦜', 5),
('Doves', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🕊️', 6),
('Pigeons', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🕊️', 7),
('Birds of Prey', (SELECT id FROM animal_categories WHERE name = 'Birds'), 2, '🦅', 8);

-- Level 3: Popular parrot species
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Conures', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 1),
('Cockatoos', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 2),
('Macaws', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 3),
('African Greys', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 4),
('Amazons', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 5),
('Lovebirds', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 6),
('Indian Ringnecks', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 7),
('Quaker Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 8),
('Eclectus', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 9),
('Caiques', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜', 10);

-- Level 4: Conure species (detailed)
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Sun Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 1),
('Green Cheek Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 2),
('Blue Crown Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 3),
('Nanday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 4),
('Cherry Head Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 5),
('Jenday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 6),
('Mitred Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 7),
('Pineapple Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 8),
('Cinnamon Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 9),
('Turquoise Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜', 10);

-- Level 4: Budgerigar varieties
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('English Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 1),
('American Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 2),
('Lutino Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 3),
('Albino Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 4),
('Blue Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 5),
('Violet Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 6),
('Spangle Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 7),
('Pied Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜', 8);

-- Level 3: Canary types
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Song Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤', 1),
('Color Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤', 2),
('Type Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤', 3);

-- Level 4: Song canary breeds
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('American Singer', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤', 1),
('German Roller', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤', 2),
('Waterslager', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤', 3),
('Spanish Timbrado', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤', 4);

-- Level 4: Color canary varieties
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Red Factor Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤', 1),
('Yellow Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤', 2),
('White Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤', 3),
('Bronze Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤', 4);

-- Level 2: Dog categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Working Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 1),
('Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 2),
('Toy Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 3),
('Terriers', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 4),
('Hounds', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 5),
('Herding Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 6),
('Non-Sporting', (SELECT id FROM animal_categories WHERE name = 'Dogs'), 2, '🐕', 7);

-- Level 3: Popular dog breeds
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
-- Working Dogs
('German Shepherd', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕', 1),
('Rottweiler', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕', 2),
('Doberman', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕', 3),
('Boxer', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕', 4),
('Great Dane', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕', 5),
-- Sporting Dogs
('Golden Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕', 1),
('Labrador Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕', 2),
('German Shorthaired Pointer', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕', 3),
-- Toy Dogs
('Chihuahua', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕', 1),
('Pomeranian', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕', 2),
('Yorkshire Terrier', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕', 3),
('Maltese', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕', 4),
('Pug', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕', 5);

-- Level 2: Cat categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Long Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats'), 2, '🐱', 1),
('Short Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats'), 2, '🐱', 2),
('Hairless Cats', (SELECT id FROM animal_categories WHERE name = 'Cats'), 2, '🐱', 3);

-- Level 3: Popular cat breeds
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
-- Long Hair
('Persian', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱', 1),
('Maine Coon', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱', 2),
('Ragdoll', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱', 3),
('Norwegian Forest Cat', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱', 4),
-- Short Hair
('British Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱', 1),
('American Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱', 2),
('Siamese', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱', 3),
('Russian Blue', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱', 4),
('Bengal', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱', 5),
-- Hairless
('Sphynx', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱', 1);

-- Level 2: Reptile categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Snakes', (SELECT id FROM animal_categories WHERE name = 'Reptiles'), 2, '🐍', 1),
('Lizards', (SELECT id FROM animal_categories WHERE name = 'Reptiles'), 2, '🦎', 2),
('Turtles', (SELECT id FROM animal_categories WHERE name = 'Reptiles'), 2, '🐢', 3),
('Geckos', (SELECT id FROM animal_categories WHERE name = 'Reptiles'), 2, '🦎', 4);

-- Level 3: Popular reptile species
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
-- Snakes
('Ball Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍', 1),
('Corn Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍', 2),
('Boa Constrictor', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍', 3),
('King Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍', 4),
-- Lizards
('Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎', 1),
('Blue Tongue Skink', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎', 2),
('Green Iguana', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎', 3),
('Monitor Lizard', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎', 4),
-- Geckos
('Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎', 1),
('Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎', 2),
('Tokay Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎', 3),
-- Turtles
('Red-eared Slider', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢', 1),
('Box Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢', 2),
('Russian Tortoise', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢', 3);

-- Level 2: Fish categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Freshwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish'), 2, '🐠', 1),
('Saltwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish'), 2, '🐠', 2),
('Bettas', (SELECT id FROM animal_categories WHERE name = 'Fish'), 2, '🐠', 3),
('Goldfish', (SELECT id FROM animal_categories WHERE name = 'Fish'), 2, '🐠', 4);

-- Level 3: Popular fish species
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
-- Freshwater
('Angelfish', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠', 1),
('Guppy', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠', 2),
('Molly', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠', 3),
('Tetra', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠', 4),
('Cichlid', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠', 5),
-- Saltwater
('Clownfish', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠', 1),
('Tang', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠', 2),
('Wrasse', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠', 3),
('Goby', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠', 4);

-- Level 2: Small Mammal categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Rabbits', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🐰', 1),
('Guinea Pigs', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🐹', 2),
('Hamsters', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🐹', 3),
('Ferrets', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🦫', 4),
('Chinchillas', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🐭', 5),
('Rats', (SELECT id FROM animal_categories WHERE name = 'Small Mammals'), 2, '🐭', 6);

-- Level 3: Popular rabbit breeds
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Holland Lop', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰', 1),
('Netherland Dwarf', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰', 2),
('Mini Rex', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰', 3),
('Lionhead', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰', 4),
('Flemish Giant', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰', 5);

-- Level 2: Farm Animal categories
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Chickens', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐔', 1),
('Goats', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐐', 2),
('Sheep', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐑', 3),
('Pigs', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐷', 4),
('Cattle', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐄', 5),
('Horses', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🐴', 6),
('Ducks', (SELECT id FROM animal_categories WHERE name = 'Farm Animals'), 2, '🦆', 7);

-- Level 3: Popular chicken breeds
INSERT INTO animal_categories (name, parent_id, level, icon, display_order) VALUES
('Rhode Island Red', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔', 1),
('Leghorn', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔', 2),
('Orpington', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔', 3),
('Silkie', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔', 4),
('Bantam', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔', 5);

-- ====================================================================
-- LEGACY CATEGORY DATA FOR BACKWARD COMPATIBILITY
-- ====================================================================

-- Insert legacy categories
INSERT INTO categories (id, name, description) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Birds', 'All types of birds including parrots, finches, canaries, and more'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Reptiles', 'Snakes, lizards, turtles, geckos, and other reptiles'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Small Mammals', 'Rabbits, ferrets, guinea pigs, hamsters, and other small mammals'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Exotic Pets', 'Unusual and exotic animals not in other categories'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Farm Animals', 'Chickens, goats, sheep, and other farm animals')
ON CONFLICT (id) DO NOTHING;

-- Insert legacy bird subcategories
INSERT INTO categories (id, name, description, parent_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'Parrots', 'Macaws, cockatoos, conures, and other parrots', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'Finches', 'Canaries, zebra finches, and other finches', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'Cockatiels', 'All cockatiel varieties and mutations', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae', 'Budgerigars', 'Budgies, parakeets, and all budgerigar varieties', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf', 'Lovebirds', 'All lovebird species and color mutations', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- SEARCH VECTOR UPDATES
-- ====================================================================

-- Update search vectors for existing data
UPDATE listings
SET search_vector = to_tsvector('english',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(species, '') || ' ' ||
    COALESCE(breed, '')
) WHERE search_vector IS NULL;

UPDATE posts
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

UPDATE comments
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- ====================================================================
-- DATABASE STATISTICS AND COMPLETION
-- ====================================================================

-- Update table statistics
ANALYZE;

-- Final status report
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    category_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO category_count
    FROM animal_categories;

    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'BIRDSPHERE UNIFIED DATABASE MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'Database Statistics:';
    RAISE NOTICE '- Tables created: %', table_count;
    RAISE NOTICE '- Indexes created: %', index_count;
    RAISE NOTICE '- Functions created: %', function_count;
    RAISE NOTICE '- Animal categories: %', category_count;
    RAISE NOTICE '- Database is ready for production use';
    RAISE NOTICE '- Enhanced comment system ready for Phase 1 implementation';
    RAISE NOTICE '====================================================================';
END $$;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS drop_trigger_if_exists(TEXT, TEXT);