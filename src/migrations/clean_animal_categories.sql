-- Clean Animal Categories Migration
-- Date: 2025-09-15
-- Description: Clean rebuild of animal categories with only desired categories

-- Clear and rebuild animal categories
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