const { validateCoordinates, calculateDistance, formatDistance } = require('../utils/geolocation');
const User = require('../models/User');
const Listing = require('../models/Listing');

const getNearbyListings = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, category, species, maxPrice } = req.query;
    
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const filters = {
      latitude: validation.latitude,
      longitude: validation.longitude,
      radius: parseFloat(radius),
      category,
      species,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit: 50
    };

    const listings = await Listing.search(filters);
    
    const formattedListings = listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      price: parseFloat(listing.price),
      currency: listing.currency,
      species: listing.species,
      breed: listing.breed,
      location: {
        city: listing.location_city,
        state: listing.location_state,
        country: listing.location_country
      },
      distance: listing.distance ? {
        km: parseFloat(listing.distance),
        formatted: formatDistance(parseFloat(listing.distance))
      } : null,
      seller: {
        username: listing.username,
        firstName: listing.first_name,
        lastName: listing.last_name,
        isBreeder: listing.is_breeder
      },
      mediaCount: listing.media_count || 0,
      createdAt: listing.created_at
    }));

    res.json({
      listings: formattedListings,
      searchCenter: {
        latitude: validation.latitude,
        longitude: validation.longitude
      },
      searchRadius: parseFloat(radius),
      count: formattedListings.length
    });
  } catch (error) {
    console.error('Get nearby listings error:', error);
    res.status(500).json({ error: 'Failed to get nearby listings' });
  }
};

const getNearbyBreeders = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20 } = req.query;
    
    const validation = validateCoordinates(latitude, longitude);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Find nearby users who are breeders
    const users = await User.searchNearby(
      validation.latitude,
      validation.longitude,
      parseFloat(radius),
      parseInt(limit)
    );
    
    // Filter only breeders
    const breeders = users.filter(user => user.is_breeder);
    
    const formattedBreeders = breeders.map(breeder => ({
      id: breeder.id,
      username: breeder.username,
      firstName: breeder.first_name,
      lastName: breeder.last_name,
      profileImage: breeder.profile_image,
      location: {
        city: breeder.location_city,
        state: breeder.location_state
      },
      distance: {
        km: parseFloat(breeder.distance),
        formatted: formatDistance(parseFloat(breeder.distance))
      },
      isBreeder: breeder.is_breeder
    }));

    res.json({
      breeders: formattedBreeders,
      searchCenter: {
        latitude: validation.latitude,
        longitude: validation.longitude
      },
      searchRadius: parseFloat(radius),
      count: formattedBreeders.length
    });
  } catch (error) {
    console.error('Get nearby breeders error:', error);
    res.status(500).json({ error: 'Failed to get nearby breeders' });
  }
};

const calculateDistanceBetweenPoints = async (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.query;
    
    const point1 = validateCoordinates(lat1, lng1);
    const point2 = validateCoordinates(lat2, lng2);
    
    if (!point1.isValid) {
      return res.status(400).json({ error: `Point 1: ${point1.error}` });
    }
    
    if (!point2.isValid) {
      return res.status(400).json({ error: `Point 2: ${point2.error}` });
    }

    const distance = calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude
    );

    res.json({
      distance: {
        km: parseFloat(distance.toFixed(2)),
        miles: parseFloat((distance * 0.621371).toFixed(2)),
        formatted: formatDistance(distance)
      },
      points: {
        point1: { latitude: point1.latitude, longitude: point1.longitude },
        point2: { latitude: point2.latitude, longitude: point2.longitude }
      }
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({ error: 'Failed to calculate distance' });
  }
};

module.exports = {
  getNearbyListings,
  getNearbyBreeders,
  calculateDistanceBetweenPoints
};