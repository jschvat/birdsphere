-- BirdSphere Seed Data

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Birds', 'All types of birds'),
('Reptiles', 'Snakes, lizards, turtles, and other reptiles'),
('Small Mammals', 'Rabbits, ferrets, guinea pigs, and other small mammals'),
('Exotic Pets', 'Unusual and exotic animals');

-- Insert bird subcategories
INSERT INTO categories (name, description, parent_id) VALUES
('Parrots', 'Macaws, cockatoos, conures, and other parrots', (SELECT id FROM categories WHERE name = 'Birds')),
('Finches', 'Canaries, zebra finches, and other finches', (SELECT id FROM categories WHERE name = 'Birds')),
('Cockatiels', 'All cockatiel varieties', (SELECT id FROM categories WHERE name = 'Birds')),
('Budgerigars', 'Budgies and parakeets', (SELECT id FROM categories WHERE name = 'Birds')),
('Lovebirds', 'All lovebird species', (SELECT id FROM categories WHERE name = 'Birds')),
('Game Birds', 'Chickens, quail, and other game birds', (SELECT id FROM categories WHERE name = 'Birds'));

-- Insert reptile subcategories
INSERT INTO categories (name, description, parent_id) VALUES
('Snakes', 'Ball pythons, corn snakes, and other serpents', (SELECT id FROM categories WHERE name = 'Reptiles')),
('Lizards', 'Bearded dragons, geckos, and other lizards', (SELECT id FROM categories WHERE name = 'Reptiles')),
('Turtles & Tortoises', 'Aquatic and terrestrial chelonians', (SELECT id FROM categories WHERE name = 'Reptiles'));

-- Insert small mammal subcategories
INSERT INTO categories (name, description, parent_id) VALUES
('Rabbits', 'Domestic rabbits of all breeds', (SELECT id FROM categories WHERE name = 'Small Mammals')),
('Guinea Pigs', 'Cavies and guinea pig varieties', (SELECT id FROM categories WHERE name = 'Small Mammals')),
('Ferrets', 'Domestic ferrets', (SELECT id FROM categories WHERE name = 'Small Mammals'));