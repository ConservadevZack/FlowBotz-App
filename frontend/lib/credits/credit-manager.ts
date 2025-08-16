/**
 * FlowBotz Credit Management System
 * Handles AI generation credits, usage tracking, and billing integration
 */

import { dbMiddleware, UserStats } from '../database/supabase-middleware';
import { authMiddleware } from '../auth/auth-middleware';

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'consumption' | 'refund' | 'bonus';
  amount: number;
  cost: number;
  description: string;
  ai_generation_id?: string;
  payment_intent_id?: string;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  is_popular: boolean;
  description: string;
  features: string[];
}

export interface CreditUsageAnalytics {
  totalCreditsUsed: number;
  creditsUsedThisMonth: number;
  creditsUsedToday: number;
  averageCreditsPerGeneration: number;
  mostUsedModel: string;
  totalGenerations: number;
  successRate: number;
}

export class CreditManager {
  private static instance: CreditManager;

  public static getInstance(): CreditManager {
    if (!CreditManager.instance) {
      CreditManager.instance = new CreditManager();
    }
    return CreditManager.instance;
  }

  // Credit packages configuration
  public getCreditPackages(): CreditPackage[] {
    return [
      {
        id: 'starter',
        name: 'Starter Pack',
        credits: 100,
        price: 9.99,
        currency: 'USD',
        is_popular: false,
        description: 'Perfect for trying out AI generation',
        features: [
          '100 AI generations',
          'All AI models',
          'High quality outputs',
          '30-day validity'
        ]
      },
      {
        id: 'creator',
        name: 'Creator Pack',
        credits: 500,
        price: 39.99,
        currency: 'USD',
        is_popular: true,
        description: 'Great for regular creators',
        features: [
          '500 AI generations',
          'All AI models',
          'Priority processing',
          'High quality outputs',
          '60-day validity',
          'Batch generation'
        ]
      },
      {
        id: 'professional',
        name: 'Professional Pack',
        credits: 2000,
        price: 149.99,
        currency: 'USD',
        is_popular: false,
        description: 'For professional designers',
        features: [
          '2000 AI generations',
          'All AI models',
          'Priority processing',
          'Ultra high quality',
          '90-day validity',
          'Batch generation',
          'API access',
          'Custom presets'
        ]
      }
    ];
  }

  // Check if user has sufficient credits
  public async hasCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      return (stats?.ai_credits_remaining || 0) >= requiredCredits;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  }

  // Get user's current credit balance
  public async getCreditBalance(userId: string): Promise<number> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      return stats?.ai_credits_remaining || 0;
    } catch (error) {
      console.error('Error getting credit balance:', error);
      return 0;
    }
  }

  // Consume credits for AI generation
  public async consumeCredits(
    userId: string, 
    amount: number, 
    generationId: string,
    modelName: string
  ): Promise<{ success: boolean; error?: string; remainingCredits?: number }> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      
      if (!stats) {
        return { success: false, error: 'User stats not found' };
      }

      if (stats.ai_credits_remaining < amount) {
        return { 
          success: false, 
          error: `Insufficient credits. Required: ${amount}, Available: ${stats.ai_credits_remaining}` 
        };
      }

      // Update user stats
      const updatedStats = await dbMiddleware.updateUserStats(userId, {
        ai_credits_used: stats.ai_credits_used + amount,
        ai_credits_remaining: stats.ai_credits_remaining - amount,
        ai_generations: stats.ai_generations + 1
      });

      if (!updatedStats) {
        return { success: false, error: 'Failed to update user stats' };
      }

      // Log the transaction (if we had a transactions table)
      await this.logCreditTransaction(userId, 'consumption', amount, 0, 
        `AI generation with ${modelName}`, generationId);

      return { 
        success: true, 
        remainingCredits: updatedStats.ai_credits_remaining 
      };
    } catch (error) {
      console.error('Error consuming credits:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Credit consumption failed' 
      };
    }
  }

  // Add credits (for purchases or bonuses)
  public async addCredits(
    userId: string, 
    amount: number, 
    type: 'purchase' | 'bonus' = 'purchase',
    description: string = 'Credit purchase',
    paymentIntentId?: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      
      if (!stats) {
        return { success: false, error: 'User stats not found' };
      }

      // Update user stats
      const updatedStats = await dbMiddleware.updateUserStats(userId, {
        ai_credits_remaining: stats.ai_credits_remaining + amount
      });

      if (!updatedStats) {
        return { success: false, error: 'Failed to update user stats' };
      }

      // Log the transaction
      await this.logCreditTransaction(userId, type, amount, 0, description, undefined, paymentIntentId);

      return { 
        success: true, 
        newBalance: updatedStats.ai_credits_remaining 
      };
    } catch (error) {
      console.error('Error adding credits:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Credit addition failed' 
      };
    }
  }

  // Get credit usage analytics
  public async getCreditUsageAnalytics(userId: string): Promise<CreditUsageAnalytics | null> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      const generations = await dbMiddleware.getAIGenerations(userId, 1000); // Get recent generations

      if (!stats) return null;

      // Calculate analytics from generations
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const thisMonthGenerations = generations.filter(g => 
        new Date(g.created_at) >= startOfMonth
      );

      const todayGenerations = generations.filter(g => 
        new Date(g.created_at) >= startOfDay
      );

      const completedGenerations = generations.filter(g => g.status === 'completed');
      const successRate = generations.length > 0 ? 
        (completedGenerations.length / generations.length) * 100 : 100;

      // Calculate most used model
      const modelUsage = generations.reduce((acc, gen) => {
        const model = gen.ai_model || 'Unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedModel = Object.entries(modelUsage)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

      const totalCostUsed = generations.reduce((sum, gen) => sum + gen.cost, 0);
      const averageCreditsPerGeneration = generations.length > 0 ? 
        totalCostUsed / generations.length : 0;

      return {
        totalCreditsUsed: stats.ai_credits_used,
        creditsUsedThisMonth: thisMonthGenerations.reduce((sum, gen) => sum + gen.cost, 0),
        creditsUsedToday: todayGenerations.reduce((sum, gen) => sum + gen.cost, 0),
        averageCreditsPerGeneration,
        mostUsedModel,
        totalGenerations: stats.ai_generations,
        successRate
      };
    } catch (error) {
      console.error('Error getting credit analytics:', error);
      return null;
    }
  }

  // Calculate credit cost for different AI models and settings
  public calculateCreditCost(
    modelName: string, 
    width: number = 1024, 
    height: number = 1024,
    steps: number = 20
  ): number {
    // Base costs for different models
    const baseCosts: Record<string, number> = {
      'dall-e-3': 4,
      'dall-e-2': 2,
      'stable-diffusion-xl': 2,
      'stable-diffusion': 1,
      'midjourney': 3
    };

    const baseKey = Object.keys(baseCosts).find(key => 
      modelName.toLowerCase().includes(key)
    ) || 'stable-diffusion';

    let cost = baseCosts[baseKey];

    // Adjust for resolution
    const totalPixels = width * height;
    if (totalPixels > 1024 * 1024) {
      cost *= 1.5; // 50% more for high resolution
    }

    // Adjust for steps (if applicable)
    if (steps > 20) {
      cost *= 1 + ((steps - 20) * 0.02); // 2% more per additional step
    }

    return Math.ceil(cost);
  }

  // Get credit cost estimate for batch generation
  public calculateBatchCreditCost(
    modelName: string,
    batchSize: number,
    width: number = 1024,
    height: number = 1024,
    steps: number = 20
  ): number {
    const singleCost = this.calculateCreditCost(modelName, width, height, steps);
    
    // Apply batch discount for large batches
    let batchCost = singleCost * batchSize;
    
    if (batchSize >= 10) {
      batchCost *= 0.9; // 10% discount for 10+ generations
    }
    
    if (batchSize >= 50) {
      batchCost *= 0.85; // Additional 15% discount for 50+ generations
    }

    return Math.ceil(batchCost);
  }

  // Refund credits (for failed generations)
  public async refundCredits(
    userId: string, 
    amount: number, 
    generationId: string,
    reason: string = 'Generation failed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const stats = await dbMiddleware.getUserStats(userId);
      
      if (!stats) {
        return { success: false, error: 'User stats not found' };
      }

      // Update user stats
      const updatedStats = await dbMiddleware.updateUserStats(userId, {
        ai_credits_used: Math.max(0, stats.ai_credits_used - amount),
        ai_credits_remaining: stats.ai_credits_remaining + amount
      });

      if (!updatedStats) {
        return { success: false, error: 'Failed to update user stats' };
      }

      // Log the refund transaction
      await this.logCreditTransaction(userId, 'refund', amount, 0, reason, generationId);

      return { success: true };
    } catch (error) {
      console.error('Error refunding credits:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Credit refund failed' 
      };
    }
  }

  // Check if user needs to purchase more credits
  public shouldShowCreditWarning(currentCredits: number, plannedGenerations: number = 1): boolean {
    return currentCredits < plannedGenerations * 2; // Warning when credits < 2x planned usage
  }

  public shouldBlockGeneration(currentCredits: number, requiredCredits: number): boolean {
    return currentCredits < requiredCredits;
  }

  // Get credit status with recommendations
  public getCreditStatus(currentCredits: number): {
    status: 'abundant' | 'sufficient' | 'low' | 'critical' | 'depleted';
    message: string;
    recommendation?: string;
  } {
    if (currentCredits === 0) {
      return {
        status: 'depleted',
        message: 'No credits remaining',
        recommendation: 'Purchase credits to continue generating'
      };
    }
    
    if (currentCredits < 5) {
      return {
        status: 'critical',
        message: `Only ${currentCredits} credits remaining`,
        recommendation: 'Consider purchasing more credits soon'
      };
    }
    
    if (currentCredits < 20) {
      return {
        status: 'low',
        message: `${currentCredits} credits remaining`,
        recommendation: 'Plan your next credit purchase'
      };
    }
    
    if (currentCredits < 100) {
      return {
        status: 'sufficient',
        message: `${currentCredits} credits available`
      };
    }
    
    return {
      status: 'abundant',
      message: `${currentCredits} credits available`
    };
  }

  // Private helper to log credit transactions
  private async logCreditTransaction(
    userId: string,
    type: 'purchase' | 'consumption' | 'refund' | 'bonus',
    amount: number,
    cost: number,
    description: string,
    generationId?: string,
    paymentIntentId?: string
  ): Promise<void> {
    try {
      // In a real implementation, we would insert into a credit_transactions table
      console.log('Credit transaction:', {
        userId,
        type,
        amount,
        cost,
        description,
        generationId,
        paymentIntentId,
        timestamp: new Date().toISOString()
      });
      
      // Since we don't have a transactions table yet, we'll just log
      // This should be replaced with actual database insertion when the table exists
    } catch (error) {
      console.error('Error logging credit transaction:', error);
    }
  }
}

// Export singleton instance
export const creditManager = CreditManager.getInstance();