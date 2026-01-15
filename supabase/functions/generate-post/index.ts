// FORCE DEPLOY: VERSION 5.1 (Stable + Auth Ready)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1️⃣ CORS FIRST (never after auth)
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

    // 4️⃣ AUTH
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
    }

    // 5️⃣ BODY (SAFE PARSE)
    const body = await req.json().catch(() => ({}));
    const { topic, tone, type, prompt, category } = body;

    const userContent =
      prompt || topic || category || "The future of AI technology";

    // 6️⃣ GEMINI
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

    // 7️⃣ SUCCESS
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
