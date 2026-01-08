import { useState } from 'react';

interface PricingModalProps {
  user: any;
  onClose: () => void;
}

export default function PricingModal({ user, onClose }: PricingModalProps) {
  const [isIndia, setIsIndia] = useState(true);

  // ✅ HARDCODED LINKS (Bypassing Database completely)
  const INSTAMOJO_LINK = "https://aiforfuture.mojo.page/pro-plan-linkedin-ai-posting";
  const RAZORPAY_LINK = "https://rzp.io/rzp/iBZbWDT";

  const handleSubscribe = () => {
    // 1. Get Email safely
    const userEmail = user?.email || "";

    let finalUrl = "";

    if (isIndia) {
      // 🇮🇳 INDIA -> Instamojo
      finalUrl = `${INSTAMOJO_LINK}?data_email=${userEmail}&data_name=${userEmail}`;
    } else {
      // 🌍 GLOBAL -> Razorpay
      finalUrl = `${RAZORPAY_LINK}?email=${userEmail}`;
    }

    // 2. Open in New Tab
    if (finalUrl) {
      window.open(finalUrl, '_blank'); 
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

          {/* Price Display */}
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
            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${
              isIndia 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500' 
                : 'bg-gradient-to-r from-purple-600 to-indigo-600'
            }`}
          >
            {isIndia ? 'Pay with Instamojo' : 'Pay with Razorpay'}
          </button>
          
          <p className="text-xs text-center text-gray-400 mt-4">
            Secure payment • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}