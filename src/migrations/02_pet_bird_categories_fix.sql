-- ====================================================================
-- PET BIRD CATEGORIES FIX
-- Replaces wild bird categories with actual pet bird categories
-- Focuses on birds that people actually breed and keep as pets
-- ====================================================================

-- REMOVE WILD BIRD CATEGORIES THAT ARE NOT PETS
-- These are not appropriate for a pet breeding platform

-- Remove Birds of Prey (illegal to own as pets in most places)
DELETE FROM animal_categories WHERE name IN (
    'Hawks', 'Eagles', 'Falcons', 'Owls', 'Vultures',
    'Red-tailed Hawk', 'Cooper''s Hawk', 'Sharp-shinned Hawk', 'Harris''s Hawk',
    'Bald Eagle', 'Golden Eagle', 'Steller''s Sea Eagle',
    'Peregrine Falcon', 'Gyrfalcon', 'American Kestrel', 'Merlin',
    'Great Horned Owl', 'Barn Owl', 'Screech Owl', 'Great Grey Owl'
);

-- Remove wild waterfowl (keep only pet-friendly species)
DELETE FROM animal_categories WHERE name IN (
    'Trumpeter Swan', 'Whooper Swan', 'Canada Goose', 'Greylag Goose',
    'Mallard Duck', 'Wood Duck'  -- These are wild, not domestic pet breeds
);

-- Remove exotic softbills (zoo birds, not pets)
DELETE FROM animal_categories WHERE name IN (
    'Softbills', 'Toucans', 'Hornbills', 'Bee-eaters',
    'Toco Toucan', 'Keel-billed Toucan', 'Channel-billed Toucan'
);

-- Remove wild pheasants (keep domestic game birds only)
DELETE FROM animal_categories WHERE name IN (
    'Ring-necked Pheasant', 'Golden Pheasant', 'Silver Pheasant',
    'Reeves Pheasant', 'Lady Amherst Pheasant'  -- These are wild/hunting birds
);

-- ====================================================================
-- ADD MISSING COMMON PET BIRD CATEGORIES
-- ====================================================================

-- Add missing pet parrot species that are actually common in breeding
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: Missing common pet parrot categories
('Caiques', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Senegal Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Eclectus Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Pionus Parrots', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜'),
('Parrotlets', (SELECT id FROM animal_categories WHERE name = 'Parrots'), 3, '🦜');

-- Level 4: Caique Species (Popular pet parrots)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Black-headed Caique', (SELECT id FROM animal_categories WHERE name = 'Caiques'), 4, '🦜'),
('White-bellied Caique', (SELECT id FROM animal_categories WHERE name = 'Caiques'), 4, '🦜');

-- Level 4: Senegal Parrot Types
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Standard Senegal Parrot', (SELECT id FROM animal_categories WHERE name = 'Senegal Parrots'), 4, '🦜'),
('Meyer''s Parrot', (SELECT id FROM animal_categories WHERE name = 'Senegal Parrots'), 4, '🦜'),
('Red-bellied Parrot', (SELECT id FROM animal_categories WHERE name = 'Senegal Parrots'), 4, '🦜');

-- Level 4: Eclectus Parrot Types
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Grand Eclectus', (SELECT id FROM animal_categories WHERE name = 'Eclectus Parrots'), 4, '🦜'),
('Solomon Island Eclectus', (SELECT id FROM animal_categories WHERE name = 'Eclectus Parrots'), 4, '🦜'),
('Red-sided Eclectus', (SELECT id FROM animal_categories WHERE name = 'Eclectus Parrots'), 4, '🦜');

-- Level 4: Pionus Parrot Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Blue-headed Pionus', (SELECT id FROM animal_categories WHERE name = 'Pionus Parrots'), 4, '🦜'),
('Maximilian Pionus', (SELECT id FROM animal_categories WHERE name = 'Pionus Parrots'), 4, '🦜'),
('White-capped Pionus', (SELECT id FROM animal_categories WHERE name = 'Pionus Parrots'), 4, '🦜');

-- Level 4: Parrotlet Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Pacific Parrotlet', (SELECT id FROM animal_categories WHERE name = 'Parrotlets'), 4, '🦜'),
('Green-rumped Parrotlet', (SELECT id FROM animal_categories WHERE name = 'Parrotlets'), 4, '🦜'),
('Spectacled Parrotlet', (SELECT id FROM animal_categories WHERE name = 'Parrotlets'), 4, '🦜');

-- ====================================================================
-- ADD COCKATIEL COLOR MUTATIONS (MAJOR MISSING CATEGORY)
-- ====================================================================

-- Level 4: Comprehensive Cockatiel Color Mutations (Popular breeding focus)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Normal Grey Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Lutino Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('White-face Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Pied Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Pearl Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Cinnamon Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Albino Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Silver Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Fallow Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Olive Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Emerald Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜'),
('Pastel Face Cockatiel', (SELECT id FROM animal_categories WHERE name = 'Cockatiels'), 4, '🦜');

-- ====================================================================
-- ADD LOVEBIRD COLOR MUTATIONS
-- ====================================================================

-- Level 4: Popular Lovebird Color Mutations
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Normal Green Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Lutino Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Dutch Blue Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Violet Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Opaline Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Pied Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜'),
('Cinnamon Lovebird', (SELECT id FROM animal_categories WHERE name = 'Peach-faced Lovebird'), 4, '🦜');

-- ====================================================================
-- REPLACE WATERFOWL WITH PET-FOCUSED CATEGORIES
-- ====================================================================

-- Update waterfowl to focus on pet-friendly domestic breeds
DELETE FROM animal_categories WHERE name = 'Waterfowl';

-- Add pet-friendly poultry categories under Farm Animals instead
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 2: Pet Poultry (under Farm Animals, not Birds)
('Pet Poultry', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐔');

-- Level 3: Pet Poultry Categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Bantam Chickens', (SELECT id FROM animal_categories WHERE name = 'Pet Poultry'), 3, '🐔'),
('Pet Ducks', (SELECT id FROM animal_categories WHERE name = 'Pet Poultry'), 3, '🦆'),
('Ornamental Chickens', (SELECT id FROM animal_categories WHERE name = 'Pet Poultry'), 3, '🐔');

-- Level 4: Bantam Chicken Breeds (Popular pet chickens)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Silkie Bantam', (SELECT id FROM animal_categories WHERE name = 'Bantam Chickens'), 4, '🐔'),
('Japanese Bantam', (SELECT id FROM animal_categories WHERE name = 'Bantam Chickens'), 4, '🐔'),
('Serama Bantam', (SELECT id FROM animal_categories WHERE name = 'Bantam Chickens'), 4, '🐔'),
('Old English Game Bantam', (SELECT id FROM animal_categories WHERE name = 'Bantam Chickens'), 4, '🐔'),
('Dutch Bantam', (SELECT id FROM animal_categories WHERE name = 'Bantam Chickens'), 4, '🐔');

-- Level 4: Pet Duck Breeds (Domestic, pet-friendly only)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Call Duck', (SELECT id FROM animal_categories WHERE name = 'Pet Ducks'), 4, '🦆'),
('Black East Indian Duck', (SELECT id FROM animal_categories WHERE name = 'Pet Ducks'), 4, '🦆'),
('Silver Bantam Duck', (SELECT id FROM animal_categories WHERE name = 'Pet Ducks'), 4, '🦆'),
('Miniature Silver Appleyard', (SELECT id FROM animal_categories WHERE name = 'Pet Ducks'), 4, '🦆'),
('Australian Spotted Duck', (SELECT id FROM animal_categories WHERE name = 'Pet Ducks'), 4, '🦆');

-- Level 4: Ornamental Chicken Breeds (Pet-focused, not commercial)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Polish Chicken', (SELECT id FROM animal_categories WHERE name = 'Ornamental Chickens'), 4, '🐔'),
('Frizzle Chicken', (SELECT id FROM animal_categories WHERE name = 'Ornamental Chickens'), 4, '🐔'),
('Sultan Chicken', (SELECT id FROM animal_categories WHERE name = 'Ornamental Chickens'), 4, '🐔'),
('Phoenix Chicken', (SELECT id FROM animal_categories WHERE name = 'Ornamental Chickens'), 4, '🐔');

-- ====================================================================
-- KEEP DOMESTIC GAME BIRDS (Remove wild ones, keep pet-friendly)
-- ====================================================================

-- Update Game Birds to focus on domestic/pet varieties only
-- Keep: Quail (domestic), Peafowl (ornamental), Guinea Fowl (domestic)
-- Remove: Wild pheasants (already deleted above)

-- Add domestic-only pheasant if any
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Domestic Pheasants', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🦃');

-- Level 4: Only truly domestic pheasant varieties
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Melanistic Mutant Pheasant', (SELECT id FROM animal_categories WHERE name = 'Domestic Pheasants'), 4, '🦃');

-- ====================================================================
-- COMPLETION MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'PET BIRD CATEGORIES FIX COMPLETED!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'REMOVED wild birds not suitable as pets:';
    RAISE NOTICE '- All birds of prey (illegal as pets)';
    RAISE NOTICE '- Wild waterfowl (replaced with pet ducks)';
    RAISE NOTICE '- Exotic softbills (zoo birds, not pets)';
    RAISE NOTICE '- Wild pheasants (hunting birds, not pets)';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ADDED missing common pet bird categories:';
    RAISE NOTICE '- Cockatiel color mutations (% varieties)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Cockatiel%');
    RAISE NOTICE '- Lovebird color mutations (% varieties)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Lovebird%');
    RAISE NOTICE '- Common pet parrots (Caique, Senegal, Eclectus, Pionus, Parrotlets)';
    RAISE NOTICE '- Pet poultry (bantam chickens, call ducks)';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL ANIMAL CATEGORIES NOW: %', (SELECT COUNT(*) FROM animal_categories);
    RAISE NOTICE 'NOW FOCUSED ON ACTUAL PET BREEDING!';
    RAISE NOTICE '================================================';
END $$;