// Fetches the current status/dashboard info for an agent, cross-checking n8n's live state.
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const supabase = getSupabaseAdmin();

    try {
        const agentId = event.queryStringParameters?.agentId;

        if (!agentId) {
            const { data: agents, error } = await supabase
                .from("agents")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            return { statusCode: 200, body: JSON.stringify({ agents }) };
        }

        const { data: agent, error: fetchError } = await supabase
            .from("agents")
            .select("*")
            .eq("id", agentId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !agent) {
            return { statusCode: 404, body: JSON.stringify({ error: "Agent not found" }) };
        }

        let liveStatus = null;
        if (agent.n8n_workflow_id) {
            try {
                const n8nRes = await fetch(`${N8N_URL}/api/v1/workflows/${agent.n8n_workflow_id}`, {
                    headers: { "X-N8N-API-KEY": N8N_API_KEY },
                });
                if (n8nRes.ok) {
                    const n8nData = await n8nRes.json();
                    liveStatus = { active: n8nData.active };
                }
            } catch (n8nErr) {
                console.error("n8n status check failed:", n8nErr);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ agent, liveStatus }),
        };
    } catch (err) {
        console.error("agent-status.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};