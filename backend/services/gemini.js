const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash'
];

let cachedModelName = null;

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const generateText = async (prompt) => {
  const client = getClient();
  const candidates = cachedModelName
    ? [cachedModelName, ...MODEL_CANDIDATES.filter((name) => name !== cachedModelName)]
    : MODEL_CANDIDATES;

  const errors = [];

  for (const modelName of candidates) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      if (text) {
        cachedModelName = modelName;
        return text;
      }
    } catch (error) {
      errors.push(`${modelName}: ${error.message || error}`);
    }
  }

  throw new Error(errors.join(' | ') || 'Gemini did not return a response.');
};

module.exports = {
  generateText
};
