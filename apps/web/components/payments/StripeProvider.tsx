'use client';

import { useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeProviderProps {
  children: React.ReactNode;
  clientSecret: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const stripePromise = useMemo(() => {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) return null;
    return loadStripe(pk);
  }, []);

  if (!stripePromise) {
    return (
      <div className="text-center text-gray-500 py-8">
        Payment processing is not configured
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#6366f1',
            borderRadius: '8px',
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
