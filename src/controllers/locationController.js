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

const searchLocations = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    // Simple location search - in a real app, you'd use a geocoding service
    const mockLocations = [
      { name: 'Seattle, WA', coordinates: { lat: 47.6062, lng: -122.3321 } },
      { name: 'Los Angeles, CA', coordinates: { lat: 34.0522, lng: -118.2437 } },
      { name: 'New York, NY', coordinates: { lat: 40.7128, lng: -74.0060 } },
      { name: 'Chicago, IL', coordinates: { lat: 41.8781, lng: -87.6298 } },
      { name: 'Houston, TX', coordinates: { lat: 29.7604, lng: -95.3698 } }
    ];

    const filteredLocations = mockLocations.filter(location =>
      location.name.toLowerCase().includes(query.toLowerCase())
    );

    res.json({
      query,
      locations: filteredLocations,
      count: filteredLocations.length
    });
  } catch (error) {
    console.error('Search locations error:', error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
};

module.exports = {
  getNearbyListings,
  getNearbyBreeders,
  calculateDistanceBetweenPoints,
  searchLocations
};