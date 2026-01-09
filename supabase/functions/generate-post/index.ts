import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { prompt, topic, tone, category, type } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

    let finalPrompt = "";

    if (type === "askai") {
      finalPrompt = `I need 3 LinkedIn post ideas for the category "${category}".
User Context/Description: "${prompt}"

Return strictly valid JSON with this exact structure (no markdown formatting):
{
  "ideas": [
    {
      "title": "Short catchy title",
      "topic": "The detailed topic prompt to use for generation",
      "tone": "Suggested tone"
    }
  ]
}`;
    } else {
      finalPrompt = `Act as a professional LinkedIn content creator.

Task: Write a high-quality, engaging LinkedIn post.
Category: ${category}
Tone: ${tone}
Topic/Context: ${topic}

Requirements:
- Use appropriate spacing for readability.
- Include a catchy hook in the first line.
- Use relevant emojis.
- End with a call to action.`;
    }

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ content: text }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate content"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
