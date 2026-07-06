// Deploys an agent's plan as a workflow to n8n (running on Railway) via n8n's REST API.
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

function buildWorkflowFromPlan(plan, agentId) {
    const nodes = [];
    const connections = {};

    let triggerNode;
    if (plan.trigger?.type === "webhook") {
        triggerNode = {
            id: "trigger",
            name: "Webhook Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 1,
            position: [250, 300],
            parameters: {
                path: `fexer-agent-${agentId}`,
                httpMethod: "POST",
            },
        };
    } else if (plan.trigger?.type === "schedule") {
        triggerNode = {
            id: "trigger",
            name: "Schedule Trigger",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1,
            position: [250, 300],
            parameters: {
                rule: { interval: [{ field: "hours", hoursInterval: 1 }] },
            },
        };
    } else {
        triggerNode = {
            id: "trigger",
            name: "Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [250, 300],
            parameters: {},
        };
    }
    nodes.push(triggerNode);

    let prevNodeName = triggerNode.name;
    (plan.steps || []).forEach((step, idx) => {
        const nodeName = `Step ${step.step || idx + 1}: ${step.service || "Action"}`;
        nodes.push({
            id: `step-${idx}`,
            name: nodeName,
            type: "n8n-nodes-base.set",
            typeVersion: 3,
            position: [250 + (idx + 1) * 220, 300],
            parameters: {
                assignments: {
                    assignments: [
                        {
                            name: "step_description",
                            value: step.action || "",
                            type: "string",
                        },
                    ],
                },
            },
        });

        connections[prevNodeName] = connections[prevNodeName] || { main: [[]] };
        connections[prevNodeName].main[0].push({ node: nodeName, type: "main", index: 0 });
        prevNodeName = nodeName;
    });

    return {
        name: plan.name || "Fexer Agent",
        nodes,
        connections,
        settings: { executionOrder: "v1" },
        active: false,
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    const supabase = getSupabaseAdmin();

    try {
        const { agentId, credentials } = JSON.parse(event.body);

        if (!agentId) {
            return { statusCode: 400, body: JSON.stringify({ error: "agentId is required" }) };
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

        await supabase.from("agents").update({ status: "deploying" }).eq("id", agentId);

        const workflow = buildWorkflowFromPlan(agent.plan, agentId);

        const n8nRes = await fetch(`${N8N_URL}/api/v1/workflows`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-N8N-API-KEY": N8N_API_KEY,
            },
            body: JSON.stringify(workflow),
        });

        if (!n8nRes.ok) {
            const errText = await n8nRes.text();
            console.error("n8n deploy error:", errText);
            await supabase.from("agents").update({ status: "failed" }).eq("id", agentId);
            return { statusCode: 502, body: JSON.stringify({ error: "Failed to deploy workflow to n8n" }) };
        }

        const n8nData = await n8nRes.json();
        const workflowId = n8nData.id;

        await fetch(`${N8N_URL}/api/v1/workflows/${workflowId}/activate`, {
            method: "POST",
            headers: { "X-N8N-API-KEY": N8N_API_KEY },
        });

        const dashboardUrl = `${N8N_URL}/workflow/${workflowId}`;

        await supabase
            .from("agents")
            .update({
                status: "active",
                n8n_workflow_id: String(workflowId),
                credentials: credentials || {},
                dashboard_url: dashboardUrl,
            })
            .eq("id", agentId);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, workflowId, dashboardUrl }),
        };
    } catch (err) {
        console.error("agent-deploy.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};