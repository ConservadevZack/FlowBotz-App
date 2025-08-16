/**
 * FlowBotz Authentication Hook
 * Provides React integration for authentication middleware
 */

import { useState, useEffect } from 'react';
import { authMiddleware, AuthState, SignInCredentials, SignUpCredentials, GoogleSignInOptions } from '../lib/auth/auth-middleware';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authMiddleware.getCurrentState());

  useEffect(() => {
    const unsubscribe = authMiddleware.onAuthStateChange(setAuthState);
    return unsubscribe;
  }, []);

  const signIn = async (credentials: SignInCredentials) => {
    return await authMiddleware.signIn(credentials);
  };

  const signUp = async (credentials: SignUpCredentials) => {
    return await authMiddleware.signUp(credentials);
  };

  const signInWithGoogle = async (options?: GoogleSignInOptions) => {
    return await authMiddleware.signInWithGoogle(options);
  };

  const signOut = async () => {
    return await authMiddleware.signOut();
  };

  const resetPassword = async (email: string) => {
    return await authMiddleware.resetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    return await authMiddleware.updatePassword(newPassword);
  };

  const updateProfile = async (updates: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    bio?: string;
  }) => {
    return await authMiddleware.updateProfile(updates);
  };

  const hasCreditsForGeneration = async (cost: number = 1) => {
    return await authMiddleware.hasCreditsForGeneration(cost);
  };

  const getAvailableCredits = async () => {
    return await authMiddleware.getAvailableCredits();
  };

  return {
    // State
    user: authState.user,
    flowBotzUser: authState.flowBotzUser,
    session: authState.session,
    loading: authState.loading,
    error: authState.error,
    
    // Computed properties
    isAuthenticated: authMiddleware.isAuthenticated(),
    isEmailVerified: authMiddleware.isEmailVerified(),
    userRole: authMiddleware.getUserRole(),
    subscriptionTier: authMiddleware.getSubscriptionTier(),
    
    // Methods
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    hasCreditsForGeneration,
    getAvailableCredits
  };
}