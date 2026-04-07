const express = require('express');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_RECOMMENDATIONS = [
  'Change any password that was reused on more than one site.',
  'Turn on two-factor authentication anywhere it is available.',
  'Watch your inbox, bank, and social accounts for unusual activity.',
  'Update saved passwords in your password manager after the reset.'
];

const normalizeEmail = (value = '') => value.trim().toLowerCase();

const isValidEmail = (value) => EMAIL_REGEX.test(value);

const pickFirstDefined = (record, keys) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && `${record[key]}`.trim() !== '') {
      return record[key];
    }
  }

  return null;
};

const normalizeDataClasses = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const extractBreachEntries = (payload) => {
  const rawBreaches = Array.isArray(payload?.breaches)
    ? (Array.isArray(payload.breaches[0]) ? payload.breaches[0] : payload.breaches)
    : [];

  return rawBreaches
    .map((entry) => {
      if (typeof entry === 'string') {
        return {
          name: entry,
          domain: '',
          dataClasses: []
        };
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const name = pickFirstDefined(entry, ['Name', 'name', 'Breach', 'breach', 'site']);
      if (!name) {
        return null;
      }

      return {
        name: `${name}`.trim(),
        domain: `${pickFirstDefined(entry, ['Domain', 'domain']) || ''}`.trim(),
        dataClasses: normalizeDataClasses(pickFirstDefined(entry, ['DataClasses', 'dataClasses', 'ExposedData', 'exposedData']))
      };
    })
    .filter(Boolean);
};

const buildExplanation = (breaches) => {
  if (!breaches.length) {
    return 'No known breach records were found for this email in the current lookup.';
  }

  const breachWord = breaches.length === 1 ? 'breach' : 'breaches';
  return `This email appears in ${breaches.length} known data ${breachWord}. Treat any reused credentials tied to it as exposed until you rotate them.`;
};

const buildRecommendations = (breaches) => {
  const includesPasswords = breaches.some((breach) =>
    breach.dataClasses.some((item) => item.toLowerCase().includes('password'))
  );

  if (includesPasswords) {
    return [
      'Change the affected password first, then update any other account that reused it.',
      ...DEFAULT_RECOMMENDATIONS.slice(1)
    ];
  }

  return DEFAULT_RECOMMENDATIONS;
};

router.get('/check-email/:email', optionalAuth, async (req, res) => {
  const email = normalizeEmail(req.params.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    const response = await fetch(
      `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}?truncateResponse=false`,
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok && response.status !== 404) {
      return res.status(502).json({
        error: data.error || data.message || 'Failed to check breach information.'
      });
    }

    const breaches = extractBreachEntries(data);
    const breached = breaches.length > 0;

    if (req.user && breached) {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.breaches.unshift({
          email,
          sites: breaches.map((breach) => breach.name),
          checkedAt: new Date()
        });
        user.breaches = user.breaches.slice(0, 50);
        await user.save();
      }
    }

    res.json({
      checkedEmail: email,
      breached,
      breachCount: breaches.length,
      breaches,
      explanation: buildExplanation(breaches),
      suggestions: buildRecommendations(breaches),
      sourceStatus: data.status || (breached ? 'success' : 'not_found')
    });
  } catch (error) {
    console.error('Breach check error:', error);
    res.status(500).json({ error: 'Failed to check breach information.' });
  }
});

module.exports = router;
