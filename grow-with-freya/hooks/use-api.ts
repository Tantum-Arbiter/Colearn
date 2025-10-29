import { useState, useCallback } from 'react';
import { apiClient, ApiError, ApiResponse } from '@/services/api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for making API calls with loading and error state management
 */
export function useApi<T = any>(
  apiCall: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await apiCall(...args);
        
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof ApiError 
          ? error.message 
          : 'An unexpected error occurred';
        
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        
        console.error('API call failed:', error);
        return null;
      }
    },
    [apiCall]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for user profile operations
 */
export function useUserProfile() {
  const getUserProfile = useApi(apiClient.getUserProfile.bind(apiClient));
  const updateUserProfile = useApi(apiClient.updateUserProfile.bind(apiClient));

  return {
    profile: getUserProfile.data,
    loading: getUserProfile.loading || updateUserProfile.loading,
    error: getUserProfile.error || updateUserProfile.error,
    fetchProfile: getUserProfile.execute,
    updateProfile: updateUserProfile.execute,
    reset: () => {
      getUserProfile.reset();
      updateUserProfile.reset();
    },
  };
}

/**
 * Hook for children/profiles management
 */
export function useChildren() {
  const getChildren = useApi(apiClient.getChildren.bind(apiClient));
  const createChild = useApi(apiClient.createChild.bind(apiClient));

  const refreshChildren = useCallback(async () => {
    await getChildren.execute();
  }, [getChildren.execute]);

  const addChild = useCallback(async (childData: any) => {
    const result = await createChild.execute(childData);
    if (result) {
      // Refresh the children list after successful creation
      await refreshChildren();
    }
    return result;
  }, [createChild.execute, refreshChildren]);

  return {
    children: getChildren.data || [],
    loading: getChildren.loading || createChild.loading,
    error: getChildren.error || createChild.error,
    fetchChildren: refreshChildren,
    addChild,
    reset: () => {
      getChildren.reset();
      createChild.reset();
    },
  };
}

/**
 * Hook for user progress tracking
 */
export function useUserProgress() {
  const getUserProgress = useApi(apiClient.getUserProgress.bind(apiClient));
  const saveProgress = useApi(apiClient.saveProgress.bind(apiClient));

  const updateProgress = useCallback(async (progressData: any) => {
    const result = await saveProgress.execute(progressData);
    if (result) {
      // Refresh progress data after successful save
      await getUserProgress.execute();
    }
    return result;
  }, [saveProgress.execute, getUserProgress.execute]);

  return {
    progress: getUserProgress.data,
    loading: getUserProgress.loading || saveProgress.loading,
    error: getUserProgress.error || saveProgress.error,
    fetchProgress: getUserProgress.execute,
    updateProgress,
    reset: () => {
      getUserProgress.reset();
      saveProgress.reset();
    },
  };
}

/**
 * Hook for authentication operations
 */
export function useAuthApi() {
  const validateToken = useApi(apiClient.validateToken.bind(apiClient));
  const signOut = useApi(apiClient.signOut.bind(apiClient));

  return {
    loading: validateToken.loading || signOut.loading,
    error: validateToken.error || signOut.error,
    validateToken: validateToken.execute,
    signOut: signOut.execute,
    reset: () => {
      validateToken.reset();
      signOut.reset();
    },
  };
}

/**
 * Generic hook for any API endpoint
 */
export function useApiCall<T = any>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET') {
  const apiCall = useCallback(
    async (data?: any) => {
      switch (method) {
        case 'GET':
          return apiClient.get<T>(endpoint);
        case 'POST':
          return apiClient.post<T>(endpoint, data);
        case 'PUT':
          return apiClient.put<T>(endpoint, data);
        case 'DELETE':
          return apiClient.delete<T>(endpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    [endpoint, method]
  );

  return useApi<T>(apiCall);
}
