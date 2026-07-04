// Transcribes audio to text using OpenAI Whisper.
// Expects a JSON body with base64-encoded audio: { audio: "base64...", mimeType: "audio/webm" }
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
    const { audio, mimeType } = JSON.parse(event.body);

    if (!audio) {
      return { statusCode: 400, body: JSON.stringify({ error: "audio (base64) is required" }) };
    }

    const audioBuffer = Buffer.from(audio, "base64");
    const ext = (mimeType || "audio/webm").split("/")[1] || "webm";

    const boundary = "----FexerBoundary" + Date.now();
    const preamble =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n` +
      `whisper-1\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="audio.${ext}"\r\n` +
      `Content-Type: ${mimeType || "audio/webm"}\r\n\r\n`;
    const closing = `\r\n--${boundary}--\r\n`;

    const body = Buffer.concat([
      Buffer.from(preamble, "utf-8"),
      audioBuffer,
      Buffer.from(closing, "utf-8"),
    ]);

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error("Whisper error:", errText);
      return { statusCode: 502, body: JSON.stringify({ error: "Transcription provider error" }) };
    }

    const data = await whisperRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ text: data.text }),
    };
  } catch (err) {
    console.error("transcribe.js error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};