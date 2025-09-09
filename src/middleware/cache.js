const redisClient = require('../config/redis');

const cache = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, data, ttlSeconds = 3600) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  async delPattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
};

const cacheMiddleware = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    try {
      const key = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : keyGenerator;

      const cachedData = await cache.get(key);
      
      if (cachedData) {
        return res.json(cachedData);
      }

      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data) {
          cache.set(key, data, ttl);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const cacheKeys = {
  categories: 'categories:all',
  category: (id) => `category:${id}`,
  listings: (params) => {
    const { page = 1, limit = 20, category, location, species, priceMin, priceMax } = params;
    return `listings:${page}:${limit}:${category || 'all'}:${location || 'all'}:${species || 'all'}:${priceMin || 0}:${priceMax || 'max'}`;
  },
  user: (id) => `user:${id}`,
  userListings: (userId, page = 1) => `user:${userId}:listings:${page}`,
  nearbyBreeders: (lat, lng, radius) => `breeders:${lat}:${lng}:${radius}`
};

module.exports = {
  cache,
  cacheMiddleware,
  cacheKeys
};