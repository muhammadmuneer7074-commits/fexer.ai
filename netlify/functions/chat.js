exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const { messages, voiceMode, style, deepThinking, customInstructions, deepSearch, toolsEnabled } = JSON.parse(event.body);
    const apiKey = process.env.OPENAI_API_KEY;

    const STYLE_PROMPTS = {
      normal: "",
      concise: " Keep all answers as brief as possible — get straight to the point, no extra fluff.",
      friendly: " Be warm, casual, and conversational, like chatting with a good friend. Use a relaxed, approachable tone.",
      formal: " Respond in a professional, precise, and formal tone, suitable for business or academic contexts.",
      creative: " Be imaginative and expressive, using vivid language and creative framing where it fits."
    };

    let systemPrompt = "You are Fexer AI, a friendly and helpful assistant. Always reply in the same language the user is writing or speaking in.";

    if (style && STYLE_PROMPTS[style]) {
      systemPrompt += STYLE_PROMPTS[style];
    }

    if (customInstructions && customInstructions.trim() !== "") {
      systemPrompt += " Additional instructions from the user, which you should always follow: " + customInstructions.trim();
    }

    if (deepThinking) {
      systemPrompt += " Think through this carefully, step by step, before giving your final answer. Consider multiple angles, double-check your facts and reasoning, and make sure your answer is accurate and well-reasoned. Prioritize being thorough and correct over being fast.";
    }

    if (voiceMode) {
      systemPrompt += " You are in a live spoken conversation. Respond quickly with short, natural replies — about 1 to 2 sentences — unless the user clearly asks for more detail.";
    }

    let searchContext = "";

    if (deepSearch) {
      const lastUserMessage = messages[messages.length - 1];
      const searchQuery = extractTextFromMessage(lastUserMessage);

      if (searchQuery) {
        try {
          const tavilyResponse = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + process.env.TAVILY_API_KEY
            },
            body: JSON.stringify({
              query: searchQuery,
              search_depth: "basic",
              max_results: 5,
              include_answer: false
            })
          });

          if (tavilyResponse.ok) {
            const tavilyData = await tavilyResponse.json();
            searchContext = formatSearchResults(tavilyData.results);
          } else {
            console.error("Tavily search failed with status:", tavilyResponse.status);
          }
        } catch (searchError) {
          console.error("Tavily search error:", searchError);
        }
      }
    }

    if (searchContext) {
      systemPrompt +=
        " You have been given fresh web search results below. Use them to answer accurately. For each key fact, include the source as a clickable markdown link, e.g. [Source Name](https://example.com), so the user can visit the original page. Always include at least one direct source link. Note that information may be time-sensitive.\n\nSEARCH RESULTS:\n" +
        searchContext;
    }

    const sanitizedMessages = sanitizeMessagesForAPI(messages);

    const requestBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...sanitizedMessages
      ]
    };

    if (toolsEnabled !== false) {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "generate_image",
            description: "Generates an image from a text description. Use this whenever the user asks you to draw, create, generate, design, or make an image, photo, picture, illustration, or artwork.",
            parameters: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "A detailed, vivid description of the image to generate, written in English."
                }
              },
              required: ["prompt"]
            }
          }
        }
      ];
    }

    if (voiceMode) {
      requestBody.max_tokens = 120;
    } else if (deepThinking) {
      requestBody.max_tokens = 1000;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data)
      };
    }

    const choice = data.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];

      if (toolCall.function.name === "generate_image") {
        const args = JSON.parse(toolCall.function.arguments);
        const imagePrompt = args.prompt;

        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
          },
          body: JSON.stringify({
            model: "gpt-image-1-mini",
            prompt: imagePrompt,
            n: 1,
            size: "1024x1024"
          })
        });

        const imageData = await imageResponse.json();

        if (!imageResponse.ok) {
          const errorMsg = imageData.error ? imageData.error.message : "Please try again.";
          return {
            statusCode: 200,
            body: JSON.stringify({
              choices: [{
                message: {
                  role: "assistant",
                  content: "⚠️ I couldn't generate that image right now. " + errorMsg
                }
              }]
            })
          };
        }

        const base64Image = imageData.data[0].b64_json;
        const fakeContent = "{{FEXER_IMAGE:" + base64Image + "}}\nHere's the image you asked for!";

        return {
          statusCode: 200,
          body: JSON.stringify({
            choices: [{
              message: { role: "assistant", content: fakeContent }
            }]
          })
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error: " + error.message })
    };
  }
};

function extractTextFromMessage(message) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    const textPart = message.content.find(function (p) { return p.type === "text"; });
    return textPart ? textPart.text : "";
  }
  return "";
}

function formatSearchResults(results) {
  if (!results || results.length === 0) return "";
  return results
    .map(function (r, i) {
      return (i + 1) + ". " + r.title + " (" + r.url + ")\n" + r.content;
    })
    .join("\n\n");
}

function sanitizeMessagesForAPI(messages) {
  return messages.map(function (msg) {
    if (msg.role === "assistant" && typeof msg.content === "string" && msg.content.indexOf("{{FEXER_IMAGE:") === 0) {
      return { role: "assistant", content: "[I generated an image here for the user.]" };
    }
    return msg;
  });
}