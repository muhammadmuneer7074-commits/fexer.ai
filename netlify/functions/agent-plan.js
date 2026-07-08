const { verifyUser, checkAndUseCredit, resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
        const user = await verifyUser(authHeader);

        if (user) {
            const ok = await checkAndUseCredit(user.id, 1, 'agent_plan');
            if (!ok.ok) return resp(402, { error: 'NO_CREDITS', message: 'No credits remaining.' });
        }

        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt || !prompt.trim()) return resp(400, { error: 'No prompt provided' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return resp(500, { error: 'OpenAI API key not configured' });

        const sys = `You are an expert AI automation architect. Analyze the user's automation request and respond ONLY with raw valid JSON — no markdown, no code fences, no explanation.

JSON structure:
{
  "agentName": "Short descriptive project name",
  "description": "What this automation does in 1-2 sentences",
  "services": [
    {
      "name": "Service name (e.g. Gmail, Slack, OpenAI)",
      "reason": "Why this service is needed",
      "credentialType": "api_key or none",
      "credentialLabel": "Human-readable label e.g. OpenAI API Key",
      "credentialKey": "unique_snake_case_identifier",
      "getUrl": "URL where user gets this credential"
    }
  ],
  "steps": ["Step 1 description", "Step 2 description", "Step 3 description"],
  "trigger": "manual or schedule or webhook",
  "n8nNodes": ["List of n8n node type names needed"]
}

Only include services where credentialType is not "none". Be specific and accurate.`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 1500,
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: 'Build an automation for: ' + prompt }
                ]
            })
        });

        const data = await res.json();
        if (!res.ok) return resp(res.status, { error: data.error?.message || 'AI error' });

        let raw = data.choices[0].message.content.trim();
        raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const plan = JSON.parse(raw);
        return resp(200, { plan });
    } catch (e) {
        console.error('agent-plan.js error:', e);
        return resp(500, { error: 'Planning failed: ' + e.message });
    }
};