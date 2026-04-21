const GEMINI_MODEL = process.env.GEMINI_API_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function getGeminiTimeout() {
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;
}

function buildPrompt(callPayload) {
  const metadataLines = [
    `Call ID: ${callPayload.cid}`,
    `Employee ID: ${callPayload.eid}`,
    `Call Status: ${callPayload.status || 'Unknown'}`,
    `Timestamp: ${callPayload.timestamp || 'Unknown'}`,
    `Region: ${callPayload.region || 'Unknown'}`,
    `Customer Phone: ${callPayload.customer_phone || 'Unknown'}`,
    `Employee Phone: ${callPayload.employee_phone || 'Unknown'}`,
  ];

  return [
    'Analyze the following customer support call.',
    '',
    'Return strict JSON only with exactly these keys:',
    'satisfaction_score, sentiment_analysis, call_summary, follow_up',
    '',
    'Rules:',
    '- satisfaction_score must be a number from 1 to 4.',
    '- sentiment_analysis must be one of: positive, neutral, negative.',
    '- call_summary must be concise and actionable, under 120 words.',
    '- follow_up must be Yes or No.',
    '',
    'Metadata:',
    metadataLines.join('\n'),
    '',
    'Transcript:',
    callPayload.transcript,
  ].join('\n');
}

function extractCandidateText(responseBody) {
  const candidateParts = responseBody?.candidates?.[0]?.content?.parts || [];
  const firstTextPart = candidateParts.find((part) => typeof part?.text === 'string');

  if (!firstTextPart?.text) {
    throw new Error('Gemini did not return a text response.');
  }

  return firstTextPart.text.trim();
}

function parseJsonText(responseText) {
  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  const cleanedText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (parseError) {
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw parseError;
    }

    return JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1));
  }
}

function normalizeSentiment(value, score) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (['positive', 'neutral', 'negative'].includes(normalizedValue)) {
    return normalizedValue;
  }

  if (score >= 3) {
    return 'positive';
  }

  if (score >= 2) {
    return 'neutral';
  }

  return 'negative';
}

function normalizeFollowUp(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return ['yes', 'true', 'needed', 'required'].includes(normalizedValue) ? 'Yes' : 'No';
}

function normalizeAnalysis(rawAnalysis) {
  const rawScore =
    rawAnalysis?.satisfaction_score ??
    rawAnalysis?.satisfactionScore ??
    rawAnalysis?.score;

  const numericScore = Number(rawScore);

  if (!Number.isFinite(numericScore)) {
    throw new Error('Gemini returned an invalid satisfaction score.');
  }

  const boundedScore = Math.max(1, Math.min(4, Number(numericScore.toFixed(1))));
  const callSummary = String(
    rawAnalysis?.call_summary ??
      rawAnalysis?.summary ??
      rawAnalysis?.callSummary ??
      ''
  ).trim();

  if (!callSummary) {
    throw new Error('Gemini returned an empty call summary.');
  }

  return {
    satisfaction_score: boundedScore,
    sentiment_analysis: normalizeSentiment(
      rawAnalysis?.sentiment_analysis ?? rawAnalysis?.sentiment,
      boundedScore
    ),
    call_summary: callSummary,
    follow_up: normalizeFollowUp(rawAnalysis?.follow_up ?? rawAnalysis?.followUp),
  };
}

async function analyzeCallWithGemini(callPayload) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the backend.');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this Node runtime.');
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), getGeminiTimeout());

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are a call quality analyst. Return strict JSON only and do not wrap it in markdown.',
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(callPayload),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 350,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const responseBody = await response.json();

    if (!response.ok) {
      throw new Error(responseBody?.error?.message || 'Gemini request failed.');
    }

    return normalizeAnalysis(parseJsonText(extractCandidateText(responseBody)));
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  analyzeCallWithGemini,
};
