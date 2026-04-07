const express = require('express');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { generateText } = require('../services/gemini');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BREACHES_IN_RESPONSE = 12;
const MAX_BREACH_NOTES_FOR_AI = 8;
const MAX_SOURCES_IN_AI_PROMPT = 20;

const normalizeEmail = (value = '') => value.trim().toLowerCase();

const isValidEmail = (value) => EMAIL_REGEX.test(value);

const titleCase = (value = '') =>
  value
    .replace(/^data_/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const splitList = (value, separator = ';') =>
  `${value || ''}`
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueList = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const flattenMetricChildren = (nodes = []) =>
  nodes.flatMap((node) => {
    if (Array.isArray(node.children) && node.children.length) {
      return flattenMetricChildren(node.children);
    }

    return node?.name ? [titleCase(node.name)] : [];
  });

const normalizeDetailedBreaches = (payload) => {
  const breachDetails = Array.isArray(payload?.ExposedBreaches?.breaches_details)
    ? payload.ExposedBreaches.breaches_details
    : [];

  return breachDetails
    .map((entry) => {
      const name = `${entry?.breach || ''}`.trim();
      if (!name) {
        return null;
      }

      return {
        name,
        domain: `${entry?.domain || ''}`.trim(),
        details: `${entry?.details || ''}`.trim(),
        dataClasses: splitList(entry?.xposed_data),
        recordsExposed: Number.isFinite(Number(entry?.xposed_records)) ? Number(entry.xposed_records) : null,
        exposedDate: `${entry?.xposed_date || ''}`.trim()
      };
    })
    .filter(Boolean);
};

const extractSources = (payload, breaches) => {
  const summarySources = splitList(payload?.BreachesSummary?.site);

  if (summarySources.length) {
    return uniqueList(summarySources);
  }

  return uniqueList(breaches.map((breach) => breach.name));
};

const extractExposedData = (payload, breaches) => {
  const breachData = breaches.flatMap((breach) => breach.dataClasses || []);
  const metricsData = payload?.BreachMetrics?.xposed_data?.flatMap((group) => flattenMetricChildren(group.children)) || [];

  return uniqueList([...breachData, ...metricsData]);
};

const normalizeRiskScore = (payload, breachCount) => {
  const rawScore = Number(payload?.BreachMetrics?.risk?.[0]?.risk_score);
  const rawLabel = `${payload?.BreachMetrics?.risk?.[0]?.risk_label || ''}`.trim();

  let score = 1;
  if (Number.isFinite(rawScore) && rawScore > 0) {
    score = Math.min(10, Math.max(1, Math.ceil(rawScore / 10)));
  } else if (rawLabel) {
    const label = rawLabel.toLowerCase();
    if (label === 'critical') {
      score = 10;
    } else if (label === 'high') {
      score = 8;
    } else if (label === 'medium') {
      score = 5;
    } else {
      score = 3;
    }
  } else if (breachCount >= 5) {
    score = 9;
  } else if (breachCount >= 3) {
    score = 7;
  } else if (breachCount >= 1) {
    score = 5;
  }

  const level = score >= 8 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';
  return { score, level };
};

const buildFallbackThreats = (exposedData) => {
  const lowerCaseData = exposedData.map((item) => item.toLowerCase());
  const threats = [];

  if (lowerCaseData.some((item) => item.includes('password'))) {
    threats.push('Attackers could try the leaked passwords on your other accounts through credential stuffing.');
  }

  if (lowerCaseData.some((item) => item.includes('email') || item.includes('phone'))) {
    threats.push('You may receive convincing phishing emails, texts, or calls that pretend to be trusted services.');
  }

  if (lowerCaseData.some((item) => item.includes('social security') || item.includes('government id') || item.includes('credit card'))) {
    threats.push('Sensitive identity or payment data can be abused for fraud, impersonation, or financial scams.');
  }

  if (lowerCaseData.some((item) => item.includes('name') || item.includes('address') || item.includes('date of birth'))) {
    threats.push('Personal profile details can be combined to impersonate you or answer account recovery questions.');
  }

  if (!threats.length) {
    threats.push('Even if passwords were not exposed, attackers can still use leaked profile details to target you with phishing or impersonation attempts.');
  }

  return threats;
};

const buildFallbackAnalysis = ({ userInput, breachCount, breachSources, exposedData, riskScore, riskLevel }) => ({
  summary: breachCount
    ? `${userInput} appears in ${breachCount} known breach records, including ${breachSources.slice(0, 3).join(', ')}${breachSources.length > 3 ? ', and others' : ''}.`
    : `No known breach records were found for ${userInput} in the current search.`,
  riskExplanation: breachCount
    ? `This is a ${riskLevel.toLowerCase()} risk because the address appears in multiple breach sources and the exposed information can be reused in other attacks.`
    : 'This is a low risk result because no breach records were returned for this input right now.',
  possibleThreats: breachCount ? buildFallbackThreats(exposedData) : ['There is no active breach evidence in this result, but general phishing and password reuse risks still exist online.'],
  immediateActions: breachCount
    ? [
        'Change any password that was reused on accounts linked to this email.',
        'Enable two-factor authentication on your email, banking, and social accounts.',
        'Review recent sign-in activity and remove unfamiliar devices or sessions.',
        'Watch for suspicious password reset emails, texts, or login alerts.'
      ]
    : [
        'Keep using strong, unique passwords.',
        'Turn on two-factor authentication for important accounts.',
        'Repeat the check again later if you believe a new breach may have occurred.'
      ],
  futureRecommendations: [
    'Use a password manager so every account has a unique password.',
    'Keep two-factor authentication enabled wherever possible.',
    'Be cautious with emails or messages asking you to click links or confirm account information.',
    'Check breach exposure periodically so you can react quickly to new incidents.'
  ],
  riskScore,
  riskLevel
});

const parseGeminiJson = (text) => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  return JSON.parse(cleaned);
};

const buildAnalysisPrompt = ({ userInput, breachCount, breachSources, exposedData, riskScore, riskLevel, breaches }) => {
  const sourcePreview = breachSources.slice(0, MAX_SOURCES_IN_AI_PROMPT).join(', ');
  const sourceLine = breachSources.length > MAX_SOURCES_IN_AI_PROMPT
    ? `${sourcePreview}, and ${breachSources.length - MAX_SOURCES_IN_AI_PROMPT} more`
    : sourcePreview;
  const breachNotes = breaches
    .slice(0, MAX_BREACH_NOTES_FOR_AI)
    .map((breach) => {
      const fields = breach.dataClasses.length ? breach.dataClasses.join(', ') : 'Unknown exposed data';
      const notes = breach.details || 'No extra incident notes available.';
      return `- ${breach.name} | ${fields} | ${notes}`;
    })
    .join('\n');

  return `You are a cybersecurity assistant.

A user has searched their email to check for data breaches.
Based on the breach data provided, analyze the risk and explain the situation clearly for a normal user.

User Input:
Email/Phone: ${userInput}

Breach Data:
Number of Breaches: ${breachCount}
Breached Sources: ${sourceLine || 'None'}
Types of Data Exposed: ${exposedData.join(', ') || 'Unknown'}
Risk Score Hint: ${riskScore}/10
Risk Level Hint: ${riskLevel}

Detailed Breach Notes:
${breachNotes || '- No detailed breach notes were available.'}

Tasks:
1. Explain what the data breach means in simple language.
2. Explain what type of data was exposed and how serious it is.
3. Explain what attackers could potentially do with this data.
4. Provide an Immediate Action Plan (things the user should do right now).
5. Provide Future Protection Steps (how the user can avoid future breaches).
6. Keep the response structured and easy to read.

Return valid JSON only with this exact schema:
{
  "summary": "string",
  "riskExplanation": "string",
  "possibleThreats": ["string"],
  "immediateActions": ["string"],
  "futureRecommendations": ["string"]
}

Rules:
- Use plain language for a non-technical user.
- Keep each bullet practical and concise.
- Do not include markdown, code fences, or any keys outside the schema.`;
};

const generateAnalysis = async (context) => {
  if (!context.breachCount || !process.env.GEMINI_API_KEY) {
    return buildFallbackAnalysis(context);
  }

  try {
    const text = await generateText(buildAnalysisPrompt(context));
    const parsed = parseGeminiJson(text);

    return {
      summary: `${parsed.summary || ''}`.trim() || buildFallbackAnalysis(context).summary,
      riskExplanation: `${parsed.riskExplanation || ''}`.trim() || buildFallbackAnalysis(context).riskExplanation,
      possibleThreats: Array.isArray(parsed.possibleThreats) && parsed.possibleThreats.length ? parsed.possibleThreats.map((item) => `${item}`.trim()).filter(Boolean) : buildFallbackAnalysis(context).possibleThreats,
      immediateActions: Array.isArray(parsed.immediateActions) && parsed.immediateActions.length ? parsed.immediateActions.map((item) => `${item}`.trim()).filter(Boolean) : buildFallbackAnalysis(context).immediateActions,
      futureRecommendations: Array.isArray(parsed.futureRecommendations) && parsed.futureRecommendations.length ? parsed.futureRecommendations.map((item) => `${item}`.trim()).filter(Boolean) : buildFallbackAnalysis(context).futureRecommendations,
      riskScore: context.riskScore,
      riskLevel: context.riskLevel
    };
  } catch (error) {
    console.error('Gemini breach analysis failed:', error);
    return buildFallbackAnalysis(context);
  }
};

const formatReport = (analysis, breaches, exposedData) => {
  const breachLine = breaches.length
    ? breaches.map((breach) => breach.name).join(', ')
    : 'No breached sources were returned.';
  const exposedLine = exposedData.length ? exposedData.join(', ') : 'No exposed data categories were returned.';

  return [
    'DATA BREACH SUMMARY',
    `${analysis.summary} Breached sources: ${breachLine}. Exposed data: ${exposedLine}.`,
    '',
    'SECURITY RISK LEVEL',
    `Risk Score: ${analysis.riskScore}/10`,
    analysis.riskExplanation,
    '',
    'POSSIBLE THREATS',
    ...analysis.possibleThreats.map((item) => `- ${item}`),
    '',
    'IMMEDIATE ACTIONS',
    ...analysis.immediateActions.map((item) => `- ${item}`),
    '',
    'FUTURE SECURITY RECOMMENDATIONS',
    ...analysis.futureRecommendations.map((item) => `- ${item}`)
  ].join('\n');
};

router.get('/check-email/:email', optionalAuth, async (req, res) => {
  const email = normalizeEmail(req.params.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    const response = await fetch(
      `https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      return res.status(502).json({
        error: payload?.Error || payload?.error || payload?.message || 'Failed to check breach information.'
      });
    }

    const detailedBreaches = normalizeDetailedBreaches(payload);
    const breachSources = extractSources(payload, detailedBreaches);
    const breachCount = breachSources.length || detailedBreaches.length;
    const breached = breachCount > 0;
    const exposedData = extractExposedData(payload, detailedBreaches);
    const { score: riskScore, level: riskLevel } = normalizeRiskScore(payload, breachCount);

    if (req.user && breached) {
      const user = await User.findById(req.user.userId);
      if (user) {
        user.breaches.unshift({
          email,
          sites: breachSources,
          checkedAt: new Date()
        });
        user.breaches = user.breaches.slice(0, 50);
        await user.save();
      }
    }

    const analysis = await generateAnalysis({
      userInput: email,
      breachCount,
      breachSources,
      exposedData,
      riskScore,
      riskLevel,
      breaches: detailedBreaches
    });

    res.json({
      checkedEmail: email,
      breached,
      breachCount,
      breachSources,
      breaches: detailedBreaches.slice(0, MAX_BREACHES_IN_RESPONSE),
      totalBreachesAvailable: detailedBreaches.length,
      exposedData,
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      analysis,
      reportText: formatReport(analysis, breachSources.map((name) => ({ name })), exposedData),
      sourceStatus: breached ? 'success' : 'not_found'
    });
  } catch (error) {
    console.error('Breach check error:', error);
    res.status(500).json({ error: 'Failed to check breach information.' });
  }
});

module.exports = router;
