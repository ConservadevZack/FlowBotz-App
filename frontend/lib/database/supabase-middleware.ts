/**
 * FlowBotz Supabase Middleware Layer
 * Provides robust database connectivity with graceful fallbacks for missing tables
 */

import { supabase } from '../supabase';
import { User } from '@supabase/supabase-js';

// Type definitions for FlowBotz database entities
export interface FlowBotzUser {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  role: 'admin' | 'creator' | 'collaborator' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  subscription_tier: 'free' | 'basic' | 'pro';
  is_verified: boolean;
  email_verified: boolean;
  customer_id?: string;
  subscription_expires?: string;
  trial_expires?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
  auto_save_interval: number;
  canvas_grid_enabled: boolean;
  canvas_snap_to_grid: boolean;
  default_canvas_size: { width: number; height: number };
  ai_generation_settings: Record<string, any>;
  export_quality: 'low' | 'medium' | 'high' | 'ultra';
  created_at: string;
  updated_at: string;
}

export interface UserStats {
  user_id: string;
  designs_created: number;
  designs_shared: number;
  templates_created: number;
  ai_generations: number;
  ai_credits_used: number;
  ai_credits_remaining: number;
  orders_placed: number;
  total_spent: number;
  login_streak: number;
  total_logins: number;
  achievements: string[];
  last_design_created?: string;
  last_order_placed?: string;
  updated_at: string;
}

export interface AIGeneration {
  id: string;
  user_id: string;
  design_id?: string;
  model_id?: string;
  prompt: string;
  negative_prompt?: string;
  parameters: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  result_urls: string[];
  error_message?: string;
  processing_time?: number;
  cost: number;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  guidance_scale?: number;
  created_at: string;
  completed_at?: string;
}

export interface Design {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  owner_id: string;
  team_id?: string;
  type: 'mockup' | 'template' | 'custom' | 'ai_generated';
  status: 'draft' | 'published' | 'archived';
  visibility: 'private' | 'team' | 'public' | 'unlisted';
  category_id?: string;
  canvas: Record<string, any>;
  elements: any[];
  current_version: number;
  thumbnail_url?: string;
  preview_url?: string;
  file_urls: Record<string, any>;
  view_count: number;
  like_count: number;
  download_count: number;
  fork_count: number;
  ai_generated: boolean;
  ai_prompt?: string;
  ai_model?: string;
  ai_parameters: Record<string, any>;
  metadata: Record<string, any>;
  file_size?: number;
  color_palette: string[];
  fonts_used: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// Database service with graceful error handling
export class SupabaseMiddleware {
  private static instance: SupabaseMiddleware;
  
  public static getInstance(): SupabaseMiddleware {
    if (!SupabaseMiddleware.instance) {
      SupabaseMiddleware.instance = new SupabaseMiddleware();
    }
    return SupabaseMiddleware.instance;
  }

  // User management methods
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async ensureUserExists(user: User): Promise<FlowBotzUser | null> {
    try {
      // First, try to get existing user
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser && !selectError) {
        return existingUser;
      }

      // If user doesn't exist, create them
      const newUser: Partial<FlowBotzUser> = {
        id: user.id,
        email: user.email!,
        username: user.user_metadata?.username || user.email?.split('@')[0],
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
        avatar_url: user.user_metadata?.avatar_url,
        role: 'creator',
        status: 'pending_verification',
        subscription_tier: 'free',
        is_verified: false,
        email_verified: user.email_confirmed_at ? true : false,
      };

      const { data: createdUser, error: insertError } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return null;
      }

      // Initialize user stats and preferences
      await this.initializeUserStats(user.id);
      await this.initializeUserPreferences(user.id);

      return createdUser;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      return null;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return this.initializeUserPreferences(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Return default preferences if table doesn't exist
      return this.getDefaultUserPreferences(userId);
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return this.initializeUserStats(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user stats:', error);
      // Return default stats if table doesn't exist
      return this.getDefaultUserStats(userId);
    }
  }

  async updateUserStats(userId: string, stats: Partial<UserStats>): Promise<UserStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .upsert({
          user_id: userId,
          ...stats,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return null;
    }
  }

  // AI Generation methods
  async createAIGeneration(generation: Partial<AIGeneration>): Promise<AIGeneration | null> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .insert({
          ...generation,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update user stats
      const currentStats = await this.getUserStats(generation.user_id!);
      if (currentStats) {
        await this.updateUserStats(generation.user_id!, {
          ai_generations: currentStats.ai_generations + 1,
          ai_credits_used: currentStats.ai_credits_used + (generation.cost || 1),
          ai_credits_remaining: Math.max(0, currentStats.ai_credits_remaining - (generation.cost || 1))
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating AI generation:', error);
      return null;
    }
  }

  async getAIGenerations(userId: string, limit: number = 50): Promise<AIGeneration[]> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting AI generations:', error);
      return [];
    }
  }

  async updateAIGeneration(id: string, updates: Partial<AIGeneration>): Promise<AIGeneration | null> {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating AI generation:', error);
      return null;
    }
  }

  // Design management methods
  async createDesign(design: Partial<Design>): Promise<Design | null> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .insert({
          ...design,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update user stats
      const currentStats = await this.getUserStats(design.owner_id!);
      if (currentStats) {
        await this.updateUserStats(design.owner_id!, {
          designs_created: currentStats.designs_created + 1,
          last_design_created: new Date().toISOString()
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating design:', error);
      return null;
    }
  }

  async getUserDesigns(userId: string, limit: number = 50): Promise<Design[]> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user designs:', error);
      return [];
    }
  }

  async updateDesign(id: string, updates: Partial<Design>): Promise<Design | null> {
    try {
      const { data, error } = await supabase
        .from('designs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating design:', error);
      return null;
    }
  }

  async deleteDesign(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('designs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting design:', error);
      return false;
    }
  }

  // Credit management
  async checkUserCredits(userId: string): Promise<number> {
    const stats = await this.getUserStats(userId);
    return stats?.ai_credits_remaining || 0;
  }

  async hasCreditsForGeneration(userId: string, cost: number = 1): Promise<boolean> {
    const availableCredits = await this.checkUserCredits(userId);
    return availableCredits >= cost;
  }

  async consumeCredits(userId: string, cost: number = 1): Promise<boolean> {
    const currentStats = await this.getUserStats(userId);
    if (!currentStats || currentStats.ai_credits_remaining < cost) {
      return false;
    }

    const updated = await this.updateUserStats(userId, {
      ai_credits_used: currentStats.ai_credits_used + cost,
      ai_credits_remaining: currentStats.ai_credits_remaining - cost
    });

    return updated !== null;
  }

  // Helper methods for initialization
  private async initializeUserPreferences(userId: string): Promise<UserPreferences | null> {
    const defaultPrefs = this.getDefaultUserPreferences(userId);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing user preferences:', error);
      return defaultPrefs;
    }
  }

  private async initializeUserStats(userId: string): Promise<UserStats | null> {
    const defaultStats = this.getDefaultUserStats(userId);
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .insert(defaultStats)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error initializing user stats:', error);
      return defaultStats;
    }
  }

  private getDefaultUserPreferences(userId: string): UserPreferences {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      email_notifications: true,
      push_notifications: true,
      marketing_emails: false,
      auto_save_interval: 30,
      canvas_grid_enabled: true,
      canvas_snap_to_grid: true,
      default_canvas_size: { width: 800, height: 600 },
      ai_generation_settings: {},
      export_quality: 'high',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private getDefaultUserStats(userId: string): UserStats {
    return {
      user_id: userId,
      designs_created: 0,
      designs_shared: 0,
      templates_created: 0,
      ai_generations: 0,
      ai_credits_used: 0,
      ai_credits_remaining: 100, // Start with 100 free credits
      orders_placed: 0,
      total_spent: 0,
      login_streak: 0,
      total_logins: 0,
      achievements: [],
      updated_at: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const dbMiddleware = SupabaseMiddleware.getInstance();