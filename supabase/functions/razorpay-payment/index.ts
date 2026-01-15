import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Razorpay from "npm:razorpay@2.9.2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS Preflight (Browser Check)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Initialize Supabase Admin (To write credits)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. SECURE AUTH: Get User from the Token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header passed')
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // 4. Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID'),
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
    })

    // 5. Parse Request
    const { action, plan, currency, payment_id, order_id, signature } = await req.json()

    // --- ACTION: CREATE ORDER ---
    if (action === 'create_order') {
      // 1499 INR or 19 USD (in paise/cents)
      const amount = (currency === 'INR') ? 149900 : 1900 
      
      const options = {
        amount: amount,
        currency: currency,
        receipt: `receipt_${user.id.slice(0, 8)}_${Date.now()}`,
        notes: {
          user_id: user.id, // Store User ID in Razorpay metadata
          plan: plan
        }
      }

      const order = await razorpay.orders.create(options)
      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- ACTION: VERIFY PAYMENT & ADD CREDITS ---
    if (action === 'verify_payment') {
      const text = order_id + "|" + payment_id
      
      // Verify Signature
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || "";
      const encoder = new TextEncoder();
      const keyData = encoder.encode(keySecret);
      const msgData = encoder.encode(text);

      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const generated_signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (generated_signature === signature) {
        console.log(`✅ Payment Verified for User: ${user.id}`);

        // 1. Add Credits to Profile
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            credits: 100,         
            is_subscribed: true,  
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      } else {
        throw new Error("Invalid Signature")
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid Action' }), { status: 400, headers: corsHeaders })

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
  }
})
// Trigger deployment 🚀