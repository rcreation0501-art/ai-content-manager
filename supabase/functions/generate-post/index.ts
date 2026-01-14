import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('API Key missing!');

    // 2. DEFENSIVE PARSE
    const body = await req.json().catch(() => ({})); 
    const { topic, tone, type, prompt, category } = body;

    // 3. THE FALLBACK (Prevents 400 Errors during testing)
    // If input is empty, we force a default topic so the pipeline never breaks.
    const userContent = prompt || topic || category || "The future of AI technology"; 

    // 4. Setup Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let finalPrompt = "";

    if (type === 'askai') {
      finalPrompt = `I need 3 LinkedIn post ideas. Context: "${userContent}".
      Return strictly valid JSON (no markdown):
      { "ideas": [{ "title": "Title", "topic": "Topic", "tone": "Tone" }] }`;
    } else {
      finalPrompt = `Write a ${tone || 'professional'} LinkedIn post about: "${userContent}". 
      Keep it engaging, under 200 words.`;
    }

    const result = await model.generateContent(finalPrompt)
    const response = result.response
    const text = response.text().trim()

    return new Response(JSON.stringify({ content: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Server Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})