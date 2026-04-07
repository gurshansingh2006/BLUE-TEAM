const jwt = require('jsonwebtoken');

const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
      req.user = decoded;
    } catch (error) {
      // Invalid token, but don't block
    }
  }
  next();
};

module.exports = optionalAuth;