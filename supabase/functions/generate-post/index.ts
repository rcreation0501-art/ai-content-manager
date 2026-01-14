import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS (Allow the app to talk to the server)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Get the API Key (Try both names to be safe)
    const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMINI_API_KEY');
    
    if (!apiKey) {
      throw new Error('API Key missing! Please set GOOGLE_API_KEY in Supabase Secrets.')
    }

    // 3. Get the User's Input
    const { topic, tone, type } = await req.json()
    
    // 4. Call Google Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const prompt = `Write a ${tone || 'professional'} LinkedIn post about: "${topic}". 
    Type: ${type || 'standard'}. 
    Keep it engaging and under 200 words.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // 5. Send the Result back
    return new Response(JSON.stringify({ content: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    // 6. IF IT FAILS: Send the error message to the user (instead of crashing)
    console.error("Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})