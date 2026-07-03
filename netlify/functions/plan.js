exports.handler = async function (event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.OPENAI_API_KEY;

        const systemPrompt = `You are an AI Agent Builder expert. Analyze the user's automation request and respond ONLY with a JSON object.

The JSON must have this exact structure:
{
  "agentName": "Short descriptive name",
  "description": "What this agent does in 1-2 sentences",
  "services": [
    {
      "name": "Service name (e.g. Gmail, OpenAI, Slack)",
      "reason": "Why this service is needed",
      "credentialType": "api_key|oauth|webhook|none",
      "credentialLabel": "Label to show user (e.g. OpenAI API Key)",
      "credentialKey": "unique_key_for_this_credential (e.g. openai_api_key)",
      "getUrl": "URL where user can get this credential",
      "docsUrl": "Documentation URL"
    }
  ],
  "steps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "trigger": "manual|schedule|webhook|email|form",
  "triggerConfig": { "schedule": "0 9 * * 1" },
  "n8nNodes": ["node types needed e.g. Gmail Trigger, OpenAI, Slack"]
}

Detect ALL required services. Only include credentials that are truly needed. Be accurate.`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                max_tokens: 1500,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "User request: " + prompt }
                ]
            })
        });

        const data = await res.json();
        if (!res.ok) return { statusCode: res.status, body: JSON.stringify({ error: data.error?.message || "AI error" }) };

        let raw = data.choices[0].message.content.trim();
        raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const plan = JSON.parse(raw);

        return { statusCode: 200, body: JSON.stringify({ plan }) };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ error: "Planning failed: " + e.message }) };
    }
};