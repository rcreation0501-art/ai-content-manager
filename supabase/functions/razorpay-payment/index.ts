// Final Production Version - Razorpay Payment Handler
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import Razorpay from "npm:razorpay@2.9.2"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

const PLANS = {
  'pro_monthly': {
    amount: 399,
    currency: 'INR',
    credits: 100,
    type: 'subscription'
  },
  'credit_topup_100': {
    amount: 100,
    currency: 'INR',
    credits: 100,
    type: 'one_time'
  },
  'credit_topup_global': {
    amount: 2,
    currency: 'USD',
    credits: 100,
    type: 'one_time'
  },
  'pro_monthly_usd': {
    amount: 8,
    currency: 'USD',
    credits: 100,
    type: 'subscription'
  }
}

Deno.serve(async (req) => {
  // 1. Handle CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Setup Clients
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!razorpayKeyId || !razorpayKeySecret || !supabaseUrl || !supabaseKey) {
      console.error("❌ Environment Variables Missing");
      throw new Error("Server Misconfiguration: Key missing");
    }

    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 3. Auth
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    console.log("🔑 Auth Check:", !!authHeader ? "Present" : "Missing");

    // Fix: The 'i' makes it case insensitive so 'bearer' works too
    if (!authHeader?.match(/^Bearer /i)) {
      throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized user access');

    // 4. Input Parsing
    const body = await req.json();
    console.log("📥 Payload:", JSON.stringify(body));

    const { action, mode, plan, payment_id, order_id, signature, currency } = body;
    // Leniency check for action name (support space or underscore)
    const normalizedAction = String(action || "").trim().replace(' ', '_');

    // 5. Plan Selection
    let effectivePlanKey = plan;
    if (mode === 'credits') {
      effectivePlanKey = (currency === 'USD') ? 'credit_topup_global' : 'credit_topup_100';
    } else if (!effectivePlanKey || !PLANS[effectivePlanKey as keyof typeof PLANS]) {
      effectivePlanKey = (currency === 'USD') ? 'pro_monthly_usd' : 'pro_monthly';
    }

    const selectedPlan = PLANS[effectivePlanKey as keyof typeof PLANS];
    if (!selectedPlan) throw new Error(`Invalid plan: ${effectivePlanKey}`);

    console.log("🎯 Targeting:", effectivePlanKey);

    // --- Action: Create Order ---
    if (normalizedAction === 'create_order') {
      try {
        const isOneTime = mode === 'credits' || effectivePlanKey.startsWith('credit_topup');
        const options = {
          amount: Math.round(selectedPlan.amount * 100),
          currency: selectedPlan.currency,
          receipt: `rcpt_${isOneTime ? 'c' : 's'}_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: { type: isOneTime ? "credit_topup" : "subscription", userId: user.id, plan_id: effectivePlanKey }
        };

        const order = await razorpay.orders.create(options);
        return new Response(JSON.stringify(order), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (e: any) {
        console.error("❌ Razorpay Order Fail:", e);
        throw new Error(`Order Failed: ${e.description || e.message}`);
      }
    }

    // --- Action: Verify Payment ---
    if (normalizedAction === 'verify_payment') {
      if (!payment_id || !order_id || !signature) throw new Error("Incomplete verification data");

      const { data: existingTx } = await supabaseAdmin.from('payment_transactions').select('id').eq('payment_id', payment_id).maybeSingle();
      if (existingTx) throw new Error("Duplicate payment attempt");

      // Sign Verification
      const text = order_id + "|" + payment_id;
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(razorpayKeySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(text));
      const generated = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (generated !== signature) throw new Error("Signature Mismatch");

      const { data: profile } = await supabaseAdmin.from('profiles').select('credits, subscription_expiry').eq('id', user.id).maybeSingle();
      if (!profile) throw new Error("Profile Missing");

      const updates: any = { credits: (profile.credits || 0) + selectedPlan.credits, is_subscribed: true };
      if (selectedPlan.type === 'subscription') {
        const basis = (profile.subscription_expiry && new Date(profile.subscription_expiry) > new Date()) ? new Date(profile.subscription_expiry) : new Date();
        updates.subscription_expiry = new Date(basis.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      await supabaseAdmin.from('profiles').update(updates).eq('id', user.id);
      await supabaseAdmin.from('payment_transactions').insert({ user_id: user.id, payment_id, order_id, amount: selectedPlan.amount, currency: selectedPlan.currency, status: 'success' });

      return new Response(JSON.stringify({ success: true, balance: updates.credits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    throw new Error(`Unknown action: ${normalizedAction}`);

  } catch (error: any) {
    console.error("💥 Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message, status: "error" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});