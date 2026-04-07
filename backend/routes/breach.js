const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const optionalAuth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get('/check-email/:email', optionalAuth, async (req, res) => {
  const email = req.params.email;
  try {
    const response = await fetch(`https://api.xposedornot.com/v1/check-email/${email}?truncateResponse=false`);
    const data = await response.json();
    let explanation = '';
    let suggestions = '';
    if (data.status === 'success' && data.breaches && data.breaches.length > 0) {
      const breachDetails = data.breaches.map(b => `${b.Name}: ${b.Description} - Data: ${b.DataClasses.join(', ')}`).join('\n');
      const prompt = `Explain the logic behind these data breaches: ${breachDetails}. Provide suggestions for the user to protect their data from further abuse.`;
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const responseAI = await result.response;
      const aiText = responseAI.text();
      const parts = aiText.split('Suggestions:');
      explanation = parts[0].trim();
      suggestions = parts[1] ? parts[1].trim() : 'No specific suggestions provided.';
    }
    if (req.user && data.status === 'success') {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.breaches.push({
          email,
          sites: data.breaches.map(b => b.Name),
          checkedAt: new Date()
        });
        await user.save();
      }
    }
    res.json({ ...data, explanation, suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check breach' });
  }
});

module.exports = router;