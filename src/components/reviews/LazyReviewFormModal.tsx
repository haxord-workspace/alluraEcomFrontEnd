import React, { Suspense, lazy } from 'react';
import type { ReviewFormTarget } from './ReviewFormModal';

// The form (and its image picker) is fetched the first time a customer opens it,
// so pages that only show the button don't carry it in their bundle.
const ReviewFormModal = lazy(() => import('./ReviewFormModal'));

interface LazyReviewFormModalProps {
  target: ReviewFormTarget | null;
  onClose: () => void;
  onSaved?: (mode: 'create' | 'edit') => void;
}

export const LazyReviewFormModal: React.FC<LazyReviewFormModalProps> = ({ target, onClose, onSaved }) => {
  if (!target) return null;
  return (
    <Suspense fallback={null}>
      <ReviewFormModal
        key={target.mode === 'edit' ? `edit-${target.review.id}` : `create-${target.productId}-${target.orderId}`}
        target={target}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Suspense>
  );
};
