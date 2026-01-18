"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class EarthSimulatorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error("Earth Simulator Error:", error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send to error tracking service (e.g., Sentry)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex items-center justify-center bg-black p-8">
          <Card className="max-w-2xl bg-gray-900 border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Earth Simulator Error
              </CardTitle>
              <CardDescription className="text-gray-400">
                An error occurred while loading the Earth Simulator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm font-mono text-red-400 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-gray-600 mt-2 overflow-auto max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>If this error persists, please:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache</li>
                  <li>Try a different browser</li>
                  <li>Contact support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
