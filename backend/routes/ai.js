const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { generateText } = require('../services/gemini');

const router = express.Router();

router.post('/suggest', optionalAuth, async (req, res) => {
  const prompt = req.body?.prompt?.trim();

  if (!prompt) {
    return res.status(400).json({ error: 'Please enter a prompt for the AI assistant.' });
  }

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
