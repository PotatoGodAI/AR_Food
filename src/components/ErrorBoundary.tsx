import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'AN_UNEXPECTED_SYSTEM_ERROR_HAS_OCCURRED';
      let errorDetails = '';

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `FIRESTORE_ERROR: ${parsed.operationType.toUpperCase()}_FAILED`;
            errorDetails = parsed.error;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorDetails = this.state.error?.message || '';
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 font-mono text-white">
          <div className="brutalist-card w-full max-w-lg border-red-500">
            <div className="mb-6 flex items-center gap-3 text-red-500">
              <AlertTriangle size={32} />
              <h1 className="text-2xl font-bold uppercase tracking-tighter">
                SYSTEM_CRITICAL_FAILURE
              </h1>
            </div>
            
            <p className="mb-2 text-sm font-bold uppercase text-red-400">
              {errorMessage}
            </p>
            
            <div className="mb-8 border border-red-900/30 bg-red-900/10 p-4 font-mono text-[10px] text-red-300">
              <p className="mb-2 uppercase tracking-widest">ERROR_LOG:</p>
              <p className="break-all">{errorDetails || this.state.error?.toString()}</p>
            </div>

            <button
              onClick={this.handleReset}
              className="brutalist-button flex w-full items-center justify-center gap-2 border-red-500 py-3 text-red-500 hover:bg-red-500 hover:text-black"
            >
              <RefreshCw size={18} />
              REBOOT_SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
