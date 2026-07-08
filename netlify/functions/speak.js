const { resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const { text, voice } = JSON.parse(event.body || '{}');
        if (!text || !text.trim()) return resp(400, { error: 'No text provided' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return resp(500, { error: 'OpenAI API key not configured' });

        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'tts-1',
                voice: voice || 'alloy',
                input: text.slice(0, 4096),
                response_format: 'mp3'
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return resp(res.status, { error: err.error?.message || 'TTS failed' });
        }

        const buf = await res.arrayBuffer();
        return resp(200, { audioBase64: Buffer.from(buf).toString('base64') });
    } catch (e) {
        console.error('speak.js error:', e);
        return resp(500, { error: e.message });
    }
};