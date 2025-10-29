import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { LoginScreen } from './login-screen';
import { AuthLoading } from './auth-loading';

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized, 
    initialize 
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <AuthLoading message="Checking authentication..." />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginScreen />;
  }

  // User is authenticated, show the app
  return <>{children}</>;
}

// Hook for protecting individual screens
export function useRequireAuth() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  
  return {
    isAuthenticated,
    isInitialized,
    requiresAuth: !isAuthenticated && isInitialized,
  };
}
