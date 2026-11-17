import React, { useId, useRef, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { ReviewDialog } from '../../reviews/ReviewDialog';
import { StarRatingDisplay } from '../../reviews/StarRating';
import { respondToReview } from '../../../service/adminReviews';
import { toReviewApiError } from '../../../service/reviewErrors';
import { REVIEW_LIMITS } from '../../../config/reviews';
import type { AdminReview, ReviewSellerResponse } from '../../../types/reviews';

interface RespondReviewModalProps {
  review: AdminReview;
  onClose: () => void;
  /** adminResponse is null when the backend body did not include one (caller re-fetches) */
  onResponded: (result: { adminResponse: ReviewSellerResponse | null; message: string }) => void;
}

/** Add or replace the public seller response on a review. */
export const RespondReviewModal: React.FC<RespondReviewModalProps> = ({ review, onClose, onResponded }) => {
  const isEdit = !!review.adminResponse;
  const [message, setMessage] = useState(review.adminResponse?.message ?? '');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const formId = useId();
  const fieldId = useId();
  const max = REVIEW_LIMITS.responseMessageMax;

  const validate = (value: string) =>
    !value.trim() ? 'Please write a response.' : value.length > max ? `Keep the response under ${max} characters.` : '';

  const close = () => {
    if (!submitting.current) onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const err = validate(message);
    setFieldError(err);
    if (err) {
      document.getElementById(fieldId)?.focus();
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setFormError('');
    try {
      const result = await respondToReview(review.id, { message });
      submitting.current = false;
      onResponded({ adminResponse: result.adminResponse, message: result.message });
      onClose();
    } catch (error) {
      const apiError = toReviewApiError(error, 'admin-write', 'Could not save the response.');
      if (apiError.kind === 'forbidden') {
        setFormError("You don't have permission to respond to reviews.");
      } else if (apiError.fieldErrors.message) {
        setFieldError(apiError.fieldErrors.message);
      } else {
        setFormError(apiError.message);
      }
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ReviewDialog
      isOpen
      onClose={close}
      title={isEdit ? 'Edit seller response' : 'Respond to review'}
      description="Your response is shown publicly under the review."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="min-h-11 px-4 border border-stone-300 bg-white rounded-xl text-xs font-sans font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting}
            className="min-h-11 px-5 inline-flex items-center justify-center gap-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>{isSubmitting ? 'Saving…' : isEdit ? 'Save response' : 'Post response'}</span>
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4 text-xs font-sans">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
          <StarRatingDisplay rating={review.rating} size={12} />
          {review.title && <p className="font-semibold text-stone-900 break-words">{review.title}</p>}
          {review.comment && <p className="text-stone-600 line-clamp-4 whitespace-pre-line break-words">{review.comment}</p>}
          <p className="text-[11px] text-stone-400">— {review.customer.name || 'Customer'}</p>
        </div>

        {isEdit && (
          <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <span>Saving replaces the existing response.</span>
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor={fieldId} className="block font-bold text-stone-800 uppercase tracking-wider">
            Response *
          </label>
          <textarea
            id={fieldId}
            rows={6}
            value={message}
            maxLength={max}
            onChange={e => {
              setMessage(e.target.value);
              if (fieldError) setFieldError(validate(e.target.value));
            }}
            onBlur={() => setFieldError(validate(message))}
            disabled={isSubmitting}
            data-autofocus
            aria-invalid={!!fieldError}
            aria-describedby={`${fieldId}-meta`}
            placeholder="Thank the customer, answer their question, or explain what you've done."
            className={`w-full p-3 bg-white border rounded-xl resize-y text-sm text-stone-900 focus:outline-none ${
              fieldError ? 'border-rose-400' : 'border-stone-200 focus:border-stone-800'
            }`}
          />
          <div id={`${fieldId}-meta`} className="flex justify-between gap-2 text-[11px]">
            <span className="text-rose-700 font-medium">{fieldError}</span>
            <span className="text-stone-400 tabular-nums">
              {message.length}/{max}
            </span>
          </div>
        </div>

        {formError && (
          <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 break-words">
            {formError}
          </p>
        )}
      </form>
    </ReviewDialog>
  );
};
