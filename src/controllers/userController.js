const User = require('../models/User');
const Listing = require('../models/Listing');
const { cache, cacheKeys } = require('../middleware/cache');

const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const cacheKey = cacheKeys.user(username);
    
    // Try to get from cache first
    const cachedProfile = await cache.get(cacheKey);
    if (cachedProfile) {
      return res.json(cachedProfile);
    }
    
    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's active listings
    const listings = await Listing.findBySeller(user.id, 'active');

    const response = {
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        profileImage: user.profile_image,
        location: {
          city: user.location_city,
          state: user.location_state,
          country: user.location_country
        },
        isBreeder: user.is_breeder,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      listings: listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        price: parseFloat(listing.price),
        currency: listing.currency,
        species: listing.species,
        breed: listing.breed,
        mediaCount: listing.media_count || 0,
        category: {
          name: listing.category_name
        },
        createdAt: listing.created_at
      })),
      listingCount: listings.length
    };
    
    // Cache user profile for 30 minutes (1800 seconds)
    await cache.set(cacheKey, response, 1800);

    res.json(response);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

const findNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = parseFloat(radius);
    const cacheKey = cacheKeys.nearbyBreeders(lat, lng, radiusKm);
    
    // Try to get from cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const users = await User.searchNearby(lat, lng, radiusKm, parseInt(limit));

    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      profileImage: user.profile_image,
      location: {
        city: user.location_city,
        state: user.location_state
      },
      isBreeder: user.is_breeder,
      distance: parseFloat(user.distance)
    }));

    const response = {
      users: formattedUsers,
      count: formattedUsers.length
    };
    
    // Cache nearby breeders for 20 minutes (1200 seconds)
    await cache.set(cacheKey, response, 1200);

    res.json(response);
  } catch (error) {
    console.error('Find nearby users error:', error);
    res.status(500).json({ error: 'Failed to find nearby users' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;

    const users = await User.findAll({
      limit,
      offset,
      publicOnly: true
    });

    const response = {
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        isBreeder: user.is_breeder,
        location: {
          city: user.location_city,
          state: user.location_state,
          country: user.location_country
        },
        createdAt: user.created_at
      })),
      pagination: {
        page,
        limit,
        hasMore: users.length === limit
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      bio: user.bio,
      profileImage: user.profile_image,
      location: {
        city: user.location_city,
        state: user.location_state,
        country: user.location_country,
        coordinates: user.latitude && user.longitude ? {
          latitude: user.latitude,
          longitude: user.longitude
        } : null
      },
      isBreeder: user.is_breeder,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    res.json(response);
  } catch (error) {
    console.error('Get current user profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Filter allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'bio', 'profileImage',
      'locationCity', 'locationState', 'locationCountry',
      'latitude', 'longitude', 'isBreeder'
    ];

    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedUser = await User.update(userId, filteredUpdates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        profileImage: updatedUser.profile_image,
        location: {
          city: updatedUser.location_city,
          state: updatedUser.location_state,
          country: updatedUser.location_country
        },
        isBreeder: updatedUser.is_breeder
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  getUserProfile,
  findNearbyUsers,
  getAllUsers,
  getCurrentUserProfile,
  updateProfile
};