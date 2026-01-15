// FORCE DEPLOY: VERSION 6.0 (Atomic Financial Safety)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1️⃣ CORS FIRST
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2️⃣ ENV CHECK
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey || !supabaseUrl || !serviceKey) {
      throw new Error("Missing environment variables");
    }

    // 3️⃣ SUPABASE CLIENT
    const supabase = createClient(supabaseUrl, serviceKey);

    // 4️⃣ AUTH (IDENTITY CHECK)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: corsHeaders });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: corsHeaders });
    }

    // 5️⃣ BODY PARSING
    const body = await req.json().catch(() => ({}));
    const { topic, tone, type, prompt, category } = body;

    // 🛑 6️⃣ ATOMIC CREDIT CHECK (THE MONEY GATE) 🛑
    // We only deduct credits for "generate", not "askai"
    if (type === 'generate') {
        // A. READ CURRENT BALANCE
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.id)
            .single();

        if (!profile || profile.credits < 1) {
             return new Response(JSON.stringify({ error: "NO_CREDITS", message: "Insufficient credits" }), { status: 402, headers: corsHeaders });
        }

        // B. ATOMIC UPDATE (Race Condition Fix)
        const { data: updated, error: deductError } = await supabase
            .from('profiles')
            .update({ credits: profile.credits - 1 })
            .eq('id', user.id)
            .eq('credits', profile.credits) // 🔒 Optimistic Lock: Only update if value hasn't changed
            .select('credits')
            .single();

        if (deductError || !updated) {
            console.error("Race condition detected for user:", user.id);
            return new Response(
                JSON.stringify({ error: "CREDIT_RACE_CONDITION", message: "Transaction failed, please try again." }),
                { status: 409, headers: corsHeaders }
            );
        }
    }

    // 7️⃣ GEMINI GENERATION
    const userContent = prompt || topic || category || "The future of AI technology";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let finalPrompt = "";

    if (type === "askai") {
      finalPrompt = `
Return ONLY valid JSON.
Generate 3 LinkedIn post ideas for:
"${userContent}"

{
  "ideas": [
    { "title": "", "topic": "", "tone": "" }
  ]
}`;
    } else {
      finalPrompt = `
Write a professional LinkedIn post.

Topic: ${userContent}
Tone: ${tone || "professional"}

Rules:
- Strong hook
- Short paragraphs
- Emojis
- CTA at end
`;
    }

    const result = await model.generateContent(finalPrompt);
    const text = result.response.text().trim();

    // 8️⃣ SUCCESS
    return new Response(
      JSON.stringify({ content: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});