const User = require('../models/User');
const Listing = require('../models/Listing');

const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's active listings
    const listings = await Listing.findBySeller(user.id, 'active');

    res.json({
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
    });
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

    const users = await User.searchNearby(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseFloat(radius), 
      parseInt(limit)
    );

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

    res.json({
      users: formattedUsers,
      count: formattedUsers.length
    });
  } catch (error) {
    console.error('Find nearby users error:', error);
    res.status(500).json({ error: 'Failed to find nearby users' });
  }
};

module.exports = {
  getUserProfile,
  findNearbyUsers
};