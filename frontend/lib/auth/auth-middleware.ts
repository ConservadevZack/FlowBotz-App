/**
 * FlowBotz Authentication Middleware
 * Provides secure authentication with session management and user initialization
 */

import { supabase } from '../supabase';
import { dbMiddleware, FlowBotzUser } from '../database/supabase-middleware';
import { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  flowBotzUser: FlowBotzUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface GoogleSignInOptions {
  redirectTo?: string;
}

export class AuthMiddleware {
  private static instance: AuthMiddleware;
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = {
    user: null,
    flowBotzUser: null,
    session: null,
    loading: true,
    error: null
  };

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
      AuthMiddleware.instance.initialize();
    }
    return AuthMiddleware.instance;
  }

  private constructor() {}

  private async initialize() {
    // Get initial session
    await this.getCurrentSession();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      await this.handleAuthStateChange(event, session);
    });
  }

  private async handleAuthStateChange(event: string, session: Session | null) {
    this.updateState({ loading: true, error: null });

    try {
      if (session?.user) {
        // User signed in
        const flowBotzUser = await dbMiddleware.ensureUserExists(session.user);
        
        this.updateState({
          user: session.user,
          flowBotzUser,
          session,
          loading: false,
          error: null
        });

        // Track login
        if (event === 'SIGNED_IN') {
          await this.trackUserLogin(session.user.id);
        }
      } else {
        // User signed out
        this.updateState({
          user: null,
          flowBotzUser: null,
          session: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication error'
      });
    }
  }

  private updateState(updates: Partial<AuthState>) {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyStateListeners();
  }

  private notifyStateListeners() {
    this.authStateListeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        console.error('Auth state listener error:', error);
      }
    });
  }

  public onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Immediately call with current state
    callback(this.currentState);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  public getCurrentState(): AuthState {
    return this.currentState;
  }

  public async getCurrentSession(): Promise<Session | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        this.updateState({ error: error.message, loading: false });
        return null;
      }

      if (session?.user) {
        const flowBotzUser = await dbMiddleware.ensureUserExists(session.user);
        this.updateState({
          user: session.user,
          flowBotzUser,
          session,
          loading: false,
          error: null
        });
      } else {
        this.updateState({
          user: null,
          flowBotzUser: null,
          session: null,
          loading: false,
          error: null
        });
      }

      return session;
    } catch (error) {
      console.error('Session retrieval error:', error);
      this.updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Session error'
      });
      return null;
    }
  }

  public async signIn(credentials: SignInCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Auth state change will be handled automatically
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      this.updateState({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  public async signUp(credentials: SignUpCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username || credentials.email.split('@')[0],
            first_name: credentials.firstName,
            last_name: credentials.lastName
          }
        }
      });

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Check if user needs email confirmation
      if (data.user && !data.session) {
        this.updateState({ loading: false });
        return { 
          success: true, 
          error: 'Please check your email for confirmation link' 
        };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      this.updateState({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  public async signInWithGoogle(options: GoogleSignInOptions = {}): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: options.redirectTo || `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // OAuth redirect will handle the rest
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
      this.updateState({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  public async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState({ loading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) {
        this.updateState({ loading: false, error: error.message });
        return { success: false, error: error.message };
      }

      // Auth state change will be handled automatically
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      this.updateState({ loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  public async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return { success: false, error: errorMessage };
    }
  }

  public async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password update failed';
      return { success: false, error: errorMessage };
    }
  }

  public async updateProfile(updates: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.currentState.user) {
        return { success: false, error: 'No authenticated user' };
      }

      // Update auth metadata
      const authUpdates: any = {};
      if (updates.email) authUpdates.email = updates.email;
      
      const metadataUpdates: any = {};
      if (updates.username) metadataUpdates.username = updates.username;
      if (updates.firstName) metadataUpdates.first_name = updates.firstName;
      if (updates.lastName) metadataUpdates.last_name = updates.lastName;
      if (updates.avatarUrl) metadataUpdates.avatar_url = updates.avatarUrl;

      if (Object.keys(metadataUpdates).length > 0) {
        authUpdates.data = metadataUpdates;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates);
        if (authError) {
          return { success: false, error: authError.message };
        }
      }

      // Update FlowBotz user profile
      if (this.currentState.flowBotzUser) {
        const profileUpdates: any = {};
        if (updates.username) profileUpdates.username = updates.username;
        if (updates.firstName) profileUpdates.first_name = updates.firstName;
        if (updates.lastName) profileUpdates.last_name = updates.lastName;
        if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;
        if (updates.bio) profileUpdates.bio = updates.bio;

        if (Object.keys(profileUpdates).length > 0) {
          const { error: dbError } = await supabase
            .from('users')
            .update(profileUpdates)
            .eq('id', this.currentState.user.id);

          if (dbError) {
            console.error('Database profile update error:', dbError);
            // Don't fail if database update fails
          }
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return { success: false, error: errorMessage };
    }
  }

  public isAuthenticated(): boolean {
    return !!this.currentState.user && !!this.currentState.session;
  }

  public isEmailVerified(): boolean {
    return !!this.currentState.user?.email_confirmed_at;
  }

  public getUserRole(): string | null {
    return this.currentState.flowBotzUser?.role || null;
  }

  public getSubscriptionTier(): string | null {
    return this.currentState.flowBotzUser?.subscription_tier || 'free';
  }

  public async hasCreditsForGeneration(cost: number = 1): Promise<boolean> {
    if (!this.currentState.user) return false;
    return await dbMiddleware.hasCreditsForGeneration(this.currentState.user.id, cost);
  }

  public async getAvailableCredits(): Promise<number> {
    if (!this.currentState.user) return 0;
    return await dbMiddleware.checkUserCredits(this.currentState.user.id);
  }

  private async trackUserLogin(userId: string): Promise<void> {
    try {
      const currentStats = await dbMiddleware.getUserStats(userId);
      if (currentStats) {
        await dbMiddleware.updateUserStats(userId, {
          total_logins: currentStats.total_logins + 1,
          login_streak: currentStats.login_streak + 1 // Simplified streak logic
        });
      }
    } catch (error) {
      console.error('Error tracking user login:', error);
    }
  }
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance();