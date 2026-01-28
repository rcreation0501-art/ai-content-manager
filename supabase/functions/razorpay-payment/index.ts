// Final Production Version - Razorpay Payment Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import Razorpay from "npm:razorpay@2.9.2"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PLANS = {
  'pro_monthly': {
    amount: 399,
    currency: 'INR',
    credits: 100,
    type: 'subscription' // 👈 New field
  },
  'credit_topup_100': {      // 👈 New Plan
    amount: 100,
    currency: 'INR',
    credits: 100,
    type: 'one_time'     // 👈 One-time purchase
  },
  'pro_monthly_usd': {
    amount: 8,
    currency: 'USD',
    credits: 100,
    type: 'subscription'
  }
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // 2. Setup Razorpay & Supabase
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("❌ MISSING RAZORPAY KEYS in Edge Function"); // Log to Supabase Dashboard
      throw new Error("Server Misconfiguration: Missing Razorpay Keys");
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    })

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server Misconfiguration: Missing Supabase Keys");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // 3. Authenticate User
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header passed')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) throw new Error('Unauthorized')

    // 4. Parse Request
    const { action, plan = 'pro_monthly', payment_id, order_id, signature } = await req.json()
    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    if (!selectedPlan) throw new Error('Invalid plan selection');

    // ==========================================
    // ACTION: CREATE ORDER
    // ==========================================
    if (action === 'create_order') {
      const options = {
        amount: selectedPlan.amount * 100, // Amount in paise
        currency: selectedPlan.currency,
        receipt: `receipt_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan_id: plan }
      }

      const order = await razorpay.orders.create(options)
      return new Response(JSON.stringify(order), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // ==========================================
    // ACTION: VERIFY PAYMENT
    // ==========================================
    if (action === 'verify_payment') {
      if (!payment_id || !order_id || !signature) {
        throw new Error("Incomplete payment data");
      }

      // Check for Replay Attack (Double counting)
      const { data: existingTx } = await supabaseAdmin
        .from('payment_transactions')
        .select('id')
        .eq('payment_id', payment_id)
        .maybeSingle();

      if (existingTx) throw new Error("Payment already processed");

      // Verify Signature
      const text = order_id + "|" + payment_id
      const secret = Deno.env.get('RAZORPAY_KEY_SECRET') || ""
      const encoder = new TextEncoder()
      const keyData = encoder.encode(secret)
      const msgData = encoder.encode(text)

      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      )
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
      const generated_signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('')

      if (generated_signature !== signature) throw new Error("Invalid Signature")

      // Fetch User Profile
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('credits').eq('id', user.id).maybeSingle();

      if (!profile) throw new Error("Profile not found");

      // Add Credits & Subscribe
      // ✅ LOGIC UPDATE: Calculate Expiry based on Plan Type
      const updates: any = {
        credits: (profile.credits || 0) + selectedPlan.credits,
        is_subscribed: true
      };

      // Only extend date if it is a SUBSCRIPTION type
      // @ts-ignore
      if (selectedPlan.type === 'subscription') {
        const currentExpiry = profile.subscription_expiry ? new Date(profile.subscription_expiry) : new Date();
        const now = new Date();
        // If already active, add 30 days to the FUTURE expiry. If expired, add 30 days to NOW.
        const basisDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(basisDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        updates.subscription_expiry = newExpiry.toISOString();
      }

      const { error: updateError } = await supabaseAdmin.from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record Transaction
      await supabaseAdmin.from('payment_transactions').insert({
        user_id: user.id,
        payment_id: payment_id,
        order_id: order_id,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        status: 'success'
      });

      return new Response(JSON.stringify({ success: true, balance: updates.credits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Payment Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})