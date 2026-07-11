const { verifyUser, checkAndUseCredit, resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers);
        if (user) { const ok = await checkAndUseCredit(user.id, 1, 'agent_plan'); if (!ok.ok) return resp(402, { error: 'NO_CREDITS' }); }
        const { prompt } = JSON.parse(event.body || '{}');
        if (!prompt?.trim()) return resp(400, { error: 'No prompt' });
        const key = process.env.OPENAI_API_KEY;
        if (!key) return resp(500, { error: 'OPENAI_API_KEY not set' });
        const sys = `You are an AI automation architect. Respond ONLY with raw valid JSON — no markdown, no code fences.
{
  "agentName": "Short project name",
  "description": "What this does in 1-2 sentences",
  "services": [{"name":"Service","reason":"Why needed","credentialType":"api_key or none","credentialLabel":"Label","credentialKey":"snake_case_key","getUrl":"URL"}],
  "steps": ["Step 1","Step 2","Step 3"],
  "trigger": "manual or schedule or webhook",
  "n8nNodes": ["node names"]
}`;
        const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1500, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] }) });
        const data = await res.json();
        if (!res.ok) return resp(res.status, { error: data.error?.message || 'AI error' });
        let raw = data.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const plan = JSON.parse(raw);
        return resp(200, { plan });
    } catch (e) { return resp(500, { error: 'Planning failed: ' + e.message }); }
};