require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const breachRoutes = require('./routes/breach');
const aiRoutes = require('./routes/ai');

const app = express();

app.use(cors());
app.use(express.json());

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
