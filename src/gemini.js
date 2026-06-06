const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

function buildPrompt(goal) {
  return `You are simulating an AI web-navigating agent attempting to accomplish a goal.
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
}

function extractJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function generateTrajectory(goal) {
  if (!API_KEY) {
    throw new Error('Missing VITE_GROQ_API_KEY in .env');
  }

  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: buildPrompt(goal) }],
    response_format: { type: 'json_object' },
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Groq returned no text');
  }

  const trajectory = extractJSON(text);
  trajectory.id = `traj_gen_${Date.now()}`;
  return trajectory;
}