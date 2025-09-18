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

    // Get user ratings
    const ratings = await User.getUserRatings(user.id, 5);

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
        address: {
          street: user.address_street,
          city: user.address_city,
          state: user.address_state,
          country: user.address_country,
          postalCode: user.address_postal_code
        },
        userRoles: user.user_roles || [],
        rating: parseFloat(user.rating) || 0,
        ratingCount: user.rating_count || 0,
        animalInterests: user.animalInterests || [],
        isVerified: user.is_verified,
        createdAt: user.created_at,
        recentRatings: ratings
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
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

const findNearbyUsers = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20, userRoles, animalInterests } = req.query;
    
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

    const options = {};
    if (userRoles) {
      options.userRoles = Array.isArray(userRoles) ? userRoles : [userRoles];
    }
    if (animalInterests) {
      options.animalInterests = Array.isArray(animalInterests) ? animalInterests.map(Number) : [Number(animalInterests)];
    }

    const users = await User.searchNearby(lat, lng, radiusKm, parseInt(limit), options);

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
      userRoles: user.user_roles || [],
      rating: parseFloat(user.rating) || 0,
      ratingCount: user.rating_count || 0,
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
        userRoles: user.user_roles || [],
        rating: parseFloat(user.rating) || 0,
        ratingCount: user.rating_count || 0,
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
      address: {
        street: user.address_street,
        city: user.address_city,
        state: user.address_state,
        country: user.address_country,
        postalCode: user.address_postal_code
      },
      userRoles: user.user_roles || [],
      rating: parseFloat(user.rating) || 0,
      ratingCount: user.rating_count || 0,
      animalInterests: user.animalInterests || [],
      isVerified: user.is_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Filter allowed fields (rating is excluded as it's set by other users)
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'bio', 'profileImage',
      'locationCity', 'locationState', 'locationCountry',
      'latitude', 'longitude', 'userRoles',
      'addressStreet', 'addressCity', 'addressState', 'addressCountry', 'addressPostalCode',
      'animalInterests'
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

    // Clear user cache after update
    await cache.del(cacheKeys.user(updatedUser.username));
    await cache.del(cacheKeys.user(updatedUser.id));

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
        address: {
          street: updatedUser.address_street,
          city: updatedUser.address_city,
          state: updatedUser.address_state,
          country: updatedUser.address_country,
          postalCode: updatedUser.address_postal_code
        },
        userRoles: updatedUser.user_roles || [],
        rating: parseFloat(updatedUser.rating) || 0,
        ratingCount: updatedUser.rating_count || 0,
        animalInterests: updatedUser.animalInterests || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// New endpoints for animal categories and ratings
const getAnimalCategories = async (req, res) => {
  try {
    const categories = await User.getAnimalCategoriesTree();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get animal categories' });
  }
};

const addUserRating = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rating, comment, transactionType } = req.body;
    const raterId = req.user.id;

    if (raterId === userId) {
      return res.status(400).json({ error: 'Cannot rate yourself' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ratingRecord = await User.addRating(raterId, userId, rating, comment, transactionType);

    res.json({
      message: 'Rating added successfully',
      rating: ratingRecord
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add rating' });
  }
};

const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const ratings = await User.getUserRatings(userId, limit);

    res.json({ ratings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user ratings' });
  }
};

module.exports = {
  getUserProfile,
  findNearbyUsers,
  getAllUsers,
  getCurrentUserProfile,
  updateProfile,
  getAnimalCategories,
  addUserRating,
  getUserRatings
};