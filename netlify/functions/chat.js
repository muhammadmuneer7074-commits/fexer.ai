// Main AI chat endpoint. Handles gpt-4o-mini responses, optional Tavily web search.
const { getUserFromRequest, getSupabaseAdmin } = require("./_supabaseAdmin");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { messages, chatId, webSearch, attachments, replaceFromMessageId } = body;

        if (!messages || !Array.isArray(messages)) {
            return { statusCode: 400, body: JSON.stringify({ error: "messages array is required" }) };
        }

        let contextMessages = [...messages];

        // ---- Optional web search enrichment via Tavily ----
        if (webSearch) {
            const lastUserMsg = messages[messages.length - 1]?.content || "";
            try {
                const tavilyRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        api_key: TAVILY_API_KEY,
                        query: lastUserMsg,
                        max_results: 5,
                        search_depth: "basic",
                    }),
                });
                const tavilyData = await tavilyRes.json();
                const searchSummary = (tavilyData.results || [])
                    .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
                    .join("\n\n");

                contextMessages.push({
                    role: "system",
                    content: `Web search results for context (cite sources by number when relevant):\n\n${searchSummary}`,
                });
            } catch (searchErr) {
                console.error("Tavily search failed:", searchErr);
                // Continue without search results rather than failing the whole request
            }
        }

        // ---- Call OpenAI ----
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: contextMessages,
                temperature: 0.7,
                stream: false,
            }),
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error("OpenAI error:", errText);
            return { statusCode: 502, body: JSON.stringify({ error: "AI provider error" }) };
        }

        const openaiData = await openaiRes.json();
        const reply = openaiData.choices[0].message.content;

        // ---- Persist messages to DB if chatId provided ----
        if (chatId) {
            const supabase = getSupabaseAdmin();

            // If this is an edit/regenerate, delete messages from the edit point onward first
            if (replaceFromMessageId) {
                const { data: targetMsg } = await supabase
                    .from("messages")
                    .select("created_at")
                    .eq("id", replaceFromMessageId)
                    .single();

                if (targetMsg) {
                    await supabase
                        .from("messages")
                        .delete()
                        .eq("chat_id", chatId)
                        .gte("created_at", targetMsg.created_at);
                }
            }

            const userMsg = messages[messages.length - 1];

            const { data: insertedRows } = await supabase
                .from("messages")
                .insert([
                    {
                        chat_id: chatId,
                        user_id: user.id,
                        role: "user",
                        content: userMsg.content,
                        attachments: attachments || [],
                    },
                    {
                        chat_id: chatId,
                        user_id: user.id,
                        role: "assistant",
                        content: reply,
                    },
                ])
                .select();

            return {
                statusCode: 200,
                body: JSON.stringify({
                    reply,
                    userMessageId: insertedRows?.[0]?.id || null,
                    assistantMessageId: insertedRows?.[1]?.id || null,
                }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ reply }),
        };
    } catch (err) {
        console.error("chat.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};