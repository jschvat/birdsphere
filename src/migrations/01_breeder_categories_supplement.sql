-- ====================================================================
-- BREEDER CATEGORIES SUPPLEMENT MIGRATION
-- Professional breeding categories extension for BirdSphere
-- Adds comprehensive categories for professional and hobby breeders
-- ====================================================================

-- Add missing small mammal categories for rabbit breeders
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 2: Small Mammal subcategories (missing from base)
('Rabbits', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐰'),
('Chinchillas', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🐭'),
('Hedgehogs', (SELECT id FROM animal_categories WHERE name = 'Farm Animals' AND parent_id IS NULL), 2, '🦔');

-- Level 3: Rabbit Categories by Purpose
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Dwarf Rabbits', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Lop-Eared Rabbits', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Rex Rabbits', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Commercial Meat Rabbits', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰'),
('Angora Rabbits', (SELECT id FROM animal_categories WHERE name = 'Rabbits'), 3, '🐰');

-- Level 4: Specific Rabbit Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Dwarf Breeds
('Netherland Dwarf', (SELECT id FROM animal_categories WHERE name = 'Dwarf Rabbits'), 4, '🐰'),
('Polish', (SELECT id FROM animal_categories WHERE name = 'Dwarf Rabbits'), 4, '🐰'),
('Britannia Petite', (SELECT id FROM animal_categories WHERE name = 'Dwarf Rabbits'), 4, '🐰'),
-- Lop-Eared Breeds
('Holland Lop', (SELECT id FROM animal_categories WHERE name = 'Lop-Eared Rabbits'), 4, '🐰'),
('Mini Lop', (SELECT id FROM animal_categories WHERE name = 'Lop-Eared Rabbits'), 4, '🐰'),
('French Lop', (SELECT id FROM animal_categories WHERE name = 'Lop-Eared Rabbits'), 4, '🐰'),
('English Lop', (SELECT id FROM animal_categories WHERE name = 'Lop-Eared Rabbits'), 4, '🐰'),
('Velveteen Lop', (SELECT id FROM animal_categories WHERE name = 'Lop-Eared Rabbits'), 4, '🐰'),
-- Rex Breeds
('Mini Rex', (SELECT id FROM animal_categories WHERE name = 'Rex Rabbits'), 4, '🐰'),
('Standard Rex', (SELECT id FROM animal_categories WHERE name = 'Rex Rabbits'), 4, '🐰'),
-- Commercial Breeds
('New Zealand', (SELECT id FROM animal_categories WHERE name = 'Commercial Meat Rabbits'), 4, '🐰'),
('Californian', (SELECT id FROM animal_categories WHERE name = 'Commercial Meat Rabbits'), 4, '🐰'),
('Flemish Giant', (SELECT id FROM animal_categories WHERE name = 'Commercial Meat Rabbits'), 4, '🐰'),
('Champagne d''Argent', (SELECT id FROM animal_categories WHERE name = 'Commercial Meat Rabbits'), 4, '🐰'),
-- Angora Breeds
('English Angora', (SELECT id FROM animal_categories WHERE name = 'Angora Rabbits'), 4, '🐰'),
('French Angora', (SELECT id FROM animal_categories WHERE name = 'Angora Rabbits'), 4, '🐰'),
('German Angora', (SELECT id FROM animal_categories WHERE name = 'Angora Rabbits'), 4, '🐰'),
('Satin Angora', (SELECT id FROM animal_categories WHERE name = 'Angora Rabbits'), 4, '🐰');

-- Add missing dog breeds for professional breeding
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: More Working Dog Breeds
('Mastiff', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Saint Bernard', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Newfoundland', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Bernese Mountain Dog', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Akita', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
('Alaskan Malamute', (SELECT id FROM animal_categories WHERE name = 'Working Dogs'), 3, '🐕'),
-- Level 3: More Sporting Dog Breeds
('Pointer', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Setter (English)', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Setter (Irish)', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Weimaraner', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
('Vizsla', (SELECT id FROM animal_categories WHERE name = 'Sporting Dogs'), 3, '🐕'),
-- Level 3: More Terrier Breeds
('Bull Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Jack Russell Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Scottish Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('West Highland White Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
('Airedale Terrier', (SELECT id FROM animal_categories WHERE name = 'Terriers'), 3, '🐕'),
-- Level 3: More Hound Breeds
('Bloodhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Greyhound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Whippet', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Basset Hound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕'),
('Afghan Hound', (SELECT id FROM animal_categories WHERE name = 'Hounds'), 3, '🐕');

-- Add missing cat breeds for professional breeding
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: More Longhair Cat Breeds
('Himalayan', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Turkish Angora', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Birman', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
('Somali', (SELECT id FROM animal_categories WHERE name = 'Long Hair Cats'), 3, '🐱'),
-- Level 3: More Shorthair Cat Breeds
('Abyssinian', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Burmese', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Oriental Shorthair', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Egyptian Mau', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Manx', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
('Bombay', (SELECT id FROM animal_categories WHERE name = 'Short Hair Cats'), 3, '🐱'),
-- Level 3: Hairless Cat Breeds
('Donskoy', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱'),
('Peterbald', (SELECT id FROM animal_categories WHERE name = 'Hairless Cats'), 3, '🐱');

-- Add comprehensive reptile morphs and mutations for breeders
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: Python Species
('Ball Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Reticulated Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
('Burmese Python', (SELECT id FROM animal_categories WHERE name = 'Snakes'), 3, '🐍'),
-- Level 3: More Gecko Species
('Tokay Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('Day Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎'),
('African Fat-Tailed Gecko', (SELECT id FROM animal_categories WHERE name = 'Geckos'), 3, '🦎');

-- Level 4: Ball Python Morphs (Professional Breeding Categories)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Albino Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Spider Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Pied Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Clown Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Banana Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Champagne Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Fire Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Pastel Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Mojave Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍'),
('Lesser Ball Python', (SELECT id FROM animal_categories WHERE name = 'Ball Python'), 4, '🐍');

-- Level 4: Leopard Gecko Morphs
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Carrothead Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Bell Albino Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Dreamsicle Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Mack Snow Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Rainwater Albino Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Tremper Albino Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Eclipse Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎'),
('Blizzard Leopard Gecko', (SELECT id FROM animal_categories WHERE name = 'Leopard Gecko'), 4, '🦎');

-- Level 4: Crested Gecko Morphs
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Dalmatian Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Crested Gecko'), 4, '🦎'),
('Harlequin Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Crested Gecko'), 4, '🦎'),
('Moonglow Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Crested Gecko'), 4, '🦎'),
('Phantom Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Crested Gecko'), 4, '🦎'),
('Tiger Crested Gecko', (SELECT id FROM animal_categories WHERE name = 'Crested Gecko'), 4, '🦎');

-- Level 4: Bearded Dragon Morphs
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Albino Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎'),
('Tiger Leatherback Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎'),
('Paradox Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎'),
('Silkback Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎'),
('Hypomelanistic Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎'),
('Translucent Bearded Dragon', (SELECT id FROM animal_categories WHERE name = 'Bearded Dragon'), 4, '🦎');

-- Add exotic small mammal categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 1: Exotic Pets category
('Exotic Small Mammals', NULL, 1, '🐿️');

-- Level 2: Exotic Small Mammal Categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Hamsters & Gerbils', (SELECT id FROM animal_categories WHERE name = 'Exotic Small Mammals' AND parent_id IS NULL), 2, '🐹'),
('Sugar Gliders', (SELECT id FROM animal_categories WHERE name = 'Exotic Small Mammals' AND parent_id IS NULL), 2, '🐿️'),
('Exotic Rodents', (SELECT id FROM animal_categories WHERE name = 'Exotic Small Mammals' AND parent_id IS NULL), 2, '🐭');

-- Level 3: Hamster & Gerbil Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Syrian Hamster', (SELECT id FROM animal_categories WHERE name = 'Hamsters & Gerbils'), 3, '🐹'),
('Dwarf Hamsters', (SELECT id FROM animal_categories WHERE name = 'Hamsters & Gerbils'), 3, '🐹'),
('Mongolian Gerbil', (SELECT id FROM animal_categories WHERE name = 'Hamsters & Gerbils'), 3, '🐭'),
('Duprasi Gerbil', (SELECT id FROM animal_categories WHERE name = 'Hamsters & Gerbils'), 3, '🐭');

-- Level 4: Dwarf Hamster Types
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Roborovski Hamster', (SELECT id FROM animal_categories WHERE name = 'Dwarf Hamsters'), 4, '🐹'),
('Winter White Hamster', (SELECT id FROM animal_categories WHERE name = 'Dwarf Hamsters'), 4, '🐹'),
('Campbell''s Hamster', (SELECT id FROM animal_categories WHERE name = 'Dwarf Hamsters'), 4, '🐹'),
('Chinese Hamster', (SELECT id FROM animal_categories WHERE name = 'Dwarf Hamsters'), 4, '🐹');

-- Level 3: Exotic Rodent Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Chinchilla', (SELECT id FROM animal_categories WHERE name = 'Exotic Rodents'), 3, '🐭'),
('Degu', (SELECT id FROM animal_categories WHERE name = 'Exotic Rodents'), 3, '🐭'),
('Fancy Rat', (SELECT id FROM animal_categories WHERE name = 'Exotic Rodents'), 3, '🐭'),
('Fancy Mouse', (SELECT id FROM animal_categories WHERE name = 'Exotic Rodents'), 3, '🐭');

-- Add more comprehensive finch categories for breeders
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: Finch Categories
('Estrildid Finches', (SELECT id FROM animal_categories WHERE name = 'Finches'), 3, '🐦'),
('True Finches', (SELECT id FROM animal_categories WHERE name = 'Finches'), 3, '🐦'),
('Waxbills', (SELECT id FROM animal_categories WHERE name = 'Finches'), 3, '🐦');

-- Level 4: Popular Finch Species for Breeders
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Estrildid Finches
('Zebra Finch', (SELECT id FROM animal_categories WHERE name = 'Estrildid Finches'), 4, '🐦'),
('Society Finch', (SELECT id FROM animal_categories WHERE name = 'Estrildid Finches'), 4, '🐦'),
('Gouldian Finch', (SELECT id FROM animal_categories WHERE name = 'Estrildid Finches'), 4, '🐦'),
('Star Finch', (SELECT id FROM animal_categories WHERE name = 'Estrildid Finches'), 4, '🐦'),
-- Waxbills
('Orange Cheek Waxbill', (SELECT id FROM animal_categories WHERE name = 'Waxbills'), 4, '🐦'),
('Lavender Waxbill', (SELECT id FROM animal_categories WHERE name = 'Waxbills'), 4, '🐦'),
('Red Avadavat', (SELECT id FROM animal_categories WHERE name = 'Waxbills'), 4, '🐦'),
-- True Finches
('Canary', (SELECT id FROM animal_categories WHERE name = 'True Finches'), 4, '🐤'),
('European Goldfinch', (SELECT id FROM animal_categories WHERE name = 'True Finches'), 4, '🐦'),
('Siskin', (SELECT id FROM animal_categories WHERE name = 'True Finches'), 4, '🐦');

-- ====================================================================
-- MAJOR MISSING BIRD CATEGORIES FOR PROFESSIONAL BREEDERS
-- ====================================================================

-- Add missing Level 2 bird categories
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 2: Major missing bird categories
('Waterfowl', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦆'),
('Game Birds', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🐓'),
('Pigeons', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🕊️'),
('Softbills', (SELECT id FROM animal_categories WHERE name = 'Birds' AND parent_id IS NULL), 2, '🦜');

-- Level 3: Waterfowl Categories (HUGE breeding industry)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Ducks', (SELECT id FROM animal_categories WHERE name = 'Waterfowl'), 3, '🦆'),
('Geese', (SELECT id FROM animal_categories WHERE name = 'Waterfowl'), 3, '🪿'),
('Swans', (SELECT id FROM animal_categories WHERE name = 'Waterfowl'), 3, '🦢');

-- Level 4: Duck Breeds (120+ breeds worldwide)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Pekin Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Muscovy Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Khaki Campbell Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Rouen Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Aylesbury Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Call Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Indian Runner Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Mallard Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Wood Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆'),
('Mandarin Duck', (SELECT id FROM animal_categories WHERE name = 'Ducks'), 4, '🦆');

-- Level 4: Goose Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Embden Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿'),
('Toulouse Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿'),
('Chinese Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿'),
('African Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿'),
('Greylag Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿'),
('Canada Goose', (SELECT id FROM animal_categories WHERE name = 'Geese'), 4, '🪿');

-- Level 4: Swan Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Mute Swan', (SELECT id FROM animal_categories WHERE name = 'Swans'), 4, '🦢'),
('Black Swan', (SELECT id FROM animal_categories WHERE name = 'Swans'), 4, '🦢'),
('Trumpeter Swan', (SELECT id FROM animal_categories WHERE name = 'Swans'), 4, '🦢'),
('Whooper Swan', (SELECT id FROM animal_categories WHERE name = 'Swans'), 4, '🦢'),
('Black-Necked Swan', (SELECT id FROM animal_categories WHERE name = 'Swans'), 4, '🦢');

-- Level 3: Game Bird Categories (Multi-million dollar industry)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Quail', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🐦'),
('Pheasants', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🦃'),
('Peafowl', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🦚'),
('Guinea Fowl', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🦚'),
('Partridges', (SELECT id FROM animal_categories WHERE name = 'Game Birds'), 3, '🐦');

-- Level 4: Quail Species (Major commercial breeding)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Coturnix Quail', (SELECT id FROM animal_categories WHERE name = 'Quail'), 4, '🐦'),
('Bobwhite Quail', (SELECT id FROM animal_categories WHERE name = 'Quail'), 4, '🐦'),
('Button Quail', (SELECT id FROM animal_categories WHERE name = 'Quail'), 4, '🐦'),
('California Quail', (SELECT id FROM animal_categories WHERE name = 'Quail'), 4, '🐦'),
('Japanese Quail', (SELECT id FROM animal_categories WHERE name = 'Quail'), 4, '🐦');

-- Level 4: Pheasant Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Ring-necked Pheasant', (SELECT id FROM animal_categories WHERE name = 'Pheasants'), 4, '🦃'),
('Golden Pheasant', (SELECT id FROM animal_categories WHERE name = 'Pheasants'), 4, '🦃'),
('Silver Pheasant', (SELECT id FROM animal_categories WHERE name = 'Pheasants'), 4, '🦃'),
('Reeves Pheasant', (SELECT id FROM animal_categories WHERE name = 'Pheasants'), 4, '🦃'),
('Lady Amherst Pheasant', (SELECT id FROM animal_categories WHERE name = 'Pheasants'), 4, '🦃');

-- Level 4: Peafowl Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Indian Peafowl', (SELECT id FROM animal_categories WHERE name = 'Peafowl'), 4, '🦚'),
('Green Peafowl', (SELECT id FROM animal_categories WHERE name = 'Peafowl'), 4, '🦚'),
('Congo Peafowl', (SELECT id FROM animal_categories WHERE name = 'Peafowl'), 4, '🦚'),
('White Peafowl', (SELECT id FROM animal_categories WHERE name = 'Peafowl'), 4, '🦚');

-- Level 4: Guinea Fowl Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Helmeted Guinea Fowl', (SELECT id FROM animal_categories WHERE name = 'Guinea Fowl'), 4, '🦚'),
('French Guinea Fowl', (SELECT id FROM animal_categories WHERE name = 'Guinea Fowl'), 4, '🦚'),
('Pearl Guinea Fowl', (SELECT id FROM animal_categories WHERE name = 'Guinea Fowl'), 4, '🦚');

-- Level 3: Pigeon Categories (800+ breeds worldwide!)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Racing Pigeons', (SELECT id FROM animal_categories WHERE name = 'Pigeons'), 3, '🕊️'),
('Fancy Pigeons', (SELECT id FROM animal_categories WHERE name = 'Pigeons'), 3, '🕊️'),
('Utility Pigeons', (SELECT id FROM animal_categories WHERE name = 'Pigeons'), 3, '🕊️');

-- Level 4: Racing/Homing Pigeon Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Racing Homer', (SELECT id FROM animal_categories WHERE name = 'Racing Pigeons'), 4, '🕊️'),
('Janssen Pigeon', (SELECT id FROM animal_categories WHERE name = 'Racing Pigeons'), 4, '🕊️'),
('Sion Pigeon', (SELECT id FROM animal_categories WHERE name = 'Racing Pigeons'), 4, '🕊️'),
('Homing Pigeon', (SELECT id FROM animal_categories WHERE name = 'Racing Pigeons'), 4, '🕊️');

-- Level 4: Fancy Pigeon Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Fantail Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('Jacobin Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('Pouter Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('Tumbler Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('Frillback Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('English Trumpeter', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️'),
('Owl Pigeon', (SELECT id FROM animal_categories WHERE name = 'Fancy Pigeons'), 4, '🕊️');

-- Level 4: Utility Pigeon Breeds
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('King Pigeon', (SELECT id FROM animal_categories WHERE name = 'Utility Pigeons'), 4, '🕊️'),
('Carneau Pigeon', (SELECT id FROM animal_categories WHERE name = 'Utility Pigeons'), 4, '🕊️'),
('Giant Homer', (SELECT id FROM animal_categories WHERE name = 'Utility Pigeons'), 4, '🕊️'),
('Runt Pigeon', (SELECT id FROM animal_categories WHERE name = 'Utility Pigeons'), 4, '🕊️');

-- Level 3: Softbill Categories (Exotic bird breeders)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Toucans', (SELECT id FROM animal_categories WHERE name = 'Softbills'), 3, '🦜'),
('Hornbills', (SELECT id FROM animal_categories WHERE name = 'Softbills'), 3, '🦜'),
('Mynahs', (SELECT id FROM animal_categories WHERE name = 'Softbills'), 3, '🦜'),
('Bee-eaters', (SELECT id FROM animal_categories WHERE name = 'Softbills'), 3, '🦜');

-- Level 4: Toucan Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Toco Toucan', (SELECT id FROM animal_categories WHERE name = 'Toucans'), 4, '🦜'),
('Keel-billed Toucan', (SELECT id FROM animal_categories WHERE name = 'Toucans'), 4, '🦜'),
('Channel-billed Toucan', (SELECT id FROM animal_categories WHERE name = 'Toucans'), 4, '🦜');

-- Level 4: Mynah Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Hill Mynah', (SELECT id FROM animal_categories WHERE name = 'Mynahs'), 4, '🦜'),
('Common Mynah', (SELECT id FROM animal_categories WHERE name = 'Mynahs'), 4, '🦜'),
('Bali Mynah', (SELECT id FROM animal_categories WHERE name = 'Mynahs'), 4, '🦜');

-- Expand Birds of Prey subcategories (currently no subcategories)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: Birds of Prey Categories
('Hawks', (SELECT id FROM animal_categories WHERE name = 'Birds of Prey'), 3, '🦅'),
('Eagles', (SELECT id FROM animal_categories WHERE name = 'Birds of Prey'), 3, '🦅'),
('Falcons', (SELECT id FROM animal_categories WHERE name = 'Birds of Prey'), 3, '🦅'),
('Owls', (SELECT id FROM animal_categories WHERE name = 'Birds of Prey'), 3, '🦉'),
('Vultures', (SELECT id FROM animal_categories WHERE name = 'Birds of Prey'), 3, '🦅');

-- Level 4: Hawk Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Red-tailed Hawk', (SELECT id FROM animal_categories WHERE name = 'Hawks'), 4, '🦅'),
('Cooper''s Hawk', (SELECT id FROM animal_categories WHERE name = 'Hawks'), 4, '🦅'),
('Sharp-shinned Hawk', (SELECT id FROM animal_categories WHERE name = 'Hawks'), 4, '🦅'),
('Harris''s Hawk', (SELECT id FROM animal_categories WHERE name = 'Hawks'), 4, '🦅');

-- Level 4: Eagle Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Bald Eagle', (SELECT id FROM animal_categories WHERE name = 'Eagles'), 4, '🦅'),
('Golden Eagle', (SELECT id FROM animal_categories WHERE name = 'Eagles'), 4, '🦅'),
('Steller''s Sea Eagle', (SELECT id FROM animal_categories WHERE name = 'Eagles'), 4, '🦅');

-- Level 4: Falcon Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Peregrine Falcon', (SELECT id FROM animal_categories WHERE name = 'Falcons'), 4, '🦅'),
('Gyrfalcon', (SELECT id FROM animal_categories WHERE name = 'Falcons'), 4, '🦅'),
('American Kestrel', (SELECT id FROM animal_categories WHERE name = 'Falcons'), 4, '🦅'),
('Merlin', (SELECT id FROM animal_categories WHERE name = 'Falcons'), 4, '🦅');

-- Level 4: Owl Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Great Horned Owl', (SELECT id FROM animal_categories WHERE name = 'Owls'), 4, '🦉'),
('Barn Owl', (SELECT id FROM animal_categories WHERE name = 'Owls'), 4, '🦉'),
('Screech Owl', (SELECT id FROM animal_categories WHERE name = 'Owls'), 4, '🦉'),
('Great Grey Owl', (SELECT id FROM animal_categories WHERE name = 'Owls'), 4, '🦉');

-- Expand Dove species (currently just the category)
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
-- Level 3: Dove Categories
('Mourning Doves', (SELECT id FROM animal_categories WHERE name = 'Doves'), 3, '🕊️'),
('Turtle Doves', (SELECT id FROM animal_categories WHERE name = 'Doves'), 3, '🕊️'),
('Diamond Doves', (SELECT id FROM animal_categories WHERE name = 'Doves'), 3, '🕊️'),
('Ringneck Doves', (SELECT id FROM animal_categories WHERE name = 'Doves'), 3, '🕊️');

-- Level 4: Dove Species
INSERT INTO animal_categories (name, parent_id, level, icon) VALUES
('Mourning Dove', (SELECT id FROM animal_categories WHERE name = 'Mourning Doves'), 4, '🕊️'),
('White-winged Dove', (SELECT id FROM animal_categories WHERE name = 'Mourning Doves'), 4, '🕊️'),
('European Turtle Dove', (SELECT id FROM animal_categories WHERE name = 'Turtle Doves'), 4, '🕊️'),
('Diamond Dove', (SELECT id FROM animal_categories WHERE name = 'Diamond Doves'), 4, '🕊️'),
('Barbary Dove', (SELECT id FROM animal_categories WHERE name = 'Ringneck Doves'), 4, '🕊️'),
('Ring-necked Dove', (SELECT id FROM animal_categories WHERE name = 'Ringneck Doves'), 4, '🕊️');

-- ====================================================================
-- UPDATE COMPLETION MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'BREEDER CATEGORIES SUPPLEMENT COMPLETED!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Added categories for:';
    RAISE NOTICE '- Professional rabbit breeding (% breeds)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Rabbit%' OR name LIKE '%Lop%' OR name LIKE '%Rex%' OR name LIKE '%Angora%');
    RAISE NOTICE '- Exotic small mammals (% categories)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Hamster%' OR name LIKE '%Gerbil%' OR name LIKE '%Chinchilla%' OR name LIKE '%Sugar Glider%');
    RAISE NOTICE '- Reptile morphs and mutations (% morphs)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Ball Python%' OR name LIKE '%Gecko%' OR name LIKE '%Dragon%');
    RAISE NOTICE '- Additional dog and cat breeds for professional breeding';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'MAJOR BIRD BREEDING INDUSTRIES ADDED:';
    RAISE NOTICE '================================================';
    RAISE NOTICE '- Waterfowl breeding (% species)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Duck%' OR name LIKE '%Goose%' OR name LIKE '%Swan%');
    RAISE NOTICE '- Game bird breeding (% species)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Quail%' OR name LIKE '%Pheasant%' OR name LIKE '%Peafowl%' OR name LIKE '%Guinea%');
    RAISE NOTICE '- Pigeon breeding (% breeds)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Pigeon%');
    RAISE NOTICE '- Birds of prey categories (% species)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Hawk%' OR name LIKE '%Eagle%' OR name LIKE '%Falcon%' OR name LIKE '%Owl%');
    RAISE NOTICE '- Softbill exotic birds (% species)', (SELECT COUNT(*) FROM animal_categories WHERE name LIKE '%Toucan%' OR name LIKE '%Mynah%');
    RAISE NOTICE '- Comprehensive finch and dove categories';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'TOTAL ANIMAL CATEGORIES NOW: %', (SELECT COUNT(*) FROM animal_categories);
    RAISE NOTICE '================================================';
END $$;