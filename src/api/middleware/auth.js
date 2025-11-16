/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const config = require('../config/api.config');

/**
 * Verify JWT token
 */
function authenticate(req, res, next) {
  // Skip if authentication is disabled
  if (!config.enableAuthentication) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      }
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  });
}

/**
 * Optional authentication (doesn't fail if no token)
 */
function optionalAuth(req, _res, next) {
  if (!config.enableAuthentication) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience
      });

      req.user = decoded;
    } catch (_error) {
      // Continue without authentication
    }
  }

  next();
}

module.exports = {
  authenticate,
  generateToken,
  optionalAuth
};
