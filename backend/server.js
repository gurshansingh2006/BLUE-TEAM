require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const authRoutes = require('./routes/auth');
const breachRoutes = require('./routes/breach');
const aiRoutes = require('./routes/ai');

const app = express();

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

app.use(helmet());
app.use(apiLimiter);
app.use(express.json());
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(path.join(__dirname, '../frontend')));

const resolveMongoUri = (uri) => {
  if (!uri) {
    return 'mongodb://localhost:27017/hackathon';
  }

  try {
    const parsed = new URL(uri);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/hackathon';
      return parsed.toString();
    }
  } catch (error) {
    // Fall back to the raw value if it is not URL-parseable.
  }

  return uri;
};

mongoose.connect(resolveMongoUri(process.env.MONGODB_URI))
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

app.use('/auth', authRoutes);
app.use('/breach', breachRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
