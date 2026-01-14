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
    // 2. Get API Key
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('API Key missing! Check Supabase Secrets.');

    // 3. Get User Input (Defensive Parse)
    const body = await req.json().catch(() => ({})); 
    const { topic, tone, type, prompt, category } = body;

    // 4. UNIVERSAL INPUT HANDLING (The Fix)
    // We grab the text from ANY of these fields so it never fails validation.
    const userContent = prompt || topic || category; 

    // Validation: If literally everything is empty, THEN complain.
    if (!userContent) {
      return new Response(JSON.stringify({ error: 'Missing input! Please provide a topic or prompt.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 5. Setup Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let finalPrompt = "";

    // 6. LOGIC SWITCH
    if (type === 'askai') {
      // Logic for "Ask AI" (Idea Generator)
      finalPrompt = `I need 3 LinkedIn post ideas.
      User Context: "${userContent}"
      
      Return strictly valid JSON with this exact structure (no markdown):
      {
        "ideas": [
          { "title": "Short catchy title", "topic": "Detailed topic prompt", "tone": "Suggested tone" }
        ]
      }`;
    } else {
      // Logic for "Create Post" (Content Generator)
      finalPrompt = `Write a ${tone || 'professional'} LinkedIn post. 
      Topic: "${userContent}". 
      Requirements: Catchy hook, under 200 words, use emojis, clear structure.`;
    }

    // 7. Generate
    const result = await model.generateContent(finalPrompt)
    const response = result.response
    const text = response.text().trim()

    // 8. Return Result
    return new Response(JSON.stringify({ content: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("Backend Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})