-- Consolidated Database Migration for BirdSphere
-- Date: 2025-09-16
-- Description: Complete schema migration with proper ordering
-- Version: Fixed - ensures base tables exist before ALTER operations

-- =================================================================================
-- DROP EXISTING TABLES (if needed for fresh install)
-- =================================================================================
-- Uncomment the following lines if you need to start fresh
-- DROP TABLE IF EXISTS user_ratings CASCADE;
-- DROP TABLE IF EXISTS user_animal_interests CASCADE;
-- DROP TABLE IF EXISTS animal_categories CASCADE;
-- DROP VIEW IF EXISTS animal_category_hierarchy CASCADE;
-- DROP FUNCTION IF EXISTS update_user_rating() CASCADE;

-- =================================================================================
-- USERS TABLE - Complete schema with all fields
-- =================================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20),
    bio TEXT,
    profile_image VARCHAR(500),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_breeder BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    -- Address fields
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_country VARCHAR(100),
    address_postal_code VARCHAR(20),
    -- Rating system fields
    rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INTEGER DEFAULT 0,
    -- User roles system
    user_roles TEXT[] DEFAULT '{}',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Handle existing installations: Add new columns if table already exists
DO $$
BEGIN
    -- Add address fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_street') THEN
        ALTER TABLE users ADD COLUMN address_street VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_city') THEN
        ALTER TABLE users ADD COLUMN address_city VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_state') THEN
        ALTER TABLE users ADD COLUMN address_state VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_country') THEN
        ALTER TABLE users ADD COLUMN address_country VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_postal_code') THEN
        ALTER TABLE users ADD COLUMN address_postal_code VARCHAR(20);
    END IF;

    -- Add rating fields if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rating') THEN
        ALTER TABLE users ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rating_count') THEN
        ALTER TABLE users ADD COLUMN rating_count INTEGER DEFAULT 0;
    END IF;

    -- Add user_roles field if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_roles') THEN
        ALTER TABLE users ADD COLUMN user_roles TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- =================================================================================
-- CREATE ANIMAL CATEGORIES TABLE - Hierarchical structure
-- =================================================================================

CREATE TABLE IF NOT EXISTS animal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES animal_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, parent_id)
);

-- =================================================================================
-- CREATE USER ANIMAL INTERESTS JUNCTION TABLE
-- =================================================================================

CREATE TABLE IF NOT EXISTS user_animal_interests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES animal_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id)
);

-- =================================================================================
-- CREATE USER RATINGS TABLE
-- =================================================================================

CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    transaction_type VARCHAR(50), -- 'purchase', 'sale', 'service', 'other'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rater_id, rated_user_id, transaction_type)
);

-- =================================================================================
-- POPULATE ANIMAL CATEGORIES - Consolidated clean version
-- =================================================================================

-- Clear existing data (use TRUNCATE for clean insert)
TRUNCATE TABLE animal_categories RESTART IDENTITY CASCADE;

-- Level 1: Main categories
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
('Budgerigars', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Doves', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🕊️'),
('Birds of Prey', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦅');

-- Level 2: Dog subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Working Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕‍🦺'),
('Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Toy Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐶'),
('Herding Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Terriers', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Hounds', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕');

-- Level 2: Cat subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Domestic Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱'),
('Wild Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐈‍⬛');

-- Level 2: Reptile subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Lizards', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎'),
('Snakes', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐍'),
('Turtles', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐢');

-- Level 2: Fish subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Bettas', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Goldfish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐟'),
('Tropical Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Marine Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐟');

-- Level 2: Farm Animal subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Cattle', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐄'),
('Horses', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐎'),
('Pigs', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐷'),
('Goats', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐐'),
('Sheep', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐑'),
('Chickens', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐔');

-- Level 3: Parrot species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Conures', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('Cockatiels', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('Cockatoos', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('Macaws', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('Amazons', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('African Greys', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜'),
('Lovebirds', (SELECT id FROM animal_categories WHERE name = 'Parrots' AND level = 2), 3, '🦜');

-- Level 3: Working Dog breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('German Shepherd', (SELECT id FROM animal_categories WHERE name = 'Working Dogs' AND level = 2), 3, '🐕‍🦺'),
('Labrador Retriever', (SELECT id FROM animal_categories WHERE name = 'Working Dogs' AND level = 2), 3, '🐕‍🦺'),
('Golden Retriever', (SELECT id FROM animal_categories WHERE name = 'Working Dogs' AND level = 2), 3, '🐕‍🦺'),
('Border Collie', (SELECT id FROM animal_categories WHERE name = 'Working Dogs' AND level = 2), 3, '🐕‍🦺'),
('Australian Shepherd', (SELECT id FROM animal_categories WHERE name = 'Working Dogs' AND level = 2), 3, '🐕‍🦺');

-- Level 3: Domestic Cat breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Persian', (SELECT id FROM animal_categories WHERE name = 'Domestic Cats' AND level = 2), 3, '🐱'),
('Maine Coon', (SELECT id FROM animal_categories WHERE name = 'Domestic Cats' AND level = 2), 3, '🐱'),
('British Shorthair', (SELECT id FROM animal_categories WHERE name = 'Domestic Cats' AND level = 2), 3, '🐱'),
('American Shorthair', (SELECT id FROM animal_categories WHERE name = 'Domestic Cats' AND level = 2), 3, '🐱'),
('Siamese', (SELECT id FROM animal_categories WHERE name = 'Domestic Cats' AND level = 2), 3, '🐱');

-- Level 3: Lizard species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Bearded Dragons', (SELECT id FROM animal_categories WHERE name = 'Lizards' AND level = 2), 3, '🦎'),
('Geckos', (SELECT id FROM animal_categories WHERE name = 'Lizards' AND level = 2), 3, '🦎'),
('Iguanas', (SELECT id FROM animal_categories WHERE name = 'Lizards' AND level = 2), 3, '🦎'),
('Chameleons', (SELECT id FROM animal_categories WHERE name = 'Lizards' AND level = 2), 3, '🦎');

-- Level 3: Snake species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Ball Pythons', (SELECT id FROM animal_categories WHERE name = 'Snakes' AND level = 2), 3, '🐍'),
('Corn Snakes', (SELECT id FROM animal_categories WHERE name = 'Snakes' AND level = 2), 3, '🐍'),
('King Snakes', (SELECT id FROM animal_categories WHERE name = 'Snakes' AND level = 2), 3, '🐍'),
('Boa Constrictors', (SELECT id FROM animal_categories WHERE name = 'Snakes' AND level = 2), 3, '🐍');

-- Level 3: Turtle species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Red-eared Sliders', (SELECT id FROM animal_categories WHERE name = 'Turtles' AND level = 2), 3, '🐢'),
('Box Turtles', (SELECT id FROM animal_categories WHERE name = 'Turtles' AND level = 2), 3, '🐢'),
('Russian Tortoises', (SELECT id FROM animal_categories WHERE name = 'Turtles' AND level = 2), 3, '🐢');

-- Level 3: Betta varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Crowntail Betta', (SELECT id FROM animal_categories WHERE name = 'Bettas' AND level = 2), 3, '🐠'),
('Halfmoon Betta', (SELECT id FROM animal_categories WHERE name = 'Bettas' AND level = 2), 3, '🐠'),
('Double Tail Betta', (SELECT id FROM animal_categories WHERE name = 'Bettas' AND level = 2), 3, '🐠');

-- Level 3: Tropical Fish species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Angelfish', (SELECT id FROM animal_categories WHERE name = 'Tropical Fish' AND level = 2), 3, '🐠'),
('Discus', (SELECT id FROM animal_categories WHERE name = 'Tropical Fish' AND level = 2), 3, '🐠'),
('Neon Tetras', (SELECT id FROM animal_categories WHERE name = 'Tropical Fish' AND level = 2), 3, '🐠'),
('Guppies', (SELECT id FROM animal_categories WHERE name = 'Tropical Fish' AND level = 2), 3, '🐠');

-- Level 3: Finch species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Zebra Finches', (SELECT id FROM animal_categories WHERE name = 'Finches' AND level = 2), 3, '🐦'),
('Society Finches', (SELECT id FROM animal_categories WHERE name = 'Finches' AND level = 2), 3, '🐦'),
('Gouldian Finches', (SELECT id FROM animal_categories WHERE name = 'Finches' AND level = 2), 3, '🐦');

-- Level 3: Canary varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Yorkshire Canary', (SELECT id FROM animal_categories WHERE name = 'Canaries' AND level = 2), 3, '🐤'),
('Border Canary', (SELECT id FROM animal_categories WHERE name = 'Canaries' AND level = 2), 3, '🐤'),
('Gloster Canary', (SELECT id FROM animal_categories WHERE name = 'Canaries' AND level = 2), 3, '🐤');

-- Level 3: Budgerigar varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('English Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars' AND level = 2), 3, '🦜'),
('Australian Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars' AND level = 2), 3, '🦜');

-- Level 4: Cockatiel varieties (now under Level 3 Cockatiels)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Normal Grey Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels' AND level = 3), 4, '🦜'),
('Pearl Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels' AND level = 3), 4, '🦜'),
('Lutino Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels' AND level = 3), 4, '🦜');

-- Level 3: Dove species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Ring-necked Doves', (SELECT id FROM animal_categories WHERE name = 'Doves' AND level = 2), 3, '🕊️'),
('Diamond Doves', (SELECT id FROM animal_categories WHERE name = 'Doves' AND level = 2), 3, '🕊️');

-- Level 3: Farm Animal breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Holstein Cattle', (SELECT id FROM animal_categories WHERE name = 'Cattle' AND level = 2), 3, '🐄'),
('Angus Cattle', (SELECT id FROM animal_categories WHERE name = 'Cattle' AND level = 2), 3, '🐄'),
('Arabian Horses', (SELECT id FROM animal_categories WHERE name = 'Horses' AND level = 2), 3, '🐎'),
('Quarter Horses', (SELECT id FROM animal_categories WHERE name = 'Horses' AND level = 2), 3, '🐎'),
('Rhode Island Red', (SELECT id FROM animal_categories WHERE name = 'Chickens' AND level = 2), 3, '🐔'),
('Plymouth Rock', (SELECT id FROM animal_categories WHERE name = 'Chickens' AND level = 2), 3, '🐔');

-- Level 4: Specific varieties and morphs
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('American Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Australian Budgerigar' AND level = 3), 4, '🦜'),
('Rainbow Budgie', (SELECT id FROM animal_categories WHERE name = 'English Budgerigar' AND level = 3), 4, '🦜'),
('Clearwing Budgie', (SELECT id FROM animal_categories WHERE name = 'English Budgerigar' AND level = 3), 4, '🦜'),
('Blue Crown Conure', (SELECT id FROM animal_categories WHERE name = 'Conures' AND level = 3), 4, '🦜'),
('Sun Conure', (SELECT id FROM animal_categories WHERE name = 'Conures' AND level = 3), 4, '🦜'),
('Green Cheek Conure', (SELECT id FROM animal_categories WHERE name = 'Conures' AND level = 3), 4, '🦜'),
('Umbrella Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos' AND level = 3), 4, '🦜'),
('Moluccan Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos' AND level = 3), 4, '🦜'),
('Goffin Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos' AND level = 3), 4, '🦜'),
('Blue-fronted Amazon', (SELECT id FROM animal_categories WHERE name = 'Amazons' AND level = 3), 4, '🦜');

-- =================================================================================
-- CREATE PERFORMANCE INDEXES
-- =================================================================================

-- Animal categories indexes
CREATE INDEX IF NOT EXISTS idx_animal_categories_parent_id ON animal_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_animal_categories_level ON animal_categories(level);

-- User animal interests indexes
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_user_id ON user_animal_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_category_id ON user_animal_interests(category_id);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_id ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);

-- Users table indexes for new columns
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);
CREATE INDEX IF NOT EXISTS idx_users_user_roles ON users USING GIN(user_roles);

-- Location-based search optimization indexes for users
CREATE INDEX IF NOT EXISTS idx_users_roles_location ON users USING btree (user_roles, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_breeders_location ON users USING btree (latitude, longitude)
WHERE is_breeder = true AND latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_not_null ON users USING btree (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Location-based search optimization indexes for listings
CREATE INDEX IF NOT EXISTS idx_listings_category_location ON listings USING btree (category_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_status_location ON listings USING btree (status, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_location_not_null ON listings USING btree (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =================================================================================
-- CREATE HIERARCHICAL VIEW
-- =================================================================================

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
  JOIN category_tree ct ON c.parent_id = ct.id
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

-- =================================================================================
-- CREATE RATING CALCULATION FUNCTION
-- =================================================================================

CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rated user's rating and count
  UPDATE users
  SET
    rating = (
      SELECT ROUND(AVG(rating::numeric), 2)
      FROM user_ratings
      WHERE rated_user_id = COALESCE(NEW.rated_user_id, OLD.rated_user_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM user_ratings
      WHERE rated_user_id = COALESCE(NEW.rated_user_id, OLD.rated_user_id)
    )
  WHERE id = COALESCE(NEW.rated_user_id, OLD.rated_user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =================================================================================
-- CREATE TRIGGERS
-- =================================================================================

DROP TRIGGER IF EXISTS trigger_update_user_rating ON user_ratings;
CREATE TRIGGER trigger_update_user_rating
  AFTER INSERT OR UPDATE OR DELETE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- =================================================================================
-- MIGRATION COMPLETE
-- =================================================================================