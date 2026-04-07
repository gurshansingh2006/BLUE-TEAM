const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { optionalAuth } = require('../middleware/auth');

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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(
      `You are a cybersecurity assistant. Give concise, practical advice with clear action steps.\n\nUser request: ${prompt}`
    );
    const response = await result.response;
    const text = response.text().trim();

    res.json({ suggestion: text || 'No suggestion was generated.' });
  } catch (error) {
    console.error('AI suggestion failed:', error);
    res.status(500).json({ error: 'AI suggestion failed. Please try again in a moment.' });
  }
});

module.exports = router;
