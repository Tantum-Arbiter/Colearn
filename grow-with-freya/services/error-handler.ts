import { Alert } from 'react-native';
import { AuthError } from '@/types/auth';
import { ApiError } from '@/services/api-client';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  additionalData?: any;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  shouldReport: boolean;
}

class ErrorHandlerService {
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize = 50;

  /**
   * Handle authentication errors
   */
  handleAuthError(error: AuthError | Error, context: ErrorContext = {}): void {
    const errorReport: ErrorReport = {
      error,
      context: {
        ...context,
        component: context.component || 'Authentication',
        timestamp: new Date().toISOString(),
      },
      severity: 'high',
      userMessage: this.getAuthErrorMessage(error),
      shouldReport: true,
    };

    this.processError(errorReport);
  }

  /**
   * Handle API errors
   */
  handleApiError(error: ApiError | Error, context: ErrorContext = {}): void {
    const severity = error instanceof ApiError 
      ? this.getApiErrorSeverity(error.status)
      : 'medium';

    const errorReport: ErrorReport = {
      error,
      context: {
        ...context,
        component: context.component || 'API',
        timestamp: new Date().toISOString(),
      },
      severity,
      userMessage: this.getApiErrorMessage(error),
      shouldReport: severity !== 'low',
    };

    this.processError(errorReport);
  }

  /**
   * Handle general application errors
   */
  handleAppError(
    error: Error, 
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const errorReport: ErrorReport = {
      error,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      severity,
      userMessage: this.getGenericErrorMessage(error, severity),
      shouldReport: severity !== 'low',
    };

    this.processError(errorReport);
  }

  /**
   * Process error report
   */
  private processError(errorReport: ErrorReport): void {
    // Log error
    this.logError(errorReport);

    // Add to queue for reporting
    if (errorReport.shouldReport) {
      this.addToQueue(errorReport);
    }

    // Show user message if appropriate
    if (errorReport.severity === 'high' || errorReport.severity === 'critical') {
      this.showUserAlert(errorReport);
    }

    // Handle critical errors
    if (errorReport.severity === 'critical') {
      this.handleCriticalError(errorReport);
    }
  }

  /**
   * Log error to console and analytics
   */
  private logError(errorReport: ErrorReport): void {
    const logLevel = this.getLogLevel(errorReport.severity);
    const logMessage = `[${errorReport.severity.toUpperCase()}] ${errorReport.error.message}`;
    
    console[logLevel](logMessage, {
      error: errorReport.error,
      context: errorReport.context,
      stack: errorReport.error.stack,
    });

    // TODO: Send to analytics service (Firebase, Sentry, etc.)
    // this.sendToAnalytics(errorReport);
  }

  /**
   * Add error to reporting queue
   */
  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // TODO: Batch send errors to reporting service
    // this.scheduleErrorReporting();
  }

  /**
   * Show user-friendly alert
   */
  private showUserAlert(errorReport: ErrorReport): void {
    const title = errorReport.severity === 'critical' 
      ? 'Critical Error' 
      : 'Something went wrong';

    Alert.alert(
      title,
      errorReport.userMessage,
      [
        { text: 'OK', style: 'default' },
        ...(errorReport.severity === 'critical' 
          ? [{ text: 'Report Issue', onPress: () => this.reportIssue(errorReport) }]
          : []
        ),
      ]
    );
  }

  /**
   * Handle critical errors that might require app restart
   */
  private handleCriticalError(errorReport: ErrorReport): void {
    // TODO: Implement critical error handling
    // - Save app state
    // - Clear corrupted data
    // - Prepare for graceful restart
    console.error('CRITICAL ERROR:', errorReport);
  }

  /**
   * Get user-friendly message for auth errors
   */
  private getAuthErrorMessage(error: Error): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('cancelled') || message.includes('canceled')) {
        return 'Sign-in was cancelled. Please try again.';
      }
      
      if (message.includes('network') || message.includes('connection')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      if (message.includes('expired') || message.includes('invalid')) {
        return 'Your session has expired. Please sign in again.';
      }
      
      if (message.includes('permission') || message.includes('denied')) {
        return 'Permission denied. Please check your account settings.';
      }
    }
    
    return 'Authentication failed. Please try again or contact support.';
  }

  /**
   * Get user-friendly message for API errors
   */
  private getApiErrorMessage(error: Error): string {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Your session has expired. Please sign in again.';
        case 403:
          return 'You don\'t have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 503:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Network error. Please check your connection and try again.';
      }
    }
    
    return 'Network error. Please check your connection and try again.';
  }

  /**
   * Get generic error message
   */
  private getGenericErrorMessage(error: Error, severity: string): string {
    if (severity === 'critical') {
      return 'A critical error occurred. The app may need to restart. Please contact support if this continues.';
    }
    
    if (severity === 'high') {
      return 'An error occurred that may affect app functionality. Please try again.';
    }
    
    return 'Something went wrong. Please try again.';
  }

  /**
   * Get API error severity based on status code
   */
  private getApiErrorSeverity(status: number): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'high';
    if (status === 401 || status === 403) return 'medium';
    if (status >= 400) return 'low';
    return 'medium';
  }

  /**
   * Get console log level for severity
   */
  private getLogLevel(severity: string): 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low':
        return 'log';
      case 'medium':
        return 'warn';
      case 'high':
      case 'critical':
        return 'error';
      default:
        return 'warn';
    }
  }

  /**
   * Report issue to support
   */
  private reportIssue(errorReport: ErrorReport): void {
    // TODO: Implement issue reporting
    // - Collect device info
    // - Prepare error report
    // - Send to support system
    console.log('Reporting issue:', errorReport);
  }

  /**
   * Get error queue for debugging
   */
  getErrorQueue(): ErrorReport[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error queue
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

// Create and export singleton instance
export const errorHandler = new ErrorHandlerService();

// Convenience functions for common error types
export const handleAuthError = (error: AuthError | Error, context?: ErrorContext) => 
  errorHandler.handleAuthError(error, context);

export const handleApiError = (error: ApiError | Error, context?: ErrorContext) => 
  errorHandler.handleApiError(error, context);

export const handleAppError = (
  error: Error, 
  context?: ErrorContext, 
  severity?: 'low' | 'medium' | 'high' | 'critical'
) => errorHandler.handleAppError(error, context, severity);
