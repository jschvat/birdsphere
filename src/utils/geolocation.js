// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
}

// Convert degrees to radians
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Convert miles to kilometers
function milesToKm(miles) {
  return miles * 1.60934;
}

// Convert kilometers to miles
function kmToMiles(km) {
  return km * 0.621371;
}

// Validate latitude and longitude
function validateCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, error: 'Invalid coordinates: must be numbers' };
  }
  
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Invalid latitude: must be between -90 and 90' };
  }
  
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Invalid longitude: must be between -180 and 180' };
  }
  
  return { isValid: true, latitude: lat, longitude: lng };
}

// Get bounding box for a given center point and radius
function getBoundingBox(latitude, longitude, radiusKm) {
  const lat = toRadians(latitude);
  const lng = toRadians(longitude);
  const R = 6371; // Earth radius in km
  
  const deltaLat = radiusKm / R;
  const deltaLng = Math.asin(Math.sin(radiusKm / R) / Math.cos(lat));
  
  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;
  const minLng = lng - deltaLng;
  const maxLng = lng + deltaLng;
  
  return {
    minLatitude: minLat * (180 / Math.PI),
    maxLatitude: maxLat * (180 / Math.PI),
    minLongitude: minLng * (180 / Math.PI),
    maxLongitude: maxLng * (180 / Math.PI)
  };
}

// Format distance for display
function formatDistance(distanceKm, unit = 'auto') {
  if (unit === 'miles' || (unit === 'auto' && distanceKm > 1.5)) {
    const miles = kmToMiles(distanceKm);
    return `${miles.toFixed(1)} miles`;
  } else {
    return `${distanceKm.toFixed(1)} km`;
  }
}

// Get nearby items using bounding box (more efficient for large datasets)
function isWithinBoundingBox(itemLat, itemLng, centerLat, centerLng, radiusKm) {
  const bbox = getBoundingBox(centerLat, centerLng, radiusKm);
  
  return (
    itemLat >= bbox.minLatitude &&
    itemLat <= bbox.maxLatitude &&
    itemLng >= bbox.minLongitude &&
    itemLng <= bbox.maxLongitude
  );
}

// Sort items by distance
function sortByDistance(items, centerLat, centerLng, latField = 'latitude', lngField = 'longitude') {
  return items.map(item => {
    const distance = calculateDistance(
      centerLat, 
      centerLng, 
      item[latField], 
      item[lngField]
    );
    
    return {
      ...item,
      distance: distance
    };
  }).sort((a, b) => a.distance - b.distance);
}

// Geocoding utilities (for future integration with services like Google Maps)
class GeocodingService {
  // Placeholder for reverse geocoding (coordinates to address)
  static async reverseGeocode(latitude, longitude) {
    // This would integrate with a geocoding service
    // For now, return a placeholder
    return {
      city: null,
      state: null,
      country: null,
      address: `${latitude}, ${longitude}`
    };
  }
  
  // Placeholder for forward geocoding (address to coordinates)
  static async geocode(address) {
    // This would integrate with a geocoding service
    // For now, return null
    return {
      latitude: null,
      longitude: null,
      formattedAddress: address
    };
  }
}

module.exports = {
  calculateDistance,
  validateCoordinates,
  getBoundingBox,
  formatDistance,
  isWithinBoundingBox,
  sortByDistance,
  milesToKm,
  kmToMiles,
  GeocodingService
};