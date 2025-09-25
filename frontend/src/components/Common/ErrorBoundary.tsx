/**
 * ErrorBoundary Component
 *
 * React error boundary component that catches JavaScript errors in child component tree.
 * Provides graceful error handling with user-friendly error displays and debugging tools.
 *
 * Features:
 * - Catches and displays JavaScript errors in child components
 * - Provides user-friendly error interface with recovery options
 * - Development mode error details with stack traces
 * - Custom fallback UI support for specific error scenarios
 * - Automatic page refresh option for error recovery
 * - Console logging for debugging and monitoring
 * - Responsive design with consistent styling
 *
 * Architecture:
 * - Class component implementing React's error boundary lifecycle methods
 * - Uses getDerivedStateFromError for error state updates
 * - Implements componentDidCatch for error logging and side effects
 * - Supports custom fallback UI through props
 * - Conditionally shows detailed error info in development mode
 *
 * Error Handling Flow:
 * 1. Child component throws JavaScript error
 * 2. getDerivedStateFromError updates component state
 * 3. componentDidCatch logs error details for debugging
 * 4. Component renders error UI instead of broken child tree
 * 5. User can refresh page or see detailed error information
 *
 * Props:
 * @param children - Child components to wrap with error boundary protection
 * @param fallback - Optional custom error UI to display instead of default
 *
 * State:
 * @param hasError - Boolean indicating if an error has occurred
 * @param error - The caught error object with details
 * @param errorInfo - React error info including component stack
 *
 * Integration Points:
 * - Wraps application sections requiring error protection
 * - Integrates with logging services for error monitoring
 * - Provides fallback UI for critical application failures
 * - Supports development debugging workflows
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="flex flex-col items-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Something went wrong
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      We're sorry, but something unexpected happened. Please try refreshing the page.
                    </p>
                  </div>
                </div>
                <div className="mt-5 w-full">
                  <button
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 w-full">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Show error details (development only)
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs">
                      <div className="font-mono text-red-600 mb-2">
                        {this.state.error.toString()}
                      </div>
                      {this.state.errorInfo && (
                        <div className="font-mono text-gray-600 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;