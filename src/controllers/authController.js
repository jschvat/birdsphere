const User = require('../models/User');
const { cache, cacheKeys } = require('../middleware/cache');

const register = async (req, res) => {
  try {
    const userData = req.validatedData;

    // Check if user already exists
    const existingUserByEmail = await User.findByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUserByUsername = await User.findByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create new user
    const user = await User.create(userData);
    const token = User.generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        phone: user.phone,
        bio: user.bio,
        profileImage: user.profile_image,
        locationCity: user.location_city,
        locationState: user.location_state,
        locationCountry: user.location_country,
        latitude: user.latitude ? parseFloat(user.latitude) : null,
        longitude: user.longitude ? parseFloat(user.longitude) : null,
        location: {
          city: user.location_city,
          state: user.location_state,
          country: user.location_country,
          coordinates: user.latitude && user.longitude ? {
            latitude: parseFloat(user.latitude),
            longitude: parseFloat(user.longitude)
          } : null
        },
        isBreeder: user.is_breeder,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.validatedData;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate token
    const token = User.generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        phone: user.phone,
        bio: user.bio,
        profileImage: user.profile_image,
        locationCity: user.location_city,
        locationState: user.location_state,
        locationCountry: user.location_country,
        latitude: user.latitude ? parseFloat(user.latitude) : null,
        longitude: user.longitude ? parseFloat(user.longitude) : null,
        location: {
          city: user.location_city,
          state: user.location_state,
          country: user.location_country,
          coordinates: user.latitude && user.longitude ? {
            latitude: parseFloat(user.latitude),
            longitude: parseFloat(user.longitude)
          } : null
        },
        isBreeder: user.is_breeder,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('getProfile - Raw user from database:', JSON.stringify(user, null, 2));

    const response = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      phone: user.phone,
      bio: user.bio,
      profileImage: user.profile_image,
      locationCity: user.location_city,
      locationState: user.location_state,
      locationCountry: user.location_country,
      latitude: user.latitude ? parseFloat(user.latitude) : null,
      longitude: user.longitude ? parseFloat(user.longitude) : null,
      location: {
        city: user.location_city,
        state: user.location_state,
        country: user.location_country,
        coordinates: user.latitude && user.longitude ? {
          latitude: parseFloat(user.latitude),
          longitude: parseFloat(user.longitude)
        } : null
      },
      isBreeder: user.is_breeder,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log('updateProfile - Request body:', JSON.stringify(req.body, null, 2));
    console.log('updateProfile - Validated data:', JSON.stringify(req.validatedData, null, 2));
    
    const updates = {};
    const userData = req.validatedData;

    // Map camelCase to snake_case for database
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name',
      locationCity: 'location_city',
      locationState: 'location_state',
      locationCountry: 'location_country',
      isBreeder: 'is_breeder',
      profileImage: 'profile_image'
    };

    for (const [key, value] of Object.entries(userData)) {
      const dbField = fieldMapping[key] || key;
      console.log(`updateProfile - Mapping ${key} to ${dbField}`);
      updates[dbField] = value;
    }

    console.log('updateProfile - Updates to apply:', JSON.stringify(updates, null, 2));
    
    const updatedUser = await User.update(req.user.id, updates);
    
    console.log('updateProfile - Updated user from database:', JSON.stringify(updatedUser, null, 2));
    
    // Invalidate user-related caches
    await Promise.all([
      cache.del(cacheKeys.user(req.user.username)),
      cache.delPattern(`user:${req.user.username}:listings:*`),
      cache.delPattern('breeders:*')
    ]);
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        username: updatedUser.username,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        profileImage: updatedUser.profile_image,
        locationCity: updatedUser.location_city,
        locationState: updatedUser.location_state,
        locationCountry: updatedUser.location_country,
        latitude: updatedUser.latitude ? parseFloat(updatedUser.latitude) : null,
        longitude: updatedUser.longitude ? parseFloat(updatedUser.longitude) : null,
        location: {
          city: updatedUser.location_city,
          state: updatedUser.location_state,
          country: updatedUser.location_country,
          coordinates: updatedUser.latitude && updatedUser.longitude ? {
            latitude: parseFloat(updatedUser.latitude),
            longitude: parseFloat(updatedUser.longitude)
          } : null
        },
        isBreeder: updatedUser.is_breeder,
        isVerified: updatedUser.is_verified,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    await User.delete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  deleteAccount
};