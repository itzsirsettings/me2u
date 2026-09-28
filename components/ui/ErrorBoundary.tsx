"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    void error;
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof window !== "undefined") {
      try {
        console.error("Me2U component render failure", {
          errorName: error.name,
          componentStack: errorInfo.componentStack,
        });
      } catch {
        // Error reporting must not break the recovery screen.
      }
    }
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 text-center space-y-6 shadow-xl">
            <div className="inline-block p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-card-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We hit an unexpected issue. You can try reloading this page or return home to
                continue.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 font-bold text-card-foreground transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-primary font-bold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleReset}
              className="text-xs text-muted-foreground hover:text-card-foreground transition-colors underline underline-offset-4"
            >
              Dismiss and try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
