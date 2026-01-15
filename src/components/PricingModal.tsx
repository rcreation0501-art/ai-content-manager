import React, { useState } from 'react';
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
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Select Plan based on toggle
      const plan = isIndia ? 'pro_monthly' : 'pro_monthly_usd';
      
      // 2. Create Order via Secure Edge Function
      const { data, error } = await supabase.functions.invoke('razorpay-payment', {
        body: { action: 'create_order', plan }
      });

      if (error) throw error;

      // 3. Configure Razorpay Options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Ensure this env var exists
        amount: data.amount,
        currency: data.currency,
        name: "Sasa AI",
        description: isIndia ? "Pro Monthly Plan (India)" : "Pro Monthly Plan (Global)",
        order_id: data.id,
        handler: async (response: any) => {
          // 4. Secure Backend Verification
          const { error: verifyError } = await supabase.functions.invoke('razorpay-payment', {
            body: { 
              action: 'verify_payment',
              plan,
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature
            }
          });

          if (verifyError) {
            toast({ title: "Verification Failed", description: "Please contact support if amount was deducted.", variant: "destructive" });
          } else {
            toast({ title: "Payment Successful!", description: "100 Credits have been added to your account." });
            onClose();
            window.location.reload(); // Refresh to update Sidebar credits
          }
        },
        prefill: {
          email: user?.email,
          contact: "" // Razorpay will ask if not provided
        },
        theme: { color: "#ef4444" }, // Matches your brand red
        modal: {
          ondismiss: () => setLoading(false) // Reset loading if user closes popup
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("Payment Start Error:", err);
      toast({ title: "Payment Error", description: err.message || "Could not initialize checkout.", variant: "destructive" });
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
          disabled={loading}
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