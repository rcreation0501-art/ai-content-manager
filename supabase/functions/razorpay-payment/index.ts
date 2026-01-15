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
    credits: 100
  },
  'pro_monthly_usd': {
    amount: 8, 
    currency: 'USD',
    credits: 100
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID') || '',
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') || '',
    })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header passed')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) throw new Error('Unauthorized')

    const { action, plan = 'pro_monthly', payment_id, order_id, signature } = await req.json()

    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    if (!selectedPlan) throw new Error('Invalid plan selection');

    // ---------------------------------------------------------
    // ACTION 1: CREATE ORDER
    // ---------------------------------------------------------
    if (action === 'create_order') {
      const options = {
        amount: selectedPlan.amount * 100, 
        currency: selectedPlan.currency,   
        receipt: `receipt_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: user.id, plan_id: plan }
      }

      const order = await razorpay.orders.create(options)
      return new Response(JSON.stringify(order), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // ---------------------------------------------------------
    // ACTION 2: VERIFY PAYMENT & ADD CREDITS
    // ---------------------------------------------------------
    if (action === 'verify_payment') {
      // ✅ FIX 1: Guard against missing data
      if (!payment_id || !order_id || !signature) {
        throw new Error("Incomplete payment data");
      }

      // Replay Protection
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

      // ✅ FIX 2: Use maybeSingle() for profile fetch
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('credits').eq('id', user.id).maybeSingle();

      if (!profile) throw new Error("Profile not found");

      const newCredits = (profile.credits || 0) + selectedPlan.credits;

      const { error: updateError } = await supabaseAdmin.from('profiles').update({ 
          credits: newCredits, 
          is_subscribed: true,
          subscription_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }).eq('id', user.id)

      if (updateError) throw updateError;

      await supabaseAdmin.from('payment_transactions').insert({
        user_id: user.id,
        payment_id: payment_id,
        order_id: order_id,
        amount: selectedPlan.amount,
        currency: selectedPlan.currency,
        status: 'success'
      });

      return new Response(JSON.stringify({ success: true, balance: newCredits }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, headers: corsHeaders 
    })
  }
})