import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error
        console.error('🚨 Error caught by boundary:', error, errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-screen w-full bg-primary flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-secondary rounded-lg p-6 text-center">
                        <div className="text-6xl mb-4">🚨</div>
                        <h1 className="text-2xl font-bold text-primary mb-4">Something went wrong</h1>
                        <p className="text-primary opacity-80 mb-6">
                            The application encountered an error. Please refresh the page to try again.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 rounded-lg text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'var(--accent)' }}
                        >
                            Refresh Page
                        </button>
                        
                        {(import.meta?.env?.MODE === 'development') && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-primary font-semibold mb-2">
                                    Error Details (Development)
                                </summary>
                                <div className="bg-primary rounded p-4 text-sm font-mono">
                                    <div className="text-red-400 mb-2">
                                        {this.state.error && this.state.error.toString()}
                                    </div>
                                    <div className="text-gray-400 whitespace-pre-wrap">
                                        {this.state?.errorInfo?.componentStack || this.state?.error?.stack || 'No stack available.'}
                                    </div>
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
