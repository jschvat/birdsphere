-- Migration: Update User Schema with Extended Features
-- Date: 2025-09-15
-- Description: Add address, rating, user roles, and animal interests hierarchy

-- Add new columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Remove the simple is_breeder column and replace with role system
ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_roles TEXT[] DEFAULT '{}';

-- Create animal categories table for hierarchical structure
CREATE TABLE IF NOT EXISTS animal_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES animal_categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, parent_id)
);

-- Create user animal interests junction table
CREATE TABLE IF NOT EXISTS user_animal_interests (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES animal_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id)
);

-- Create user ratings table for tracking who rated whom
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

-- Insert base animal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 1: Main categories
('Birds', NULL, 1, '🐦'),
('Dogs', NULL, 1, '🐕'),
('Cats', NULL, 1, '🐱'),
('Reptiles', NULL, 1, '🦎'),
('Fish', NULL, 1, '🐠'),
('Small Mammals', NULL, 1, '🐹'),
('Farm Animals', NULL, 1, '🐄'),
('Exotic Animals', NULL, 1, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Bird subcategories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Parrots', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Finches', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🐦'),
('Canaries', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🐤'),
('Cockatiels', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Budgerigars', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜'),
('Doves', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🕊️'),
('Birds of Prey', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦅')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Parrot breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Conures', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Cockatoos', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Macaws', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('African Greys', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Amazons', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Lovebirds', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Indian Ringnecks', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Quaker Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 4: Comprehensive Conure Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Sun Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Green Cheek Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Blue Crown Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Nanday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Cherry Head Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Mitred Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Orange Wing Amazon', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Jenday Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Pineapple Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Cinnamon Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Gold Cap Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜'),
('Red Factor Conure', (SELECT id FROM animal_categories WHERE name = 'Conures'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

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
('American Budgerigar', (SELECT id FROM animal_categories WHERE name = 'Budgerigars'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

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
('Alexandrine Parakeet', (SELECT id FROM animal_categories WHERE name = 'Indian Ringnecks'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

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
('Black-cheeked Lovebird', (SELECT id FROM animal_categories WHERE name = 'Lovebirds'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

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
('Fallow Quaker Parrot', (SELECT id FROM animal_categories WHERE name = 'Quaker Parrots'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Canary Types (Song, Color, Type)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Song Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤'),
('Color Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤'),
('Type Canaries', (SELECT id FROM animal_categories WHERE name = 'Canaries'), 3, '🐤')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 4: Song Canary Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('American Singer Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('German Roller Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Waterslager Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Spanish Timbrado Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤'),
('Russian Singer Canary', (SELECT id FROM animal_categories WHERE name = 'Song Canaries'), 4, '🐤')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 4: Type Canary Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Yorkshire Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Norwich Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Border Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Gloster Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Fife Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Lizard Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Crested Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤'),
('Scotch Fancy Canary', (SELECT id FROM animal_categories WHERE name = 'Type Canaries'), 4, '🐤')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 4: Color Canary Varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Red Factor Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Yellow Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('White Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Bronze Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Cinnamon Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Isabel Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Agate Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤'),
('Pastel Canary', (SELECT id FROM animal_categories WHERE name = 'Color Canaries'), 4, '🐤')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 4: Cockatoo breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Umbrella Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Sulphur-crested Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Moluccan Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜'),
('Goffin Cockatoo', (SELECT id FROM animal_categories WHERE name = 'Cockatoos'), 4, '🦜')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Dog categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Working Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Toy Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Terriers', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Hounds', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Herding Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕'),
('Non-Sporting Dogs', (SELECT id FROM animal_categories WHERE name = 'Dogs' AND parent_id IS NULL), 2, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Working Dog Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Akita', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Alaskan Malamute', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Bernese Mountain Dog', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Boxer', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Bullmastiff', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Doberman Pinscher', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('German Shepherd', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Great Dane', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Great Pyrenees', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Mastiff', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Newfoundland', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Rottweiler', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Saint Bernard', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Siberian Husky', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Sporting Dog Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Brittany', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Chesapeake Bay Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Cocker Spaniel', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('English Setter', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('German Shorthaired Pointer', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Golden Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Irish Setter', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Labrador Retriever', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Portuguese Water Dog', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Springer Spaniel', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Vizsla', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Weimaraner', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Toy Dog Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Cavalier King Charles Spaniel', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Chihuahua', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Chinese Crested', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Havanese', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Italian Greyhound', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Japanese Chin', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Maltese', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Papillon', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Pekingese', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Pomeranian', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Pug', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Shih Tzu', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕'),
('Yorkshire Terrier', (SELECT id FROM animal_categories WHERE name = 'Toy Dogs'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Terrier Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Airedale Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('American Staffordshire Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Boston Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Bull Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Cairn Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Fox Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Jack Russell Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Miniature Schnauzer', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Scottish Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Staffordshire Bull Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('West Highland White Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Hound Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Afghan Hound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Basset Hound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Beagle', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Bloodhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Dachshund', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Greyhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Irish Wolfhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Norwegian Elkhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Rhodesian Ridgeback', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Saluki', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Whippet', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Herding Dog Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Australian Cattle Dog', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Australian Shepherd', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Belgian Malinois', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Border Collie', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Collie', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Old English Sheepdog', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Pembroke Welsh Corgi', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕'),
('Shetland Sheepdog', (SELECT id FROM animal_categories WHERE name = 'Herding Dogs'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Non-Sporting Dog Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('American Eskimo Dog', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Bichon Frise', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Bulldog', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Chow Chow', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Dalmatian', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('French Bulldog', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Keeshond', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Lhasa Apso', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Poodle', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Schipperke', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Shiba Inu', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Tibetan Spaniel', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕'),
('Tibetan Terrier', (SELECT id FROM animal_categories WHERE name = 'Non-Sporting Dogs'), 3, '🐕')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Cat categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Long Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱'),
('Short Hair Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱'),
('Hairless Cats', (SELECT id FROM animal_categories WHERE name = 'Cats' AND parent_id IS NULL), 2, '🐱')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Long Hair Cat Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Persian', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Maine Coon', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Ragdoll', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Norwegian Forest Cat', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Siberian', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Birman', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Himalayan', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Turkish Angora', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Balinese', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Somali', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Short Hair Cat Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('British Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('American Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Siamese', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Russian Blue', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Scottish Fold', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Abyssinian', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Bengal', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Burmese', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Egyptian Mau', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Exotic Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Manx', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Oriental Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Bombay', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Chartreux', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Hairless Cat Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Sphynx', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱'),
('Peterbald', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱'),
('Donskoy', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱'),
('Ukrainian Levkoy', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Reptile categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Snakes', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐍'),
('Lizards', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎'),
('Turtles', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐢'),
('Tortoises', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🐢'),
('Geckos', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎'),
('Iguanas', (SELECT id FROM animal_categories WHERE name = 'Reptiles' AND parent_id IS NULL), 2, '🦎')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Snake Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Ball Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Corn Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Boa Constrictor', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('California King Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Milk Snake', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Rainbow Boa', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Rosy Boa', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Sand Boa', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Reticulated Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Burmese Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Lizard Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Blue Tongue Skink', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Monitor Lizard', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Chameleon', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Anole', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Tegu', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎'),
('Uromastyx', (SELECT id FROM animal_categories WHERE name = 'Lizards'), 3, '🦎')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Gecko Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Tokay Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('House Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Gargoyle Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Fat-tailed Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Iguana Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Green Iguana', (SELECT id FROM animal_categories WHERE name = 'Iguanas'), 3, '🦎'),
('Blue Iguana', (SELECT id FROM animal_categories WHERE name = 'Iguanas'), 3, '🦎'),
('Desert Iguana', (SELECT id FROM animal_categories WHERE name = 'Iguanas'), 3, '🦎'),
('Marine Iguana', (SELECT id FROM animal_categories WHERE name = 'Iguanas'), 3, '🦎')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Turtle Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Red-eared Slider', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢'),
('Box Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢'),
('Painted Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢'),
('Map Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢'),
('Musk Turtle', (SELECT id FROM animal_categories WHERE name = 'Turtles'), 3, '🐢')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Tortoise Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Russian Tortoise', (SELECT id FROM animal_categories WHERE name = 'Tortoises'), 3, '🐢'),
('Hermann Tortoise', (SELECT id FROM animal_categories WHERE name = 'Tortoises'), 3, '🐢'),
('Sulcata Tortoise', (SELECT id FROM animal_categories WHERE name = 'Tortoises'), 3, '🐢'),
('Redfoot Tortoise', (SELECT id FROM animal_categories WHERE name = 'Tortoises'), 3, '🐢'),
('Greek Tortoise', (SELECT id FROM animal_categories WHERE name = 'Tortoises'), 3, '🐢')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Fish categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Freshwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Saltwater Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Tropical Fish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Goldfish', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Bettas', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠'),
('Cichlids', (SELECT id FROM animal_categories WHERE name = 'Fish' AND parent_id IS NULL), 2, '🐠')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Freshwater Fish Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Angelfish', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Guppy', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Molly', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Platy', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Swordtail', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Tetra', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Barb', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Danio', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Corydoras', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠'),
('Loach', (SELECT id FROM animal_categories WHERE name = 'Freshwater Fish'), 3, '🐠')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Saltwater Fish Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Clownfish', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Tang', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Wrasse', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Angelfish (Marine)', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Butterflyfish', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Grouper', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠'),
('Damselfish', (SELECT id FROM animal_categories WHERE name = 'Saltwater Fish'), 3, '🐠')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Small Mammal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Rabbits', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐰'),
('Guinea Pigs', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐹'),
('Hamsters', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐹'),
('Ferrets', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐹'),
('Chinchillas', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐹'),
('Rats', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐭'),
('Mice', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🐭'),
('Hedgehogs', (SELECT id FROM animal_categories WHERE name = 'Small Mammals' AND parent_id IS NULL), 2, '🦔')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Rabbit Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Holland Lop', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Netherland Dwarf', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Mini Rex', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Lionhead', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Flemish Giant', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Angora', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Dutch', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('New Zealand', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Farm Animal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Chickens', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐔'),
('Goats', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐐'),
('Sheep', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐑'),
('Pigs', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐷'),
('Cattle', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐄'),
('Horses', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐴'),
('Donkeys', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🫏'),
('Ducks', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🦆'),
('Geese', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🪿'),
('Turkeys', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🦃')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 3: Chicken Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Rhode Island Red', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Leghorn', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Plymouth Rock', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Orpington', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Sussex', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Wyandotte', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Bantam', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔'),
('Silkie', (SELECT id FROM animal_categories WHERE name = 'Chickens'), 3, '🐔')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Level 2: Exotic Animal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Primates', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🐒'),
('Sugar Gliders', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🐿️'),
('Skunks', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🦨'),
('Foxes', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🦊'),
('Raccoons', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🦝'),
('Coatimundi', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🐾'),
('Kinkajou', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🐾'),
('Serval', (SELECT id FROM animal_categories WHERE name = 'Exotic Animals' AND parent_id IS NULL), 2, '🐆')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_animal_categories_parent_id ON animal_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_animal_categories_level ON animal_categories(level);
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_user_id ON user_animal_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_animal_interests_category_id ON user_animal_interests(category_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_id ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating);
CREATE INDEX IF NOT EXISTS idx_users_user_roles ON users USING GIN(user_roles);

-- Create function to update user rating when new rating is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create trigger to automatically update user rating
DROP TRIGGER IF EXISTS trigger_update_user_rating ON user_ratings;
CREATE TRIGGER trigger_update_user_rating
    AFTER INSERT OR UPDATE OR DELETE ON user_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();

-- Update existing users to have default role array
UPDATE users
SET user_roles = CASE
    WHEN is_breeder = true THEN ARRAY['breeder']
    ELSE ARRAY['buyer']
END
WHERE user_roles = '{}' OR user_roles IS NULL;

-- Create view for hierarchical animal categories
CREATE OR REPLACE VIEW animal_category_hierarchy AS
WITH RECURSIVE category_tree AS (
    -- Base case: top-level categories
    SELECT
        id,
        name,
        parent_id,
        level,
        icon,
        name::TEXT as full_path,
        ARRAY[id] as path_ids
    FROM animal_categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: child categories
    SELECT
        c.id,
        c.name,
        c.parent_id,
        c.level,
        c.icon,
        (ct.full_path || ' → ' || c.name)::TEXT as full_path,
        ct.path_ids || c.id as path_ids
    FROM animal_categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY level, full_path;

COMMENT ON TABLE animal_categories IS 'Hierarchical animal category structure for user interests';
COMMENT ON TABLE user_animal_interests IS 'Junction table linking users to their animal interests';
COMMENT ON TABLE user_ratings IS 'User ratings and reviews system';
COMMENT ON COLUMN users.user_roles IS 'Array of user roles: breeder, buyer, enthusiast, trainer, rescue_operator';
COMMENT ON COLUMN users.rating IS 'Average rating from other users (1-5 stars)';
COMMENT ON COLUMN users.rating_count IS 'Total number of ratings received';