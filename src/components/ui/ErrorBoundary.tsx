/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 * 
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback UI to display on error */
  fallback?: ReactNode;
  /** Optional callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for logging context */
  componentName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Default fallback component shown when an error occurs
 */
function DefaultErrorFallback({ 
  error, 
  onReset 
}: { 
  error: Error | null; 
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg m-4">
      <div className="text-red-600 mb-4">
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-red-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-red-600 mb-4 text-center max-w-md">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Error Boundary class component
 * Must be a class component as error boundaries require getDerivedStateFromError
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    const componentContext = this.props.componentName || 'Unknown';
    console.error(
      `[ErrorBoundary:${componentContext}] Caught error:`,
      error.message,
      {
        componentStack: errorInfo.componentStack,
        errorName: error.name,
        stack: error.stack
      }
    );

    // Update state with error info
    this.setState({ errorInfo });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send to error tracking service
    // Example: sendToErrorTracking(error, errorInfo, componentContext);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback or default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    componentName?: string;
  }
) {
  const displayName = 
    options?.componentName || 
    WrappedComponent.displayName || 
    WrappedComponent.name || 
    'Component';

  const ComponentWithErrorBoundary = (props: P) => (
    <ErrorBoundary
      fallback={options?.fallback}
      onError={options?.onError}
      componentName={displayName}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

/**
 * Hook-friendly error boundary wrapper using render props pattern
 */
interface ErrorBoundaryRenderProps {
  error: Error | null;
  resetError: () => void;
}

interface RenderPropsErrorBoundaryProps {
  children: (props: ErrorBoundaryRenderProps) => ReactNode;
  fallback?: (props: ErrorBoundaryRenderProps) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class RenderPropsErrorBoundary extends Component<
  RenderPropsErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: RenderPropsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RenderPropsErrorBoundary] Caught error:', error.message);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const renderProps: ErrorBoundaryRenderProps = {
      error: this.state.error,
      resetError: this.resetError
    };

    if (this.state.hasError && this.props.fallback) {
      return this.props.fallback(renderProps);
    }

    return this.props.children(renderProps);
  }
}

export default ErrorBoundary;
