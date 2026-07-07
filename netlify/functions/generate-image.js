const { verifyUser, checkAndUseCredit, resp } = require('./_supabaseAdmin');

const { resp } = require('./_utils');
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const user = await verifyUser(event.headers.authorization || event.headers.Authorization);
        if (user) {
            const ok = await checkAndUseCredit(user.id, 2, 'image_gen_direct');
            if (!ok.ok) return resp(402, { error: 'NO_CREDITS', message: 'No credits remaining.' });
        }

        const { prompt, size = '1024x1024' } = JSON.parse(event.body);
        if (!prompt?.trim()) return resp(400, { error: 'No prompt provided' });

        const res = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
            body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, response_format: 'b64_json' })
        });
        const data = await res.json();
        if (!res.ok) return resp(res.status, { error: data.error?.message || 'Generation failed' });
        return resp(200, { b64: data.data[0].b64_json, revised_prompt: data.data[0].revised_prompt });
    } catch (e) { return resp(500, { error: e.message }); }
};