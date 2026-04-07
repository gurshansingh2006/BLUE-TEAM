const express = require('express');
const optionalAuth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Check email breach using XposedOrNot API (optional auth)
router.get('/check-email/:email', optionalAuth, async (req, res) => {
  const email = req.params.email;
  try {
    const response = await fetch(`https://api.xposedornot.com/v1/check-email/${email}`);
    const data = await response.json();
    // If user is signed in, store the breach data
    if (req.user && data.status === 'success') {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.breaches.push({
          email,
          sites: data.breaches[0] || [],
          checkedAt: new Date()
        });
        await user.save();
      }
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check breach' });
  }
});

module.exports = router;