import React, { useState, useEffect } from 'react';
import { X, Check, Globe, ShieldCheck, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PricingModalProps {
  user: any;
  onClose: () => void;
}

export default function PricingModal({ user, onClose }: PricingModalProps) {
 const [isIndia, setIsIndia] = useState(true);
const [loading, setLoading] = useState(false);
const [razorpayReady, setRazorpayReady] = useState(false); // 🔥 Add this
  const { toast } = useToast();

  // --- FIX: Load Razorpay Script on Mount ---
useEffect(() => {
    // 1. Check if Razorpay is already available (e.g., from a previous mount)
    if ((window as any).Razorpay) {
      setRazorpayReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    // 2. Update state once the script is loaded
    script.onload = () => {
      setRazorpayReady(true);
      console.log('✅ Razorpay SDK loaded and ready');
    };

    script.onerror = () => {
      console.error("❌ Razorpay SDK failed to load");
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up the script tag if the component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    // 1. 🔥 PASTE THIS NEW BLOCK HERE
    if (!import.meta.env.VITE_RAZORPAY_KEY_ID) {
      toast({
        title: "Configuration Error",
        description: "Payment key is missing. Contact support.",
        variant: "destructive"
      });
      return;
    }

    // 2. Your existing check (KEEP THIS)
    if (!razorpayReady) {
      toast({
        title: "Payment Module Loading",
        description: "Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }

    // ... rest of your code
    setLoading(true);
    try {
      const plan = isIndia ? 'pro_monthly' : 'pro_monthly_usd';

      // 1. Invoke Edge Function
      const { data, error } = await supabase.functions.invoke('razorpay-payment', {
        body: { action: 'create_order', plan }
      });

      if (error) throw error;

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "Sasa AI",
        description: isIndia ? "Pro Plan - India" : "Pro Plan - Global",
        order_id: data.id,
        handler: async (response: any) => {
          // 3. Verify Payment
          const { error: verifyError } = await supabase.functions.invoke('razorpay-payment', {
            body: { 
              action: 'verify_payment',
              plan,
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
              user_id: user.id // 🔥 REQUIRED
            }
          });

          if (verifyError) {
            toast({ title: "Verification Failed", variant: "destructive" });
          } else {
            toast({ title: "Success!", description: "100 Credits added." });
            onClose();
            window.location.reload();
          }
        },
        prefill: { email: user?.email },
        theme: { color: "#ef4444" },
        modal: { 
          ondismiss: () => setLoading(false) 
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment Start Error:", err);
      toast({ 
        title: "Connection Issue", 
        description: "Could not reach the payment server. Please refresh and try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl max-w-md w-full p-8 relative shadow-2xl">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-red-500/20">
            <Zap size={12} /> LIMITED OFFER
          </div>
          <h2 className="text-3xl font-black text-white mb-2 italic">UPGRADE TO PRO</h2>
          <p className="text-gray-400">Unlock 100 high-performance AI credits</p>
        </div>

        {/* 🌎 LOCATION TOGGLE */}
        <div className="flex bg-gray-900 p-1.5 rounded-2xl mb-8 border border-gray-800">
          <button 
            onClick={() => setIsIndia(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${isIndia ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            🇮🇳 India
          </button>
          <button 
            onClick={() => setIsIndia(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${!isIndia ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Globe size={18} /> Global
          </button>
        </div>

        {/* Pricing Area */}
        <div className="text-center mb-8 p-6 bg-gray-900/50 rounded-3xl border border-gray-800/50">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-black text-white tracking-tighter">
              {isIndia ? '₹399' : '$8'}
            </span>
            <span className="text-gray-500 font-medium">/month</span>
          </div>
          {!isIndia && (
            <div className="flex items-center justify-center gap-2 mt-3 text-blue-400 text-xs font-semibold">
              <ShieldCheck size={14} /> PayPal & International Cards Supported
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-4 mb-10">
          {[
            '100 AI Content Credits',
            'Advanced Lead Magnet AI',
            'Full Content Calendar Access',
            'No Watermarks on Assets'
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-3 text-sm font-medium text-gray-300">
              <div className="bg-green-500/20 p-1 rounded-full">
                <Check size={14} className="text-green-500" />
              </div>
              {feat}
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <Button 
          onClick={handlePayment} 
         disabled={loading || !razorpayReady}
          className="w-full bg-white hover:bg-gray-200 text-black h-14 rounded-2xl text-lg font-black italic tracking-tight shadow-xl shadow-red-500/10"
        >
          {loading ? 'INITIALIZING...' : 'ACTIVATE PRO NOW'}
        </Button>
        
        <p className="text-[10px] text-center text-gray-600 mt-6 uppercase tracking-widest font-bold">
          SECURE 256-BIT ENCRYPTED PAYMENT
        </p>
      </div>
    </div>
  );
}