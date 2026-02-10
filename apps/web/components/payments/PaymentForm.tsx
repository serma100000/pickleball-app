'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Loader2, CreditCard, Check } from 'lucide-react';

interface PaymentFormProps {
  amount: number; // in cents
  description?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  returnUrl?: string;
}

export function PaymentForm({
  amount,
  description,
  onSuccess,
  onError,
  returnUrl,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl || `${window.location.origin}/dashboard`,
      },
      redirect: 'if_required',
    });

    if (error) {
      const msg = error.message || 'Payment failed';
      setErrorMessage(msg);
      onError?.(msg);
    } else {
      setIsComplete(true);
      onSuccess?.();
    }

    setIsProcessing(false);
  };

  if (isComplete) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Payment Successful
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Your registration has been confirmed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {description && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
          {description}
        </div>
      )}

      <div className="flex items-center justify-between py-2">
        <span className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Total
        </span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          ${(amount / 100).toFixed(2)}
        </span>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${(amount / 100).toFixed(2)}`
        )}
      </button>

      {/* Test card hint in non-production */}
      {process.env.NODE_ENV !== 'production' && (
        <p className="text-xs text-gray-400 text-center">
          Test card: 4242 4242 4242 4242 | Any future exp | Any CVC
        </p>
      )}
    </form>
  );
}
