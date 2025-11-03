/**
 * Authentication Wrapper
 * Protects routes and manages authentication state
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

import { useAuth } from '../../store/auth-store';
import { LoginScreen } from './login-screen';
import { VISUAL_EFFECTS } from '../main-menu/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export function AuthWrapper({ 
  children, 
  requireAuth = true, 
  fallback 
}: AuthWrapperProps) {
  const { 
    authState, 
    isAuthenticated, 
    isLoading, 
    error, 
    initialize 
  } = useAuth();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Animation values
  const spinValue = useSharedValue(0);
  const fadeValue = useSharedValue(0);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Start loading animation
    if (authState === 'loading') {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
      fadeValue.value = withTiming(1, { duration: 500 });
    } else {
      fadeValue.value = withTiming(0, { duration: 300 });
    }
  }, [authState]);

  const initializeAuth = async () => {
    try {
      await initialize();
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const spinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  const fadeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeValue.value,
  }));

  // Show loading screen during initialization
  if (!isInitialized || authState === 'loading') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={VISUAL_EFFECTS.GRADIENT_COLORS}
          style={styles.gradient}
        >
          <Animated.View style={[styles.loadingContainer, fadeAnimatedStyle]}>
            <Animated.View style={[styles.logoContainer, spinAnimatedStyle]}>
              <Text style={styles.logoText}>🌙</Text>
            </Animated.View>
            <Text style={styles.loadingText}>Grow with Freya</Text>
            <Text style={styles.loadingSubtext}>Initializing secure connection...</Text>
            <ActivityIndicator 
              size="large" 
              color="#FFFFFF" 
              style={styles.spinner}
            />
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // Show error state
  if (authState === 'error' && error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={VISUAL_EFFECTS.GRADIENT_COLORS}
          style={styles.gradient}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.errorSubtext}>
              Please check your internet connection and try again
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // If authentication is not required, show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is authenticated, show children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show login screen
  return (
    <LoginScreen 
      onLoginSuccess={() => {
        // Navigation will be handled by the auth state change
        console.log('Login successful');
      }}
    />
  );
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAuth?: boolean } = {}
) {
  const { requireAuth = true } = options;

  return function AuthenticatedComponent(props: P) {
    return (
      <AuthWrapper requireAuth={requireAuth}>
        <Component {...props} />
      </AuthWrapper>
    );
  };
}

// Hook for checking authentication status
export function useAuthGuard(requireAuth: boolean = true) {
  const { isAuthenticated, authState, isLoading } = useAuth();

  return {
    canAccess: !requireAuth || isAuthenticated,
    isLoading: authState === 'loading' || isLoading,
    needsAuth: requireAuth && !isAuthenticated,
    authState,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoText: {
    fontSize: 80,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
