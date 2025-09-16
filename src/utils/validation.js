/**
 * Validation Utilities
 * 
 * Centralized validation schemas and middleware for the BirdSphere API.
 * Uses Joi for comprehensive data validation with detailed error messages.
 * 
 * Features:
 * - Request body validation middleware
 * - Query parameter validation middleware
 * - Reusable validation schemas for all entities
 * - Detailed error formatting
 * - Type coercion and default values
 */

const Joi = require('joi');

// Common validation patterns
const commonPatterns = {
  uuid: Joi.string().uuid(),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/),
  coordinates: {
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  },
  location: {
    city: Joi.string().max(100).trim(),
    state: Joi.string().max(50).trim(),
    country: Joi.string().max(50).trim()
  },
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  },
  price: Joi.number().min(0).max(99999.99),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
};

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
  bio: Joi.string().max(500).optional().allow(''),
  locationCity: Joi.string().max(100).optional().allow(''),
  locationState: Joi.string().max(50).optional().allow(''),
  locationCountry: Joi.string().max(50).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  isBreeder: Joi.boolean().default(false)
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required()
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow(''),
  bio: Joi.string().max(500).optional().allow(''),
  profileImage: Joi.string().optional().allow(''),
  locationCity: Joi.string().max(100).optional().allow(''),
  locationState: Joi.string().max(50).optional().allow(''),
  locationCountry: Joi.string().max(50).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
  // New fields for extended user profile
  userRoles: Joi.array().items(Joi.string().valid('breeder', 'buyer', 'enthusiast', 'trainer', 'rescue_operator')).optional(),
  animalInterests: Joi.array().items(Joi.number().integer()).optional(),
  addressStreet: Joi.string().max(255).optional().allow(''),
  addressCity: Joi.string().max(100).optional().allow(''),
  addressState: Joi.string().max(100).optional().allow(''),
  addressCountry: Joi.string().max(100).optional().allow(''),
  addressPostalCode: Joi.string().max(20).optional().allow(''),
  // Keep for backward compatibility
  isBreeder: Joi.boolean().optional()
});

const listingSchema = Joi.object({
  categoryId: Joi.string().uuid().required(),
  title: Joi.string().min(5).max(255).required(),
  description: Joi.string().min(10).max(2000).required(),
  price: Joi.number().min(0).max(99999.99).required(),
  currency: Joi.string().valid('USD', 'EUR', 'GBP', 'CAD').default('USD'),
  species: Joi.string().max(100).optional(),
  breed: Joi.string().max(100).optional(),
  age: Joi.string().max(50).optional(),
  sex: Joi.string().valid('Male', 'Female', 'Unknown').optional(),
  color: Joi.string().max(100).optional(),
  healthStatus: Joi.string().max(255).optional(),
  vaccinationStatus: Joi.string().max(255).optional(),
  shippingAvailable: Joi.boolean().default(false),
  localPickupOnly: Joi.boolean().default(true),
  locationCity: Joi.string().max(100).optional(),
  locationState: Joi.string().max(50).optional(),
  locationCountry: Joi.string().max(50).optional(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional()
});

const updateListingSchema = Joi.object({
  title: Joi.string().min(5).max(255).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  price: Joi.number().min(0).max(99999.99).optional(),
  species: Joi.string().max(100).optional().allow(''),
  breed: Joi.string().max(100).optional().allow(''),
  age: Joi.string().max(50).optional().allow(''),
  sex: Joi.string().valid('Male', 'Female', 'Unknown').optional().allow(''),
  color: Joi.string().max(100).optional().allow(''),
  healthStatus: Joi.string().max(255).optional().allow(''),
  vaccinationStatus: Joi.string().max(255).optional().allow(''),
  shippingAvailable: Joi.boolean().optional(),
  localPickupOnly: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'sold', 'pending', 'inactive').optional()
});

const messageSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required()
});

const searchSchema = Joi.object({
  query: Joi.string().max(100).optional(),
  category: Joi.string().uuid().optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  species: Joi.string().max(100).optional(),
  breed: Joi.string().max(100).optional(),
  sex: Joi.string().valid('Male', 'Female', 'Unknown').optional(),
  location: Joi.string().max(100).optional(),
  radius: Joi.number().min(1).max(500).default(50),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  shippingAvailable: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sortBy: Joi.string().valid('created_at', 'price', 'distance').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).optional().allow('')
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedData = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.validatedQuery = value;
    next();
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  listingSchema,
  updateListingSchema,
  messageSchema,
  searchSchema,
  reviewSchema,
  validate,
  validateQuery
};