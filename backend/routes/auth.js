const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret, requireAuth } = require('../middleware/auth');

const router = express.Router();
const MIN_PASSWORD_LENGTH = 8;

const normalizeUsername = (username = '') => username.trim().toLowerCase();

router.post('/register', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password || '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists. Please sign in instead.' });
    }

    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Registration failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password || '';

    if (!username || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email. Please register first.' });
    }

    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign({ userId: user._id }, getJwtSecret(), { expiresIn: '1h' });
    res.json({
      token,
      user: {
        email: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed.' });
  }
});

router.get('/breaches', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('breaches');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const breaches = [...user.breaches].sort((left, right) => new Date(right.checkedAt) - new Date(left.checkedAt));
    res.json({ breaches });
  } catch (error) {
    res.status(500).json({ message: 'Unable to load saved breach history.' });
  }
});

module.exports = router;
