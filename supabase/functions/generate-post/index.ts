import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Hardening #1: Explicit methods
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get API Key (Check both to be safe)
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
        console.error("Missing API Key");
        throw new Error('API Key missing! Check Supabase Secrets.');
    }

    // 3. Get User Input (Hardening #2: Defensive Parse)
    // If json() fails (empty body), we return {} so the code doesn't crash here.
    const body = await req.json().catch(() => ({})); 
    const { topic, tone, type, prompt, category } = body;

    // 4. VALIDATION GUARDS
    // Ask AI: Needs (prompt OR category)
    if (type === 'askai' && !prompt && !category) {
      return new Response(JSON.stringify({ error: 'Missing prompt or category for Ask AI' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Client Error
      });
    }
    
    // Standard Post: Needs topic
    if (type !== 'askai' && !topic) {
      return new Response(JSON.stringify({ error: 'Missing topic for post generation' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Client Error
      });
    }

    // 5. Setup Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let finalPrompt = "";

    // 6. LOGIC SWITCH
    if (type === 'askai') {
      // Logic for "Ask AI" button
      finalPrompt = `I need 3 LinkedIn post ideas for the category "${category || 'General'}".
      User Context: "${prompt || topic}"
      
      Return strictly valid JSON with this exact structure (no markdown, no backticks):
      {
        "ideas": [
          { "title": "Short catchy title", "topic": "Detailed topic prompt", "tone": "Suggested tone" }
        ]
      }`;
    } else {
      // Logic for "Create Post" button
      finalPrompt = `Write a ${tone || 'professional'} LinkedIn post about: "${topic}". 
      Context: ${category || 'General'}.
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
    // 9. CATCH ALL (Server/Gemini Errors)
    console.error("Backend Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Server Error
    })
  }
})