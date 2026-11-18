import React from 'react';
import { PenLine, Trash2 } from 'lucide-react';
import { StarRatingDisplay } from './StarRating';
import type { CustomerReview } from '../../types/reviews';

interface MyReviewPanelProps {
  review: CustomerReview;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * The signed-in customer's own review for this product, with shortcuts.
 * Review status / rejection reason are intentionally not shown to customers
 * (they stay in the data for the admin side).
 */
export const MyReviewPanel: React.FC<MyReviewPanelProps> = ({ review, isDeleting, onEdit, onDelete }) => (
  <div className="space-y-3">
    <p className="text-allura-text font-semibold">You reviewed this piece</p>
    <StarRatingDisplay rating={review.rating} size={14} />
    {review.title && <p className="text-allura-text font-semibold break-words">{review.title}</p>}
    {review.comment && <p className="text-allura-muted leading-relaxed line-clamp-3 break-words">{review.comment}</p>}
    <OwnReviewButtons isDeleting={isDeleting} onEdit={onEdit} onDelete={onDelete} />
  </div>
);

export const OwnReviewButtons: React.FC<Omit<MyReviewPanelProps, 'review'>> = ({ isDeleting, onEdit, onDelete }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={onEdit}
      disabled={isDeleting}
      className="inline-flex items-center gap-1.5 min-h-11 px-3.5 border border-allura-border rounded-xl text-xs font-sans font-bold text-allura-darkBrown hover:bg-allura-bg/60 disabled:opacity-50"
    >
      <PenLine size={13} />
      <span>Edit</span>
    </button>
    <button
      type="button"
      onClick={onDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-1.5 min-h-11 px-3.5 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-xs font-sans font-bold hover:bg-rose-100 disabled:opacity-50"
    >
      <Trash2 size={13} />
      <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
    </button>
  </div>
);
