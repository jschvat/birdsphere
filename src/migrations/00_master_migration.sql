-- ====================================================================
-- BIRDSPHERE MASTER DATABASE MIGRATION
-- Complete database schema creation script
-- Creates all tables, indexes, functions, triggers, and seed data
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- DATABASE FUNCTIONS
-- ====================================================================

-- Function to extract hashtags and keywords from posts
CREATE OR REPLACE FUNCTION extract_hashtags_and_keywords() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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
$$;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_count() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
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
$$;

-- Function to update engagement scores
CREATE OR REPLACE FUNCTION update_engagement_score() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    like_count INTEGER;
    comment_count INTEGER;
    share_count INTEGER;
    new_score NUMERIC;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        -- Get current counts
        SELECT COUNT(*) INTO like_count FROM reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction_type = 'like';
        SELECT COUNT(*) INTO comment_count FROM comments WHERE post_id = COALESCE(NEW.post_id, OLD.post_id);
        SELECT COUNT(*) INTO share_count FROM shares WHERE post_id = COALESCE(NEW.post_id, OLD.post_id);

        -- Calculate engagement score (likes * 1 + comments * 2 + shares * 3)
        new_score = (like_count * 1.0) + (comment_count * 2.0) + (share_count * 3.0);

        -- Update the post
        UPDATE posts
        SET engagement_score = new_score
        WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ====================================================================
-- CORE TABLES
-- ====================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    profile_image VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_country VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_country VARCHAR(50),
    address_postal_code VARCHAR(20),
    user_roles TEXT[] DEFAULT ARRAY['buyer'],
    rating DECIMAL(3, 2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_breeder BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Animal categories (hierarchical structure)
CREATE TABLE IF NOT EXISTS animal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES animal_categories(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User animal interests junction table
CREATE TABLE IF NOT EXISTS user_animal_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES animal_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category_id)
);

-- User ratings system
CREATE TABLE IF NOT EXISTS user_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    transaction_type VARCHAR(50) DEFAULT 'other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rater_id, rated_user_id, transaction_type)
);

-- Legacy categories table (for backward compatibility)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- MARKETPLACE TABLES
-- ====================================================================

-- Listings table for marketplace
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    species VARCHAR(100),
    breed VARCHAR(100),
    age VARCHAR(50),
    gender VARCHAR(20),
    health_status VARCHAR(100),
    location_city VARCHAR(100),
    location_state VARCHAR(50),
    location_country VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listing media
CREATE TABLE IF NOT EXISTS listing_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- ====================================================================
-- COMMUNICATION TABLES
-- ====================================================================

-- Conversations (for marketplace messaging)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages (for marketplace messaging)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User reviews (legacy)
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    transaction_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- SOCIAL MEDIA TABLES
-- ====================================================================

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'listing_share')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    search_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    comment_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    engagement_score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post media
CREATE TABLE IF NOT EXISTS post_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    display_order INTEGER DEFAULT 0,
    alt_text VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    reply_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment edit history
CREATE TABLE IF NOT EXISTS comment_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    previous_content TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions (likes, etc.)
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id, reaction_type),
    UNIQUE(user_id, comment_id, reaction_type),
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- Shares
CREATE TABLE IF NOT EXISTS shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    share_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- User follows
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- Moderation flags
CREATE TABLE IF NOT EXISTS moderation_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- ====================================================================
-- CHAT SYSTEM TABLES (PostgreSQL equivalents of MongoDB schemas)
-- ====================================================================

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT FALSE,
    UNIQUE(room_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);
CREATE INDEX IF NOT EXISTS idx_users_user_roles ON users USING GIN(user_roles);

-- Location-based search optimization indexes for users
CREATE INDEX IF NOT EXISTS idx_users_roles_location ON users USING btree (user_roles, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_breeders_location ON users USING btree (latitude, longitude)
WHERE is_breeder = true AND latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_not_null ON users USING btree (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Animal categories indexes
CREATE INDEX IF NOT EXISTS idx_animal_categories_parent_id ON animal_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_animal_categories_level ON animal_categories(level);

-- User animal interests indexes
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_user_id ON user_animal_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_category_id ON user_animal_interests(category_id);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_id ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);

-- Listings table indexes
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);

-- Location-based search optimization indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_category_location ON listings USING btree (category_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_status_location ON listings USING btree (status, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_location_not_null ON listings USING btree (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Listing media indexes
CREATE INDEX IF NOT EXISTS idx_listing_media_listing ON listing_media(listing_id);

-- Conversation and message indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- User favorites and reviews indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed ON user_reviews(reviewed_id);

-- Posts and social media indexes
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement_score ON posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_search_keywords ON posts USING GIN(search_keywords);

-- Post media indexes
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_type ON post_media(file_type);
CREATE INDEX IF NOT EXISTS idx_post_media_order ON post_media(post_id, display_order);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- Shares indexes
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_post ON shares(post_id);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Chat system indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Update updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON user_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Extract hashtags and keywords from posts
CREATE TRIGGER extract_hashtags_keywords BEFORE INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION extract_hashtags_and_keywords();

-- Update comment counts
CREATE TRIGGER update_comment_count_trigger AFTER INSERT OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Update engagement scores
CREATE TRIGGER update_engagement_score_reactions AFTER INSERT OR DELETE ON reactions FOR EACH ROW EXECUTE FUNCTION update_engagement_score();
CREATE TRIGGER update_engagement_score_comments AFTER INSERT OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_engagement_score();
CREATE TRIGGER update_engagement_score_shares AFTER INSERT OR DELETE ON shares FOR EACH ROW EXECUTE FUNCTION update_engagement_score();

-- ====================================================================
-- VIEWS
-- ====================================================================

-- Animal category hierarchy view
CREATE OR REPLACE VIEW animal_category_hierarchy AS
WITH RECURSIVE category_tree AS (
  -- Base case: root categories (level 1)
  SELECT
    id,
    name,
    parent_id,
    level,
    icon,
    name::text AS full_path,
    ARRAY[id] AS path_ids
  FROM animal_categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: children categories
  SELECT
    c.id,
    c.name,
    c.parent_id,
    c.level,
    c.icon,
    (ct.full_path || ' > ' || c.name)::text AS full_path,
    ct.path_ids || c.id AS path_ids
  FROM animal_categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
  id,
  name,
  parent_id,
  level,
  icon,
  full_path,
  path_ids
FROM category_tree
ORDER BY level, full_path;

-- ====================================================================
-- SEED DATA - COMPREHENSIVE ANIMAL CATEGORIES
-- ====================================================================

-- Clear existing data to avoid conflicts
TRUNCATE TABLE animal_categories RESTART IDENTITY CASCADE;

-- Level 1: Main categories (only the ones we want)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Birds', NULL, 1, '🐦'),
('Dogs', NULL, 1, '🐕'),
('Cats', NULL, 1, '🐱'),
('Reptiles', NULL, 1, '🦎'),
('Fish', NULL, 1, '🐠'),
('Farm Animals', NULL, 1, '🐄');

-- Level 2: Bird subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Parrots', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Finches', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🐦'),
('Canaries', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🐤'),
('Cockatiels', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Budgerigars', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Doves', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🕊️'),
('Birds of Prey', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦅');

-- Level 3: Parrot breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Conures', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Cockatoos', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Macaws', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('African Greys', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Amazons', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Lovebirds', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Indian Ringnecks', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Quaker Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜');

-- Level 4: Comprehensive Conure Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Sun Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Green Cheek Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Blue Crown Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Nanday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Cherry Head Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Mitred Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Jenday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Pineapple Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Cinnamon Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Gold Cap Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Red Factor Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜');

-- Level 4: Budgerigar Color Mutations and Types
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Normal/Wild Type Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Lutino Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Albino Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Blue Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Violet Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Cinnamon Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Opaline Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Spangle Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Pied Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Greywing Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Clearwing Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Rainbow Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Lacewing Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('Yellowface Budgie', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('English Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜'),
('American Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜');

-- Level 4: Indian Ringneck Mutations and Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Green Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Blue Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Turquoise Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Lutino Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Albino Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Violet Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Cinnamon Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Olive Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Grey Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Yellow Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Lacewing Indian Ringneck', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜'),
('Alexandrine Parakeet', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜');

-- Level 4: Lovebird Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Peach-faced Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Fischer''s Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Black-masked Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Nyasa Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Red-faced Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Black-winged Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Madagascar Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Black-collared Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜'),
('Black-cheeked Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜');

-- Level 4: Quaker Parrot Color Mutations
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Green Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Blue Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Lutino Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Albino Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Cinnamon Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Pallid Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Turquoise Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Pied Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜'),
('Fallow Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜');

-- Level 3: Canary Types (Song, Color, Type)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Song Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤'),
('Color Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤'),
('Type Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤');

-- Level 4: Song Canary Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('American Singer Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('German Roller Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Waterslager Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Spanish Timbrado Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Russian Singer Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤');

-- Level 4: Type Canary Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Yorkshire Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Norwich Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Border Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Gloster Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Fife Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Lizard Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Crested Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Scotch Fancy Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤');

-- Level 4: Color Canary Varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Red Factor Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Yellow Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('White Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Bronze Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Cinnamon Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Isabel Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Agate Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Pastel Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤');

-- Level 4: Cockatoo breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Umbrella Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Sulphur-crested Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Moluccan Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Goffin Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜');

-- Level 2: Dog categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Working Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Toy Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Terriers', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Hounds', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Herding Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Non-Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕');

-- Level 3: Popular Dog Breeds (select top breeds only)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Working Dogs
('German Shepherd', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Rottweiler', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Doberman Pinscher', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Boxer', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Great Dane', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Siberian Husky', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
-- Sporting Dogs
('Golden Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Labrador Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('German Shorthaired Pointer', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Cocker Spaniel', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
-- Toy Dogs
('Chihuahua', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Pomeranian', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Yorkshire Terrier', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Maltese', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Pug', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
-- Herding Dogs
('Border Collie', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Australian Shepherd', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
-- Hounds
('Beagle', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Dachshund', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
-- Non-Sporting
('Bulldog', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('French Bulldog', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Poodle', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Shiba Inu', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕');

-- Level 2: Cat categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Long Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱'),
('Short Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱'),
('Hairless Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱');

-- Level 3: Popular Cat Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Long Hair Cats
('Persian', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Maine Coon', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Ragdoll', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Norwegian Forest Cat', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
-- Short Hair Cats
('British Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('American Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Siamese', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Russian Blue', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Scottish Fold', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Bengal', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
-- Hairless Cats
('Sphynx', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱');

-- Level 2: Reptile categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Snakes', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐍'),
('Lizards', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎'),
('Turtles', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐢'),
('Geckos', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎');

-- Level 3: Popular Reptile Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Snakes
('Ball Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Corn Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Boa Constrictor', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
-- Lizards
('Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Blue Tongue Skink', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Green Iguana', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
-- Geckos
('Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
-- Turtles
('Red-eared Slider', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢'),
('Box Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢');

-- Level 2: Fish categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Freshwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Saltwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Goldfish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Bettas', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠');

-- Level 3: Popular Fish Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Freshwater Fish
('Angelfish', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Guppy', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Molly', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Tetra', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
-- Saltwater Fish
('Clownfish', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Tang', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Wrasse', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠');

-- Level 2: Farm Animal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Chickens', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐔'),
('Goats', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐐'),
('Sheep', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐑'),
('Pigs', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐷'),
('Cattle', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐄'),
('Horses', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐴'),
('Ducks', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🦆');

-- Level 3: Popular Farm Animal Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Chickens
('Rhode Island Red', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Leghorn', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Orpington', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Silkie', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔');

-- Insert legacy categories for backward compatibility
INSERT INTO categories (id, name, description) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Birds', 'All types of birds'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Reptiles', 'Snakes, lizards, turtles, and other reptiles'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Small Mammals', 'Rabbits, ferrets, guinea pigs, and other small mammals'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Exotic Pets', 'Unusual and exotic animals')
ON CONFLICT (id) DO NOTHING;

-- Insert legacy bird subcategories
INSERT INTO categories (id, name, description, parent_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 'Parrots', 'Macaws, cockatoos, conures, and other parrots', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', 'Finches', 'Canaries, zebra finches, and other finches', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', 'Cockatiels', 'All cockatiel varieties', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaae', 'Budgerigars', 'Budgies and parakeets', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaf', 'Lovebirds', 'All lovebird species', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa0a', 'Game Birds', 'Chickens, quail, and other game birds', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- COMPLETION MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE 'BirdSphere master migration completed successfully!';
    RAISE NOTICE 'Created % tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'Created % indexes', (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public');
    RAISE NOTICE 'Database is ready for use.';
END $$;