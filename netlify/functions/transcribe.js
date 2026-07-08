const { resp } = require('./_supabaseAdmin');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return resp(200, {});
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    try {
        const { audioBase64, mimeType } = JSON.parse(event.body || '{}');
        if (!audioBase64) return resp(400, { error: 'No audio provided' });

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return resp(500, { error: 'OpenAI API key not configured' });

        const buf = Buffer.from(audioBase64, 'base64');
        const blob = new Blob([buf], { type: mimeType || 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'audio.webm');
        fd.append('model', 'whisper-1');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + apiKey },
            body: fd
        });

        const data = await res.json();
        if (!res.ok) return resp(res.status, { error: data.error?.message || 'Transcription failed' });
        return resp(200, { text: data.text || '' });
    } catch (e) {
        console.error('transcribe.js error:', e);
        return resp(500, { error: e.message });
    }
};