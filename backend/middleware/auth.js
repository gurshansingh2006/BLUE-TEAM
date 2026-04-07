const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || 'development-only-secret';

const extractToken = (req) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
};

const decodeToken = (token) => jwt.verify(token, getJwtSecret());

const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      req.user = decodeToken(token);
    } catch (error) {
      // Invalid tokens are ignored for optional auth flows.
    }
  }

  next();
};

const requireAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = decodeToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = {
  optionalAuth,
  requireAuth,
  extractToken,
  getJwtSecret
};
