'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
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
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Something went wrong</h3>
            <p className="text-zinc-500 max-w-xs mx-auto text-sm">
              An unexpected error occurred in this component. Our team has been notified.
            </p>
          </div>
          {this.state.error && (
            <pre className="text-[10px] text-zinc-600 font-mono bg-black/40 p-4 rounded-xl max-w-md overflow-auto text-left border border-zinc-800">
              {this.state.error.message}
            </pre>
          )}
          <Button
            onClick={this.handleReset}
            className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
