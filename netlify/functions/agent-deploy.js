const { verifyUser, checkAndUseCredit, resp, sb } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers);
        if (user) { const ok = await checkAndUseCredit(user.id, 2, 'agent_deploy'); if (!ok.ok) return resp(402, { error: 'NO_CREDITS' }); }
        const { prompt, plan, credentials } = JSON.parse(event.body || '{}');
        const n8nUrl = (process.env.N8N_URL || '').replace(/\/$/, '');
        const n8nKey = process.env.N8N_API_KEY;
        if (!n8nUrl || !n8nKey) return resp(400, { error: 'N8N_URL and N8N_API_KEY must be set in Netlify environment variables.' });
        const key = process.env.OPENAI_API_KEY;
        if (!key) return resp(500, { error: 'OPENAI_API_KEY not set' });
        const createdCreds = {};
        for (const svc of (plan.services || [])) {
            if (svc.credentialType === 'none') continue;
            const val = (credentials || {})[svc.credentialKey];
            if (!val) continue;
            try {
                const n = svc.name.toLowerCase();
                let credBody;
                if (n.includes('openai')) credBody = { name: svc.name + ' (Fexer)', type: 'openAiApi', data: { apiKey: val } };
                else if (n.includes('slack')) credBody = { name: svc.name + ' (Fexer)', type: 'slackApi', data: { accessToken: val } };
                else if (n.includes('telegram')) credBody = { name: svc.name + ' (Fexer)', type: 'telegramApi', data: { accessToken: val } };
                else if (n.includes('notion')) credBody = { name: svc.name + ' (Fexer)', type: 'notionApi', data: { apiKey: val } };
                else if (n.includes('github')) credBody = { name: svc.name + ' (Fexer)', type: 'githubApi', data: { accessToken: val } };
                else credBody = { name: svc.name + ' (Fexer)', type: 'httpHeaderAuth', data: { name: 'Authorization', value: 'Bearer ' + val } };
                const r = await fetch(n8nUrl + '/api/v1/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': n8nKey }, body: JSON.stringify(credBody) });
                if (r.ok) { const d = await r.json(); createdCreds[svc.credentialKey] = { id: d.id, name: d.name, type: d.type }; }
            } catch (e) { }
        }
        const wfSys = `You are an n8n workflow expert. Return ONLY raw valid JSON (no markdown).
Available credentials: ${JSON.stringify(createdCreds)}
Format: {"name":"...","nodes":[...],"connections":{...},"settings":{"executionOrder":"v1"},"active":false}
Each node: id(unique string), name, type, typeVersion(number), position([x,y]), parameters(object).`;
        const wfRes = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 3000, messages: [{ role: 'system', content: wfSys }, { role: 'user', content: `Build n8n workflow for: ${prompt}\nPlan: ${JSON.stringify(plan)}\nCreds: ${JSON.stringify(createdCreds)}` }] }) });
        const wfData = await wfRes.json();
        if (!wfRes.ok) return resp(500, { error: 'Workflow generation failed' });
        let raw = wfData.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const workflow = JSON.parse(raw);
        workflow.name = plan.agentName || 'Fexer Project';
        const deployRes = await fetch(n8nUrl + '/api/v1/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': n8nKey }, body: JSON.stringify(workflow) });
        if (!deployRes.ok) return resp(500, { error: 'n8n deploy failed: ' + await deployRes.text() });
        const deployed = await deployRes.json();
        try { await fetch(n8nUrl + '/api/v1/workflows/' + deployed.id + '/activate', { method: 'POST', headers: { 'X-N8N-API-KEY': n8nKey } }); } catch (e) { }
        if (user) sb.from('agents').insert({ user_id: user.id, name: plan.agentName, description: plan.description, prompt, workflow_id: deployed.id, workflow_url: n8nUrl + '/workflow/' + deployed.id, active: true }).catch(() => { });
        return resp(200, { success: true, workflowId: deployed.id, workflowName: deployed.name, workflowUrl: n8nUrl + '/workflow/' + deployed.id });
    } catch (e) { return resp(500, { error: 'Deploy failed: ' + e.message }); }
};