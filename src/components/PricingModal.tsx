import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

interface PricingModalProps {
  user: any;
  onClose: () => void;
}

export default function PricingModal({ user, onClose }: PricingModalProps) {
  const [isIndia, setIsIndia] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // 1. Create Order on Server
      const { data, error } = await supabase.functions.invoke('razorpay-payment', {
        body: { 
          action: 'create_order', 
          plan: isIndia ? 'pro_monthly_inr' : 'pro_monthly_usd',
          currency: isIndia ? 'INR' : 'USD'
        }
      });

      if (error) throw error;

      // 2. Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // We will add this next!
        amount: data.amount,
        currency: data.currency,
        name: "Sasa AI",
        description: "Pro Plan Upgrade",
        order_id: data.id,
        prefill: {
          name: user?.user_metadata?.full_name,
          email: user?.email,
        },
        theme: { color: "#2563EB" },
        handler: async (response: any) => {
          // 3. Verify Payment & Add Credits
          const { error: verifyError } = await supabase.functions.invoke('razorpay-payment', {
            body: {
              action: 'verify_payment',
              payment_id: response.razorpay_payment_id,
              order_id: response.razorpay_order_id,
              signature: response.razorpay_signature,
              user_id: user.id
            }
          });

          if (verifyError) {
            toast({ title: "Verification Failed", variant: "destructive" });
          } else {
            toast({ title: "🎉 Success!", description: "Credits added instantly!" });
            onClose();
            window.location.reload(); // Refresh to show new credits
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error: any) {
      console.error("Payment Error:", error);
      toast({ title: "Error", description: "Could not start payment.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        
        <h2 className="text-2xl font-bold text-center mb-2">Upgrade to Pro</h2>
        <p className="text-center text-gray-500 mb-6">Get 100 Credits / Month</p>

        {/* Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 p-1 rounded-full flex">
            <button onClick={() => setIsIndia(true)} className={`px-4 py-2 rounded-full text-sm font-bold ${isIndia ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>🇮🇳 India</button>
            <button onClick={() => setIsIndia(false)} className={`px-4 py-2 rounded-full text-sm font-bold ${!isIndia ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>🌍 Global</button>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-8">
           <span className="text-4xl font-black">{isIndia ? '₹1,499' : '$19'}</span>
           <span className="text-gray-500">/mo</span>
        </div>

        <button 
          onClick={handleSubscribe} 
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all"
        >
          {isLoading ? 'Processing...' : 'Pay Securely with Razorpay'}
        </button>
      </div>
    </div>
  );
}