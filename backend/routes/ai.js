const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const optionalAuth = require('../middleware/auth');

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/suggest', optionalAuth, async (req, res) => {
  const { prompt } = req.body;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ suggestion: text });
  } catch (error) {
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

module.exports = router;