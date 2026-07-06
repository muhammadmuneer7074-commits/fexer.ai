// Generates an image from a text prompt using OpenAI's image generation API.
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
        const { prompt, size } = JSON.parse(event.body);

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: "prompt is required" }) };
        }

        const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "dall-e-3",
                prompt,
                n: 1,
                size: size || "1024x1024",
                response_format: "b64_json",
            }),
        });

        if (!imgRes.ok) {
            const errText = await imgRes.text();
            console.error("Image gen error:", errText);
            return { statusCode: 502, body: JSON.stringify({ error: "Image generation provider error" }) };
        }

        const data = await imgRes.json();
        const b64 = data.data[0].b64_json;

        return {
            statusCode: 200,
            body: JSON.stringify({ image: `data:image/png;base64,${b64}` }),
        };
    } catch (err) {
        console.error("generate-image.js error:", err);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
    }
};