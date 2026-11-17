import React from 'react';
import { ReviewsUnavailable } from './ReviewsUnavailable';

interface ReviewsErrorBoundaryProps {
  children: React.ReactNode;
  /** Render nothing on error instead of the "unavailable" message (for tiny inline pieces) */
  silent?: boolean;
  /** Render this on error instead (e.g. the original button the review UI replaced) */
  fallback?: React.ReactNode;
  /** Called when the user presses Retry, before the boundary re-renders its children */
  onReset?: () => void;
}

interface ReviewsErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates the reviews module: a crash inside review UI (or a failed lazy chunk)
 * shows a small message in place of the section and never blanks the host page.
 */
export class ReviewsErrorBoundary extends React.Component<ReviewsErrorBoundaryProps, ReviewsErrorBoundaryState> {
  state: ReviewsErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ReviewsErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.error('[reviews] UI error isolated by ReviewsErrorBoundary:', error);
    }
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    if (this.props.silent) return null;
    return <ReviewsUnavailable onRetry={this.reset} />;
  }
}
