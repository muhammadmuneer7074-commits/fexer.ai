const { verifyUser, checkAndUseCredit, resp, sb } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
        const user = await verifyUser(authHeader);

        if (user) {
            const ok = await checkAndUseCredit(user.id, 2, 'agent_deploy');
            if (!ok.ok) return resp(402, { error: 'NO_CREDITS', message: 'No credits remaining.' });
        }

        const { prompt, plan, credentials } = JSON.parse(event.body || '{}');
        const n8nUrl = (process.env.N8N_URL || '').replace(/\/$/, '');
        const n8nKey = process.env.N8N_API_KEY;

        if (!n8nUrl || !n8nKey) {
            return resp(400, { error: 'N8N_URL and N8N_API_KEY must be set in Netlify environment variables.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return resp(500, { error: 'OpenAI API key not configured' });

        // Create credentials in n8n
        const createdCreds = {};
        for (const svc of (plan.services || [])) {
            if (svc.credentialType === 'none') continue;
            const val = (credentials || {})[svc.credentialKey];
            if (!val) continue;
            try {
                const credBody = buildN8nCred(svc, val);
                const r = await fetch(n8nUrl + '/api/v1/credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': n8nKey },
                    body: JSON.stringify(credBody)
                });
                if (r.ok) {
                    const d = await r.json();
                    createdCreds[svc.credentialKey] = { id: d.id, name: d.name, type: d.type };
                }
            } catch (e) { console.error('Cred creation failed for', svc.name, e.message); }
        }

        // Generate n8n workflow via GPT
        const wfSys = `You are an n8n workflow expert. Generate a complete valid n8n workflow JSON.
Return ONLY raw JSON — no markdown, no explanation, no code fences.
Available credential IDs: ${JSON.stringify(createdCreds)}
Format: {"name":"...","nodes":[...],"connections":{...},"settings":{"executionOrder":"v1"},"active":false}
Each node must have: id(unique string), name, type, typeVersion(number), position([x,y]), parameters(object).
For credential references: "credentials":{"credentialTypeName":{"id":"credId","name":"credName"}}`;

        const wfRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 3000,
                messages: [
                    { role: 'system', content: wfSys },
                    { role: 'user', content: `Build n8n workflow for: ${prompt}\nPlan: ${JSON.stringify(plan)}\nCredential IDs: ${JSON.stringify(createdCreds)}` }
                ]
            })
        });

        const wfData = await wfRes.json();
        if (!wfRes.ok) return resp(500, { error: 'Workflow generation failed: ' + (wfData.error?.message || 'Unknown error') });

        let raw = wfData.choices[0].message.content.trim();
        raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const workflow = JSON.parse(raw);
        workflow.name = plan.agentName || 'Fexer Project';
        workflow.active = false;

        // Deploy to n8n
        const deployRes = await fetch(n8nUrl + '/api/v1/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': n8nKey },
            body: JSON.stringify(workflow)
        });

        if (!deployRes.ok) {
            const errText = await deployRes.text();
            return resp(500, { error: 'n8n deploy failed: ' + errText });
        }

        const deployed = await deployRes.json();

        // Activate
        try {
            await fetch(n8nUrl + '/api/v1/workflows/' + deployed.id + '/activate', {
                method: 'POST',
                headers: { 'X-N8N-API-KEY': n8nKey }
            });
        } catch (e) { console.warn('Activation warning:', e.message); }

        // Save to Supabase
        if (user) {
            await sb.from('agents').insert({
                user_id: user.id,
                name: plan.agentName,
                description: plan.description,
                prompt,
                workflow_id: deployed.id,
                workflow_url: n8nUrl + '/workflow/' + deployed.id,
                active: true
            }).catch(e => console.error('Supabase save error:', e.message));
        }

        return resp(200, {
            success: true,
            workflowId: deployed.id,
            workflowName: deployed.name,
            workflowUrl: n8nUrl + '/workflow/' + deployed.id
        });
    } catch (e) {
        console.error('agent-deploy.js error:', e);
        return resp(500, { error: 'Deploy failed: ' + e.message });
    }
};

function buildN8nCred(svc, value) {
    const name = svc.name + ' (Fexer)';
    const n = svc.name.toLowerCase();
    if (n.includes('openai')) return { name, type: 'openAiApi', data: { apiKey: value } };
    if (n.includes('slack')) return { name, type: 'slackApi', data: { accessToken: value } };
    if (n.includes('telegram')) return { name, type: 'telegramApi', data: { accessToken: value } };
    if (n.includes('notion')) return { name, type: 'notionApi', data: { apiKey: value } };
    if (n.includes('github')) return { name, type: 'githubApi', data: { accessToken: value } };
    if (n.includes('airtable')) return { name, type: 'airtableTokenApi', data: { accessToken: value } };
    if (n.includes('anthropic')) return { name, type: 'anthropicApi', data: { apiKey: value } };
    return { name, type: 'httpHeaderAuth', data: { name: 'Authorization', value: 'Bearer ' + value } };
}