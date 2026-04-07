const express = require('express');
const { check, validationResult } = require('express-validator');
const { optionalAuth } = require('../middleware/auth');
const { generateText } = require('../services/gemini');

const router = express.Router();
const MAX_PROMPT_LENGTH = 300;

const aiSuggestionValidation = [
  check('prompt')
    .trim()
    .notEmpty()
    .withMessage('Please enter a prompt for the AI assistant.')
    .isLength({ max: MAX_PROMPT_LENGTH })
    .withMessage(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less.`)
];

router.post('/suggest', optionalAuth, aiSuggestionValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const prompt = `${req.body.prompt}`.trim().slice(0, MAX_PROMPT_LENGTH);

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI suggestions are not configured yet.' });
  }

  try {
    const text = await generateText(
      `You are a cybersecurity assistant. Give concise, practical advice with clear action steps.\n\nUser request: ${prompt}`
    );

    res.json({ suggestion: text || 'No suggestion was generated.' });
  } catch (error) {
    console.error('AI suggestion failed:', error);
    res.status(500).json({ error: 'AI suggestion failed. Please try again in a moment.' });
  }
});

module.exports = router;
