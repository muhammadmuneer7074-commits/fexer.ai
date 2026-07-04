// Takes a user's natural-language automation idea and turns it into a structured plan
// (trigger, steps, required credentials) using gpt-4o-mini with JSON output.
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are an automation planning engine for an AI Agent Builder.
Given a user's plain-English description of an automation/agent they want, output ONLY valid JSON (no markdown, no preamble) with this exact shape:
{
  "name": "short agent name",
  "description": "one sentence summary",
  "trigger": { "type": "webhook|schedule|manual", "details": "description of trigger" },
  "steps": [
    { "step": 1, "action": "description of what happens", "service": "e.g. Gmail, Slack, OpenAI" }
  ],
  "required_credentials": [
    { "key": "service_api_key", "label": "Human readable label", "service": "e.g. Slack" }
  ]
}`;

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    try {
        const { prompt } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "prompt is required" }) };
        }

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt },
                ],
                temperature: 0.3,
                response_format: { type: "json_object" },
            }),
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error("OpenAI error:", errText);
            return { statusCode: 502, body: JSON.stringify({ error: "AI provider error" }) };
        }

        const data = await openaiRes.json();
        const plan = JSON.parse(data.choices[0].message.content);

        const supabase = getSupabaseAdmin();
        const { data: agent, error: dbError } = await supabase
            .from("agents")
            .insert({
                user_id: user.id,
                name: plan.name || "Untitled Agent",
                prompt,
                plan,
                status: "planning",
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return {
            statusCode: 200,
            body: JSON.stringify({ agentId: agent.id, plan }),
        };
    } catch (err) {
        console.error("agent-plan.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};