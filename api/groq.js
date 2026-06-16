// Serverless function that proxies requests to Groq.
// API key is stored server-side as an env var, never exposed to the browser.

const ALLOWED_ORIGINS = [
  'https://agent-trajectory-inspector.vercel.app',
  'http://localhost:5173',
];

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count += 1;
  rateLimitMap.set(ip, entry);

  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a minute before generating another trajectory.',
    });
  }

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
  }

  try {
    const { goal } = req.body || {};
    if (!goal || typeof goal !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "goal" field' });
    }

    if (goal.length > 500) {
      return res.status(400).json({ error: 'Goal too long (max 500 chars)' });
    }

    const prompt = `You are simulating an AI web-navigating agent attempting to accomplish a goal.
Generate a realistic trajectory of 6-10 steps showing the agent's thoughts, tool calls, observations, and actions as it tries to complete the goal.

The trajectory should be plausible — sometimes succeed, sometimes fail in a realistic way (e.g., misclicks, wrong filter, dark-pattern UI, gives up too early).

GOAL: ${goal}

Respond with ONLY valid JSON in this exact shape — no markdown, no commentary, no code fences:

{
  "id": "traj_generated",
  "title": "<short title summarizing the run>",
  "goal": "<restate the goal>",
  "status": "success | failure | partial",
  "steps": [
    {
      "id": "step_1",
      "type": "thought | tool_call | observation | action",
      "summary": "<one-line summary>",
      "content": { "...fields depend on type..." }
    }
  ]
}

CONTENT shape by type:
- thought: { "reasoning": "<the agent's reasoning>" }
- tool_call: { "tool": "<tool name>", "arguments": { "key": "value" } }
- observation: { "result": "<what came back>", "raw": "<raw data snippet>" }
- action: { "actionType": "click|navigate|type|scroll", "target": "<what was acted on>", "description": "<one-line description>" }

Make the run feel real. Include reasoning steps, not just actions.`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return res.status(groqResponse.status).json({
        error: `Groq API error: ${errText}`,
      });
    }

    const data = await groqResponse.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}