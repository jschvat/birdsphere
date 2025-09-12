const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tokenService = require('../services/tokenService');

const authenticateToken = async (req, res, next) => {
  // Try to get token from cookie first, then Authorization header
  const token = req.cookies.authToken || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Enhanced validation: Check if token exists in Redis
    if (decoded.tokenId) {
      const tokenData = await tokenService.validateToken(decoded.tokenId);
      if (!tokenData) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
      
      // Verify token in Redis matches the one provided
      if (tokenData.token !== token) {
        return res.status(401).json({ error: 'Token mismatch' });
      }
    }
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      // If user doesn't exist, revoke the token
      if (decoded.tokenId) {
        await tokenService.revokeToken(decoded.tokenId);
      }
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user to request object
    req.user = user;
    req.tokenId = decoded.tokenId; // For potential token operations
    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token format' });
    }
    return res.status(403).json({ error: 'Token validation failed' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but continue without user
    }
  }
  
  next();
};

const requireBreeder = (req, res, next) => {
  if (!req.user || !req.user.is_breeder) {
    return res.status(403).json({ error: 'Breeder access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireBreeder
};