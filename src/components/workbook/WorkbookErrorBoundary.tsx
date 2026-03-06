'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface WorkbookErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class WorkbookErrorBoundary extends React.Component<
  WorkbookErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: WorkbookErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workbook Error Boundary caught an error:', error, errorInfo);

    // Check if this is a React hook error
    const isHookError = error.message?.includes('Invalid hook call') ||
                        error.message?.includes('useContext') ||
                        error.message?.includes('usePathname') ||
                        errorInfo.componentStack?.includes('usePathname');

    if (isHookError) {
      console.error('🪝 React Hook Error detected:', {
        message: error.message,
        componentStack: errorInfo.componentStack
      });
    }

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            retry={this.handleRetry}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Workbook Error
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message?.includes('Invalid hook call') ||
               this.state.error?.message?.includes('useContext') ||
               this.state.error?.message?.includes('usePathname')
                ? "A React component error occurred. This might be due to a hydration issue. Please try refreshing the page."
                : "Something went wrong with the workbook. This might be due to a network issue or a temporary problem."
              }
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional component error handling
export function useWorkbookErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Workbook error caught:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      // Report error to monitoring service if needed
      console.error('Workbook Error:', error);
    }
  }, [error]);

  return { error, resetError, handleError };
}

// Specific error boundary for workbook components
export function WorkbookComponentBoundary({
  children,
  componentName
}: {
  children: React.ReactNode;
  componentName: string;
}) {
  return (
    <WorkbookErrorBoundary
      onError={(error, errorInfo) => {
        console.error(`Error in ${componentName}:`, error, errorInfo);
      }}
      fallback={({ error, retry }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {componentName} Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                This component encountered an error and couldn't load properly.
              </p>
              <button
                onClick={retry}
                className="mt-2 inline-flex items-center text-sm text-red-600 hover:text-red-500"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </WorkbookErrorBoundary>
  );
}