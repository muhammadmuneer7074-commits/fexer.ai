// Converts text to speech using OpenAI TTS. Returns base64 audio.
const { getUserFromRequest } = require("./_supabaseAdmin");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const { user, error: authError } = await getUserFromRequest(event);
    if (authError) {
        return { statusCode: 401, body: JSON.stringify({ error: authError }) };
    }

    try {
        const { text, voice } = JSON.parse(event.body);

        if (!text) {
            return { statusCode: 400, body: JSON.stringify({ error: "text is required" }) };
        }

        const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "tts-1",
                voice: voice || "alloy",
                input: text,
                response_format: "mp3",
            }),
        });

        if (!ttsRes.ok) {
            const errText = await ttsRes.text();
            console.error("TTS error:", errText);
            return { statusCode: 502, body: JSON.stringify({ error: "TTS provider error" }) };
        }

        const arrayBuffer = await ttsRes.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");

        return {
            statusCode: 200,
            body: JSON.stringify({ audio: base64Audio, format: "mp3" }),
        };
    } catch (err) {
        console.error("speak.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};