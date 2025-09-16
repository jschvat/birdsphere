-- Add new profile fields to users table
ALTER TABLE users
ADD COLUMN address TEXT,
ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN rating_count INTEGER DEFAULT 0,
ADD COLUMN user_types TEXT[] DEFAULT '{}',
ADD COLUMN animal_interests JSONB DEFAULT '[]';

-- Create index on user_types for faster filtering
CREATE INDEX idx_users_user_types ON users USING GIN (user_types);

-- Create index on animal_interests for faster searches
CREATE INDEX idx_users_animal_interests ON users USING GIN (animal_interests);

-- Add comment explaining the new fields
COMMENT ON COLUMN users.address IS 'Physical address of the user';
COMMENT ON COLUMN users.rating IS 'Average rating given by other users (0.0-5.0)';
COMMENT ON COLUMN users.rating_count IS 'Total number of ratings received';
COMMENT ON COLUMN users.user_types IS 'Array of user types: breeder, buyer, enthusiast, trainer';
COMMENT ON COLUMN users.animal_interests IS 'JSON array of animal types and specific breeds the user is interested in';