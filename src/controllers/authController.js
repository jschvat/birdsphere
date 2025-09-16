/**
 * Authentication Controller Module
 * 
 * Handles all authentication-related HTTP endpoints for the BirdSphere application.
 * Implements secure user registration, login, profile management, and session handling
 * using JWT tokens stored in httpOnly cookies with Redis-based token management.
 * 
 * Key Features:
 * - Secure user registration with validation and conflict checking
 * - JWT-based authentication with httpOnly cookie storage
 * - Token management with Redis storage and device tracking
 * - Profile management with cache invalidation
 * - Session management and secure logout
 * - Account deletion with token revocation
 * 
 * Security Implementations:
 * - Password hashing with bcrypt (handled by User model)
 * - JWT tokens with secure random token IDs
 * - httpOnly cookies preventing XSS token theft
 * - Device fingerprinting and IP tracking
 * - Automatic token revocation on logout/deletion
 * - Input validation through middleware
 * 
 * Performance Features:
 * - Redis caching for user data and sessions
 * - Cache invalidation on profile updates
 * - Optimized database queries through User model
 * - Efficient token storage and retrieval
 * 
 * API Endpoints:
 * - POST /register - Create new user account
 * - POST /login - Authenticate existing user  
 * - GET /profile - Get current user profile
 * - PUT /profile - Update user profile information
 * - POST /logout - End user session
 * - DELETE /account - Permanently delete user account
 * 
 * @fileoverview Authentication controller with JWT and Redis-based session management
 * @author Birdsphere Development Team
 */

const User = require('../models/User');
const { cache, cacheKeys } = require('../middleware/cache');
const tokenService = require('../services/tokenService');

/**
 * User Registration Endpoint
 * 
 * Creates a new user account with comprehensive validation, conflict checking,
 * and automatic authentication. Implements secure token generation and storage
 * using JWT with httpOnly cookies and Redis-based session management.
 * 
 * Registration Flow:
 * 1. Extract validated user data from middleware
 * 2. Check for existing users by email and username
 * 3. Create new user with encrypted password
 * 4. Generate secure JWT token with device tracking
 * 5. Store token in Redis with device information
 * 6. Set httpOnly authentication cookie
 * 7. Return user profile and token (for compatibility)
 * 
 * Security Features:
 * - Input validation through middleware (req.validatedData)
 * - Email and username uniqueness enforcement
 * - Password encryption handled by User model
 * - Secure token generation with random token IDs
 * - Device fingerprinting and IP tracking
 * - httpOnly cookies preventing XSS attacks
 * - Redis-based token storage and management
 * 
 * Error Handling:
 * - 409 Conflict: Email or username already exists
 * - 500 Internal Server Error: Database or server errors
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.validatedData - Validated user registration data from middleware
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with user data and authentication token
 */
const register = async (req, res) => {
  try {
    // Extract pre-validated user data from validation middleware
    const userData = req.validatedData;

    // Conflict Prevention: Check if email is already registered
    const existingUserByEmail = await User.findByEmail(userData.email);
    if (existingUserByEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Conflict Prevention: Check if username is already taken
    const existingUserByUsername = await User.findByUsername(userData.username);
    if (existingUserByUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create new user account (password hashing handled by User model)
    const user = await User.create(userData);
    
    // Generate secure token with Redis storage
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      fingerprint: req.headers['x-fingerprint'] || ''
    };
    
    const tokenId = await tokenService.storeToken(user.id, null, deviceInfo);
    const token = tokenService.generateSecureToken(user, tokenId);
    
    // Update token in Redis with actual JWT
    await tokenService.storeToken(user.id, token, deviceInfo, tokenId);

    // Set secure httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      path: '/'
    });

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
        createdAt: user.created_at
      },
      token // Still include in response for backward compatibility
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

    // Generate secure token with Redis storage
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      fingerprint: req.headers['x-fingerprint'] || ''
    };
    
    const tokenId = await tokenService.storeToken(user.id, null, deviceInfo);
    const token = tokenService.generateSecureToken(user, tokenId);
    
    // Update token in Redis with actual JWT
    await tokenService.storeToken(user.id, token, deviceInfo, tokenId);

    // Set secure httpOnly cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
      path: '/'
    });

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
      token // Still include in response for backward compatibility
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
      lastLogin: user.last_login,
      // New fields for extended profile
      userRoles: user.user_roles || [],
      animalInterests: user.animalInterests || [],
      rating: user.rating || 0,
      ratingCount: user.rating_count || 0,
      addressStreet: user.address_street,
      addressCity: user.address_city,
      addressState: user.address_state,
      addressCountry: user.address_country,
      addressPostalCode: user.address_postal_code
    };
    
    res.json(response);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
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
      profileImage: 'profile_image',
      userRoles: 'user_roles',
      // animalInterests is handled separately by User.update() - don't map it
      addressStreet: 'address_street',
      addressCity: 'address_city',
      addressState: 'address_state',
      addressCountry: 'address_country',
      addressPostalCode: 'address_postal_code'
    };

    for (const [key, value] of Object.entries(userData)) {
      if (key === 'animalInterests') {
        // Keep animalInterests as camelCase - User.update() expects it this way
        updates[key] = value;
      } else {
        const dbField = fieldMapping[key] || key;
        updates[dbField] = value;
      }
    }

    
    const updatedUser = await User.update(req.user.id, updates);
    
    
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
        updatedAt: updatedUser.updated_at,
        // New fields for extended profile
        userRoles: updatedUser.user_roles || [],
        animalInterests: updatedUser.animalInterests || [],
        rating: updatedUser.rating || 0,
        ratingCount: updatedUser.rating_count || 0,
        addressStreet: updatedUser.address_street,
        addressCity: updatedUser.address_city,
        addressState: updatedUser.address_state,
        addressCountry: updatedUser.address_country,
        addressPostalCode: updatedUser.address_postal_code
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const logout = async (req, res) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.authToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (token) {
      const tokenId = tokenService.extractTokenId(token);
      if (tokenId) {
        await tokenService.revokeToken(tokenId);
      }
    }
    
    // Clear the httpOnly cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    // Revoke all user tokens before deleting account
    await tokenService.revokeAllUserTokens(req.user.id);
    await User.delete(req.user.id);
    
    // Clear the httpOnly cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  deleteAccount
};