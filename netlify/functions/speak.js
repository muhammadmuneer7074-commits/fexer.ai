const { resp } = require('./_supabaseAdmin');

const { resp } = require('./_utils');
exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const { text, voice } = JSON.parse(event.body);
        if (!text?.trim()) return resp(400, { error: 'No text provided' });

        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY },
            body: JSON.stringify({ model: 'tts-1', voice: voice || 'alloy', input: text.slice(0, 4096), response_format: 'mp3' })
        });
        if (!res.ok) return resp(res.status, await res.json());
        const buf = await res.arrayBuffer();
        return resp(200, { audioBase64: Buffer.from(buf).toString('base64') });
    } catch (e) { return resp(500, { error: e.message }); }
};