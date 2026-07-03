exports.handler = async function (event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    try {
        const { workflowId } = JSON.parse(event.body);
        const n8nUrl = process.env.N8N_URL;
        const n8nKey = process.env.N8N_API_KEY;

        if (!n8nUrl || !n8nKey) return { statusCode: 400, body: JSON.stringify({ error: "n8n not configured" }) };

        const [wfRes, execRes] = await Promise.all([
            fetch(n8nUrl + "/api/v1/workflows/" + workflowId, { headers: { "X-N8N-API-KEY": n8nKey } }),
            fetch(n8nUrl + "/api/v1/executions?workflowId=" + workflowId + "&limit=5", { headers: { "X-N8N-API-KEY": n8nKey } })
        ]);

        const wfData = wfRes.ok ? await wfRes.json() : null;
        const execData = execRes.ok ? await execRes.json() : { data: [] };

        return {
            statusCode: 200,
            body: JSON.stringify({
                active: wfData?.active || false,
                name: wfData?.name || "Unknown",
                executions: (execData.data || []).map(e => ({
                    id: e.id,
                    status: e.status,
                    startedAt: e.startedAt,
                    stoppedAt: e.stoppedAt,
                    mode: e.mode
                }))
            })
        };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
};