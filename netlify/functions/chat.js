const { verifyUser, checkAndUseCredit, resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers);
        if (user) {
            const cr = await checkAndUseCredit(user.id, 1, 'chat');
            if (!cr.ok) return resp(402, { error: 'NO_CREDITS', message: 'No credits remaining.' });
        }
        const { messages = [], voiceMode = false, deepThinking = false, deepSearch = false, customInstructions = '', toolsEnabled = true } = JSON.parse(event.body || '{}');
        const key = process.env.OPENAI_API_KEY;
        if (!key) return resp(500, { error: 'OPENAI_API_KEY not set' });

        let sys = 'You are Fexer AI, a friendly and highly capable AI assistant. Always reply in the same language the user writes in.';
        if (customInstructions?.trim()) sys += ' ' + customInstructions.trim();
        if (deepThinking) sys += ' Think step by step. Be thorough and accurate.';
        if (voiceMode) sys += ' You are in a live voice conversation. Keep replies short — 1-2 sentences.';

        if (deepSearch && process.env.TAVILY_API_KEY) {
            try {
                const last = messages[messages.length - 1];
                const q = typeof last.content === 'string' ? last.content : (last.content?.find?.(p => p.type === 'text')?.text || '');
                if (q.trim()) {
                    const tr = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.TAVILY_API_KEY }, body: JSON.stringify({ query: q, search_depth: 'basic', max_results: 5 }) });
                    if (tr.ok) { const td = await tr.json(); const ctx = (td.results || []).map((r, i) => `${i + 1}. ${r.title}\nURL: ${r.url}\n${r.content}`).join('\n\n'); if (ctx) sys += '\n\nWeb search results:\n' + ctx + '\n\nCite source URLs in your answer.'; }
                }
            } catch (e) { }
        }

        const body = { model: 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, ...messages] };
        if (toolsEnabled) {
            body.tools = [{ type: 'function', function: { name: 'generate_image', description: 'Generate an image when user asks for a picture or image.', parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] } } }];
            body.tool_choice = 'auto';
        }
        if (voiceMode) body.max_tokens = 150;
        else if (deepThinking) body.max_tokens = 2000;

        const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) return resp(res.status, data);

        const choice = data.choices[0];
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
            if (user) await checkAndUseCredit(user.id, 1, 'image_gen');
            const args = JSON.parse(choice.message.tool_calls[0].function.arguments);
            const ir = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body: JSON.stringify({ model: 'dall-e-3', prompt: args.prompt, n: 1, size: '1024x1024', response_format: 'b64_json' }) });
            const id = await ir.json();
            if (!ir.ok) return resp(200, { choices: [{ message: { role: 'assistant', content: '⚠️ Image generation failed: ' + (id.error?.message || 'Try again.') } }] });
            return resp(200, { choices: [{ message: { role: 'assistant', content: '{{FEXER_IMAGE:' + id.data[0].b64_json + '}}\nHere\'s your image!' } }] });
        }
        return resp(200, data);
    } catch (e) { return resp(500, { error: e.message }); }
};