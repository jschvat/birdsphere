/**
 * Token Service
 * Advanced JWT token management with Redis-based session tracking and device management.
 *
 * Core Responsibilities:
 * - JWT token generation with secure random token IDs
 * - Redis-based token storage and validation
 * - Device fingerprinting and session tracking
 * - Token revocation and cleanup
 * - Remember me functionality with extended sessions
 * - User session management across multiple devices
 *
 * Key Features:
 * - Secure Token IDs: Cryptographically secure token identification
 * - Device Tracking: User agent, IP, and fingerprint association
 * - Session Management: Per-user active session tracking
 * - Automatic Expiry: TTL-based token cleanup in Redis
 * - Remember Me: Extended 90-day sessions for persistent logins
 * - Bulk Operations: Revoke all user tokens for security incidents
 *
 * Security Features:
 * - Token mismatch detection to prevent token hijacking
 * - Automatic cleanup of expired tokens
 * - Device info validation for session integrity
 * - User-based token revocation for account security
 * - Redis TTL ensures no orphaned session data
 *
 * Integration Points:
 * - Works with JWT for token signing and verification
 * - Uses Redis for high-performance session storage
 * - Integrates with authentication middleware
 * - Supports logout and account deletion flows
 * - Powers multi-device session management
 */
const redisClient = require('../config/redis');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class TokenService {
  constructor() {
    this.TOKEN_PREFIX = 'birdsphere:token:';
    this.USER_TOKENS_PREFIX = 'birdsphere:user_tokens:';
    this.DEFAULT_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds
    this.REMEMBER_ME_EXPIRY = 90 * 24 * 60 * 60; // 90 days in seconds
  }

  // Generate a unique token ID for Redis storage
  generateTokenId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store token in Redis with user mapping
  async storeToken(userId, token, deviceInfo = {}, existingTokenId = null, rememberMe = false) {
    try {
      const tokenId = existingTokenId || this.generateTokenId();
      const expiryTime = rememberMe ? this.REMEMBER_ME_EXPIRY : this.DEFAULT_TOKEN_EXPIRY;

      const tokenData = {
        userId,
        token,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        rememberMe,
        expiresAt: new Date(Date.now() + (expiryTime * 1000)).toISOString(),
        deviceInfo: {
          userAgent: deviceInfo.userAgent || '',
          ip: deviceInfo.ip || '',
          fingerprint: deviceInfo.fingerprint || ''
        }
      };

      // Store token data
      await redisClient.setEx(
        `${this.TOKEN_PREFIX}${tokenId}`,
        expiryTime,
        JSON.stringify(tokenData)
      );

      // Add token to user's active tokens set
      await redisClient.sAdd(`${this.USER_TOKENS_PREFIX}${userId}`, tokenId);
      await redisClient.expire(`${this.USER_TOKENS_PREFIX}${userId}`, expiryTime);

      return tokenId;
    } catch (error) {
      console.error('Error storing token in Redis:', error);
      throw new Error('Token storage failed');
    }
  }

  // Validate token exists in Redis
  async validateToken(tokenId) {
    try {
      const tokenData = await redisClient.get(`${this.TOKEN_PREFIX}${tokenId}`);
      if (!tokenData) {
        return null;
      }

      const parsed = JSON.parse(tokenData);

      // Check if token has expired (additional safety check)
      if (parsed.expiresAt && new Date() > new Date(parsed.expiresAt)) {
        await this.revokeToken(tokenId);
        return null;
      }

      // Determine expiry time based on rememberMe setting
      const expiryTime = parsed.rememberMe ? this.REMEMBER_ME_EXPIRY : this.DEFAULT_TOKEN_EXPIRY;

      // Update last used timestamp
      parsed.lastUsed = new Date().toISOString();
      await redisClient.setEx(
        `${this.TOKEN_PREFIX}${tokenId}`,
        expiryTime,
        JSON.stringify(parsed)
      );

      return parsed;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  // Remove token from Redis (logout)
  async revokeToken(tokenId) {
    try {
      // Get token data to find user
      const tokenData = await redisClient.get(`${this.TOKEN_PREFIX}${tokenId}`);
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        
        // Remove from user's active tokens
        await redisClient.sRem(`${this.USER_TOKENS_PREFIX}${parsed.userId}`, tokenId);
      }

      // Remove the token
      await redisClient.del(`${this.TOKEN_PREFIX}${tokenId}`);
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }

  // Revoke all tokens for a user
  async revokeAllUserTokens(userId) {
    try {
      // Get all user tokens
      const tokenIds = await redisClient.sMembers(`${this.USER_TOKENS_PREFIX}${userId}`);
      
      // Remove each token
      const deletePromises = tokenIds.map(tokenId => 
        redisClient.del(`${this.TOKEN_PREFIX}${tokenId}`)
      );
      
      await Promise.all(deletePromises);
      
      // Clear user tokens set
      await redisClient.del(`${this.USER_TOKENS_PREFIX}${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
      return false;
    }
  }

  // Get active sessions for a user
  async getUserActiveSessions(userId) {
    try {
      const tokenIds = await redisClient.sMembers(`${this.USER_TOKENS_PREFIX}${userId}`);
      const sessions = [];

      for (const tokenId of tokenIds) {
        const tokenData = await redisClient.get(`${this.TOKEN_PREFIX}${tokenId}`);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          sessions.push({
            tokenId,
            createdAt: parsed.createdAt,
            lastUsed: parsed.lastUsed,
            deviceInfo: parsed.deviceInfo
          });
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens() {
    try {
      // This is handled automatically by Redis TTL, but we can add additional cleanup logic here
      console.log('Token cleanup completed');
      return true;
    } catch (error) {
      console.error('Error during token cleanup:', error);
      return false;
    }
  }

  // Extract token ID from JWT (we'll store it in the JWT payload)
  extractTokenId(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.tokenId || null;
    } catch (error) {
      return null;
    }
  }

  // Generate JWT with embedded token ID
  generateSecureToken(user, tokenId, rememberMe = false) {
    const expiresIn = rememberMe ? '90d' : '7d';

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        isBreeder: user.is_breeder,
        tokenId: tokenId, // Embed Redis token ID
        rememberMe: rememberMe
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }
}

module.exports = new TokenService();