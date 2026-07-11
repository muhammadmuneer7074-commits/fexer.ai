const { resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const { workflowId } = JSON.parse(event.body || '{}');
        const n8nUrl = (process.env.N8N_URL || '').replace(/\/$/, '');
        const n8nKey = process.env.N8N_API_KEY;
        if (!n8nUrl || !n8nKey) return resp(400, { error: 'n8n not configured' });
        if (!workflowId) return resp(400, { error: 'workflowId required' });
        const [wfRes, execRes] = await Promise.all([
            fetch(n8nUrl + '/api/v1/workflows/' + workflowId, { headers: { 'X-N8N-API-KEY': n8nKey } }),
            fetch(n8nUrl + '/api/v1/executions?workflowId=' + workflowId + '&limit=10', { headers: { 'X-N8N-API-KEY': n8nKey } })
        ]);
        const wf = wfRes.ok ? await wfRes.json() : null;
        const ex = execRes.ok ? await execRes.json() : { data: [] };
        return resp(200, { active: wf?.active || false, name: wf?.name || 'Unknown', executions: (ex.data || []).map(e => ({ id: e.id, status: e.status, startedAt: e.startedAt, stoppedAt: e.stoppedAt })) });
    } catch (e) { return resp(500, { error: e.message }); }
};