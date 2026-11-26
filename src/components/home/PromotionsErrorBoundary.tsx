import React from 'react';

interface PromotionsErrorBoundaryState {
  hasError: boolean;
}

/** Isolates the Promotions section: any crash here renders nothing, so the home page never blanks. */
export class PromotionsErrorBoundary extends React.Component<{ children: React.ReactNode }, PromotionsErrorBoundaryState> {
  state: PromotionsErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PromotionsErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.error('[promotions] UI error isolated by PromotionsErrorBoundary:', error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
