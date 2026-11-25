import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AdminRouteErrorBoundaryProps {
  children: React.ReactNode;
}

interface AdminRouteErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates each admin route's own content: a render crash inside a page (or a modal it
 * renders) shows this card in place of that page instead of unmounting the whole admin
 * shell — the sidebar, header and command search stay up either way.
 */
export class AdminRouteErrorBoundary extends React.Component<AdminRouteErrorBoundaryProps, AdminRouteErrorBoundaryState> {
  state: AdminRouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdminRouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[admin] Route render error caught by AdminRouteErrorBoundary:', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="max-w-lg mx-auto mt-12 p-6 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2 className="font-serif text-xl text-stone-900">Something went wrong</h2>
          <p className="text-xs font-sans text-stone-500 mt-1">
            This page ran into an unexpected error. Reloading usually fixes it.
          </p>
        </div>
        <button
          type="button"
          onClick={this.reload}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
        >
          <RefreshCw size={14} />
          Reload Page
        </button>
      </div>
    );
  }
}
