/**
 * FlowBotz Credits Hook
 * Provides React integration for credit management
 */

import { useState, useEffect, useCallback } from 'react';
import { creditManager, CreditUsageAnalytics, CreditPackage } from '../lib/credits/credit-manager';
import { useAuth } from './useAuth';

export interface CreditState {
  balance: number;
  loading: boolean;
  error: string | null;
  analytics: CreditUsageAnalytics | null;
  packages: CreditPackage[];
}

export function useCredits() {
  const { user } = useAuth();
  const [creditState, setCreditState] = useState<CreditState>({
    balance: 0,
    loading: false,
    error: null,
    analytics: null,
    packages: creditManager.getCreditPackages()
  });

  // Refresh credit balance
  const refreshBalance = useCallback(async () => {
    if (!user) return;

    setCreditState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const balance = await creditManager.getCreditBalance(user.id);
      setCreditState(prev => ({ ...prev, balance, loading: false }));
    } catch (error) {
      setCreditState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load credit balance'
      }));
    }
  }, [user]);

  // Load analytics
  const refreshAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      const analytics = await creditManager.getCreditUsageAnalytics(user.id);
      setCreditState(prev => ({ ...prev, analytics }));
    } catch (error) {
      console.error('Error loading credit analytics:', error);
    }
  }, [user]);

  // Load initial data
  useEffect(() => {
    if (user) {
      refreshBalance();
      refreshAnalytics();
    } else {
      setCreditState(prev => ({
        ...prev,
        balance: 0,
        analytics: null,
        loading: false,
        error: null
      }));
    }
  }, [user, refreshBalance, refreshAnalytics]);

  // Check if user has sufficient credits
  const hasCredits = useCallback((requiredCredits: number = 1): boolean => {
    return creditState.balance >= requiredCredits;
  }, [creditState.balance]);

  // Calculate credit cost for generation
  const calculateCost = useCallback((
    modelName: string,
    width: number = 1024,
    height: number = 1024,
    steps: number = 20
  ): number => {
    return creditManager.calculateCreditCost(modelName, width, height, steps);
  }, []);

  // Calculate batch generation cost
  const calculateBatchCost = useCallback((
    modelName: string,
    batchSize: number,
    width: number = 1024,
    height: number = 1024,
    steps: number = 20
  ): number => {
    return creditManager.calculateBatchCreditCost(modelName, batchSize, width, height, steps);
  }, []);

  // Consume credits
  const consumeCredits = useCallback(async (
    amount: number,
    generationId: string,
    modelName: string
  ) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await creditManager.consumeCredits(user.id, amount, generationId, modelName);
    
    if (result.success) {
      setCreditState(prev => ({ 
        ...prev, 
        balance: result.remainingCredits || prev.balance - amount 
      }));
    }

    return result;
  }, [user]);

  // Add credits (for purchases)
  const addCredits = useCallback(async (
    amount: number,
    type: 'purchase' | 'bonus' = 'purchase',
    description: string = 'Credit purchase',
    paymentIntentId?: string
  ) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await creditManager.addCredits(user.id, amount, type, description, paymentIntentId);
    
    if (result.success) {
      setCreditState(prev => ({ 
        ...prev, 
        balance: result.newBalance || prev.balance + amount 
      }));
    }

    return result;
  }, [user]);

  // Refund credits (for failed generations)
  const refundCredits = useCallback(async (
    amount: number,
    generationId: string,
    reason: string = 'Generation failed'
  ) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await creditManager.refundCredits(user.id, amount, generationId, reason);
    
    if (result.success) {
      setCreditState(prev => ({ 
        ...prev, 
        balance: prev.balance + amount 
      }));
    }

    return result;
  }, [user]);

  // Get credit status
  const getCreditStatus = useCallback(() => {
    return creditManager.getCreditStatus(creditState.balance);
  }, [creditState.balance]);

  // Check if should show warning
  const shouldShowWarning = useCallback((plannedGenerations: number = 1): boolean => {
    return creditManager.shouldShowCreditWarning(creditState.balance, plannedGenerations);
  }, [creditState.balance]);

  // Check if should block generation
  const shouldBlockGeneration = useCallback((requiredCredits: number): boolean => {
    return creditManager.shouldBlockGeneration(creditState.balance, requiredCredits);
  }, [creditState.balance]);

  // Purchase credits (integration with payment system)
  const purchaseCredits = useCallback(async (packageId: string) => {
    const selectedPackage = creditState.packages.find(pkg => pkg.id === packageId);
    if (!selectedPackage) {
      return { success: false, error: 'Package not found' };
    }

    // This would integrate with Stripe or other payment processor
    // For now, we'll simulate a successful purchase
    console.log('Initiating credit purchase:', selectedPackage);
    
    // In a real implementation, this would:
    // 1. Create a payment intent with Stripe
    // 2. Handle the payment flow
    // 3. Add credits upon successful payment
    
    return { 
      success: false, 
      error: 'Payment integration not implemented yet',
      paymentUrl: `#purchase-${packageId}` // Placeholder
    };
  }, [creditState.packages]);

  return {
    // State
    balance: creditState.balance,
    loading: creditState.loading,
    error: creditState.error,
    analytics: creditState.analytics,
    packages: creditState.packages,
    
    // Computed properties
    status: getCreditStatus(),
    
    // Methods
    hasCredits,
    calculateCost,
    calculateBatchCost,
    consumeCredits,
    addCredits,
    refundCredits,
    shouldShowWarning,
    shouldBlockGeneration,
    purchaseCredits,
    
    // Refresh methods
    refreshBalance,
    refreshAnalytics
  };
}