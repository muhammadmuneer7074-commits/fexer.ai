exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { userMessage, webhookUrl, appId, target } = JSON.parse(event.body);

    if (!webhookUrl || !webhookUrl.startsWith("https://")) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: "⚠️ No valid automation webhook URL was provided." })
      };
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, appId: appId || "", target: target || "" })
    });

    if (!n8nResponse.ok) {
      throw new Error("N8n webhook failed");
    }

    const result = await n8nResponse.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: result.output || "Automation completed!" })
    };

  } catch (error) {
    console.error("Automation error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: "Automation failed. Please try again." })
    };
  }
};