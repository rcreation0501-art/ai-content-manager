import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PricingModalProps {
  user: any;
  onClose: () => void;
}

export default function PricingModal({ user, onClose }: PricingModalProps) {
  const [isIndia, setIsIndia] = useState(true);
  const [links, setLinks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch the correct links from your database
    async function loadLinks() {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('instamojo_link, global_link')
          .eq('id', 'pro_monthly')
          .single();
        
        if (error) console.error('Error fetching plans:', error);
        if (data) setLinks(data);
      } catch (err) {
        console.error('Failed to load plan links', err);
      } finally {
        setLoading(false);
      }
    }
    loadLinks();
  }, []);

  const handleSubscribe = () => {
    if (!links) return;

    if (isIndia) {
      // 🇮🇳 INDIA -> Instamojo
      // We send user email to Instamojo for tracking
      window.location.href = `${links.instamojo_link}?data_email=${user.email}&data_name=${user.email}`;
    } else {
      // 🌍 GLOBAL -> Razorpay
      // We send user email to Razorpay
      window.location.href = `${links.global_link}?email=${user.email}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          ✕
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-2">Upgrade to Pro</h2>
          <p className="text-center text-gray-500 mb-6">Unlock full access to AI tools</p>

          {/* Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 p-1 rounded-full flex relative">
              <button
                onClick={() => setIsIndia(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  isIndia ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🇮🇳 India
              </button>
              <button
                onClick={() => setIsIndia(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  !isIndia ? 'bg-white text-purple-600 shadow-md' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🌍 Global
              </button>
            </div>
          </div>

          {/* Price Display (UPDATED) */}
          <div className="text-center mb-8">
            <div className="flex justify-center items-baseline">
              <span className="text-5xl font-black text-gray-900">
                {isIndia ? '₹1,499' : '$15'}
              </span>
              <span className="text-xl text-gray-500 ml-2">/mo</span>
            </div>
            <p className="text-xs font-medium text-gray-400 mt-2 uppercase tracking-wide">
              {isIndia ? 'UPI • RuPay • Wallets' : 'Credit Card • PayPal'}
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSubscribe}
            disabled={!links || loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${
              loading ? 'bg-gray-400 cursor-not-allowed' :
              isIndia 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }`}
          >
            {loading ? 'Loading Options...' : isIndia ? 'Pay with Instamojo' : 'Pay with Razorpay'}
          </button>
          
          <p className="text-xs text-center text-gray-400 mt-4">
            Secure payment • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}