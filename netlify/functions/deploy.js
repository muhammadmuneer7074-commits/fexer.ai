exports.handler = async function (event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    try {
        const { prompt, plan, credentials } = JSON.parse(event.body);
        const apiKey = process.env.OPENAI_API_KEY;
        const n8nUrl = process.env.N8N_URL;
        const n8nKey = process.env.N8N_API_KEY;

        if (!n8nUrl || !n8nKey) {
            return { statusCode: 400, body: JSON.stringify({ error: "N8N_URL and N8N_API_KEY must be set in Netlify environment variables." }) };
        }

        // Step 1: Create n8n credentials
        const createdCreds = {};
        for (const svc of (plan.services || [])) {
            if (svc.credentialType === "none") continue;
            const credVal = credentials[svc.credentialKey];
            if (!credVal) continue;
            try {
                const credBody = buildN8nCredential(svc, credVal);
                const credRes = await fetch(n8nUrl + "/api/v1/credentials", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-N8N-API-KEY": n8nKey },
                    body: JSON.stringify(credBody)
                });
                if (credRes.ok) {
                    const credData = await credRes.json();
                    createdCreds[svc.credentialKey] = { id: credData.id, name: credData.name, type: credData.type };
                }
            } catch (e) { console.error("Credential creation failed for", svc.name, e.message); }
        }

        // Step 2: Generate n8n workflow via GPT
        const wfSystemPrompt = `You are an n8n workflow expert. Generate a complete, valid n8n workflow JSON for the following automation.

Rules:
- Return ONLY valid JSON, no explanation
- Use real n8n node types
- Include proper connections between all nodes
- Include error handling where appropriate
- Make the workflow production-ready

Available credential IDs: ${JSON.stringify(createdCreds)}

n8n workflow JSON format:
{
  "name": "workflow name",
  "nodes": [array of node objects],
  "connections": {object mapping node outputs to inputs},
  "settings": {"executionOrder": "v1"},
  "active": false
}

Each node must have: id (unique string), name, type, typeVersion, position [x,y], parameters (object).`;

        const wfRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 3000,
                messages: [
                    { role: "system", content: wfSystemPrompt },
                    { role: "user", content: `Create n8n workflow for: ${prompt}\n\nPlan: ${JSON.stringify(plan)}\n\nCredential IDs to use: ${JSON.stringify(createdCreds)}` }
                ]
            })
        });

        const wfData = await wfRes.json();
        if (!wfRes.ok) return { statusCode: 500, body: JSON.stringify({ error: "Workflow generation failed" }) };

        let wfRaw = wfData.choices[0].message.content.trim();
        wfRaw = wfRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const workflow = JSON.parse(wfRaw);
        workflow.name = plan.agentName || "Fexer Agent";

        // Step 3: Deploy to n8n
        const deployRes = await fetch(n8nUrl + "/api/v1/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-N8N-API-KEY": n8nKey },
            body: JSON.stringify(workflow)
        });

        if (!deployRes.ok) {
            const deployErr = await deployRes.text();
            return { statusCode: 500, body: JSON.stringify({ error: "n8n deploy failed: " + deployErr, workflow }) };
        }

        const deployed = await deployRes.json();

        // Step 4: Activate workflow
        await fetch(n8nUrl + "/api/v1/workflows/" + deployed.id + "/activate", {
            method: "POST",
            headers: { "X-N8N-API-KEY": n8nKey }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                workflowId: deployed.id,
                workflowName: deployed.name,
                workflowUrl: n8nUrl + "/workflow/" + deployed.id,
                credentials: createdCreds,
                workflow: deployed
            })
        };

    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: "Deploy failed: " + e.message }) };
    }
};

function buildN8nCredential(svc, value) {
    const name = svc.name + " (Fexer)";
    const n = svc.name.toLowerCase();

    if (n.includes("openai")) return { name, type: "openAiApi", data: { apiKey: value } };
    if (n.includes("slack")) return { name, type: "slackApi", data: { accessToken: value } };
    if (n.includes("telegram")) return { name, type: "telegramApi", data: { accessToken: value } };
    if (n.includes("airtable")) return { name, type: "airtableTokenApi", data: { accessToken: value } };
    if (n.includes("notion")) return { name, type: "notionApi", data: { apiKey: value } };
    if (n.includes("github")) return { name, type: "githubApi", data: { accessToken: value } };
    if (n.includes("stripe")) return { name, type: "stripeApi", data: { secretKey: value } };
    if (n.includes("anthropic")) return { name, type: "anthropicApi", data: { apiKey: value } };
    if (n.includes("groq")) return { name, type: "groqApi", data: { apiKey: value } };
    if (n.includes("elevenlabs")) return { name, type: "elevenLabsApi", data: { apiKey: value } };
    if (n.includes("pinecone")) return { name, type: "pineconeApi", data: { apiKey: value } };
    if (n.includes("supabase")) return { name, type: "supabaseApi", data: { host: value.split("|")[0] || value, serviceRole: value.split("|")[1] || "" } };
    // Generic HTTP header auth as fallback
    return { name, type: "httpHeaderAuth", data: { name: "Authorization", value: "Bearer " + value } };
}