import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get API Key (Check both to be safe)
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('API Key missing! Check Supabase Secrets.');

    // 3. Get User Input (Including 'prompt' and 'category' for Ask AI)
    const { topic, tone, type, prompt, category } = await req.json()

    // 4. Setup Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let finalPrompt = "";

    // 5. THE LOGIC SWITCH: Check if we are generating Ideas (Ask AI) or a Post
    if (type === 'askai') {
      // Logic for "Ask AI" button
      finalPrompt = `I need 3 LinkedIn post ideas for the category "${category}".
      User Context: "${prompt}"
      
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

    // 6. Generate Content
    const result = await model.generateContent(finalPrompt)
    const response = result.response
    const text = response.text()

    return new Response(JSON.stringify({ content: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})