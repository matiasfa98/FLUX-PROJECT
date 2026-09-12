// src/features/billing/hooks/useCheckout.js
import { useState, useCallback } from 'react';
import { apiRequest } from '../../../lib/api';

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initiateCheckout = useCallback(async (planId, billingCycle = 'monthly') => {
    setLoading(true);
    setError(null);

    try {
      // Ensure this includes /api if your backend routes are mounted under /api
      const response = await apiRequest('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          successUrl: `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        }),
      });

      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (err) {
      console.error('[Billing] Checkout session error:', err);
      setError(err.message || 'Failed to initiate checkout session.');
      alert(`Checkout failed: ${err.message || 'Unable to connect to billing gateway.'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiateCheckout,
    loading,
    error,
  };
};

export default useCheckout;