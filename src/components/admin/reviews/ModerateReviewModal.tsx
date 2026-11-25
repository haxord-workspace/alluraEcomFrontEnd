import React, { useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { ReviewDialog } from '../../reviews/ReviewDialog';
import { StarRatingDisplay } from '../../reviews/StarRating';
import { StatusBadge } from '../../common/StatusBadge';
import { moderateReview } from '../../../service/adminReviews';
import { toReviewApiError } from '../../../service/reviewErrors';
import { ASSUMED_MODERATION_TRANSITIONS } from '../../../service/reviewMappers';
import { REVIEW_LIMITS } from '../../../config/reviews';
import { MODERATION_ACTION_LABELS, REVIEW_STATUS_LABELS } from '../../../types/reviews';
import type { AdminReview, ModerationAction } from '../../../types/reviews';

// Customers never see a review status, so the copy only describes the product page.
const ACTION_HELP: Record<ModerationAction, string> = {
  APPROVE: 'Publish it on the product page and count it in the product rating.',
  REJECT: 'Take it off the product page and record why. The reason is for your team only.',
  HIDE: 'Take it off the product page without a reason.',
  RESTORE: 'Put it back. The server decides its new status.',
};

const CONFIRM_COPY: Partial<Record<ModerationAction, { title: string; message: string; confirmLabel: string }>> = {
  REJECT: {
    title: 'Reject this review?',
    message: 'The review will be removed from the product page and no longer counted in the rating. You can restore it later.',
    confirmLabel: 'Reject review',
  },
  HIDE: {
    title: 'Hide this review?',
    message: 'The review will be removed from the product page and no longer counted in the rating. You can restore it later.',
    confirmLabel: 'Hide review',
  },
};

interface ModerateReviewModalProps {
  review: AdminReview;
  onClose: () => void;
  /** Called after the backend accepted the action */
  onModerated: (action: ModerationAction, details: { rejectionReason?: string; message: string }) => void;
}

/** Approve / reject / hide / restore one review. Offers only the actions valid for its status. */
export const ModerateReviewModal: React.FC<ModerateReviewModalProps> = ({ review, onClose, onModerated }) => {
  const confirm = useConfirm();
  const { can } = usePermissions();
  const canPublish = can('reviews', 'publish');
  const canEdit = can('reviews', 'edit');

  const allActions = ASSUMED_MODERATION_TRANSITIONS[review.status] ?? [];
  const actions = allActions.filter((act) => {
    if (act === 'APPROVE' || act === 'REJECT') return canPublish;
    if (act === 'HIDE' || act === 'RESTORE') return canEdit;
    return true;
  });

  const [action, setAction] = useState<ModerationAction | null>(actions.length === 1 ? actions[0] : null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const reasonId = useId();
  const max = REVIEW_LIMITS.rejectionReasonMax;

  const close = () => {
    if (!submitting.current) onClose();
  };

  const validateReason = (value: string) =>
    !value.trim() ? 'A reason is required to reject a review.' : value.length > max ? `Keep the reason under ${max} characters.` : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || submitting.current) return;
    if (action === 'REJECT') {
      const err = validateReason(reason);
      setReasonError(err);
      if (err) {
        document.getElementById(reasonId)?.focus();
        return;
      }
    }

    submitting.current = true;
    setIsSubmitting(true);
    setFormError('');

    try {
      const copy = CONFIRM_COPY[action];
      if (copy) {
        const ok = await confirm({ ...copy, isDestructive: true });
        submitRef.current?.focus();
        if (!ok) return;
      }
      const result =
        action === 'REJECT'
          ? await moderateReview(review.id, { action, rejectionReason: reason })
          : await moderateReview(review.id, { action });
      submitting.current = false;
      onModerated(action, { rejectionReason: action === 'REJECT' ? reason.trim() : undefined, message: result.message });
      onClose();
    } catch (error) {
      const apiError = toReviewApiError(error, 'admin-write', 'Could not update this review.');
      // 400 (invalid transition / missing reason) → backend message; modal stays open
      setFormError(apiError.kind === 'forbidden' ? "You don't have permission to moderate reviews." : apiError.message);
      if (apiError.fieldErrors.rejectionReason) setReasonError(apiError.fieldErrors.rejectionReason);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ReviewDialog
      isOpen
      onClose={close}
      title="Moderate review"
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
            ref={submitRef}
            type="submit"
            form={formId}
            disabled={isSubmitting || !action}
            className={`min-h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider text-white disabled:opacity-50 ${
              action === 'REJECT' || action === 'HIDE' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-[#561C08] hover:bg-[#561C08]/90'
            }`}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>{isSubmitting ? 'Saving…' : action ? MODERATION_ACTION_LABELS[action] : 'Choose an action'}</span>
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5 text-xs font-sans">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={REVIEW_STATUS_LABELS[review.status]} size="sm" />
            <StarRatingDisplay rating={review.rating} size={12} />
          </div>
          <p className="font-semibold text-stone-900 break-words">{review.title || 'Untitled review'}</p>
          <p className="text-stone-500 break-words">
            {review.product.name || 'Unknown product'} · {review.customer.name || 'Unknown customer'}
          </p>
        </div>

        {actions.length === 0 ? (
          <p className="text-stone-500">No moderation actions are available for this status.</p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="font-bold text-stone-800 uppercase tracking-wider mb-2">Action</legend>
            {actions.map((value, idx) => (
              <label
                key={value}
                className="flex items-start gap-3 p-3 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 has-[:checked]:border-stone-800 has-[:checked]:bg-stone-50"
              >
                <input
                  type="radio"
                  name="moderation-action"
                  value={value}
                  checked={action === value}
                  onChange={() => {
                    setAction(value);
                    setFormError('');
                  }}
                  disabled={isSubmitting}
                  data-autofocus={idx === 0 ? true : undefined}
                  className="mt-0.5 w-4 h-4 accent-stone-800"
                />
                <span>
                  <span className="block font-bold text-stone-900">{MODERATION_ACTION_LABELS[value]}</span>
                  <span className="block text-stone-500 mt-0.5">{ACTION_HELP[value]}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {action === 'REJECT' && (
          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="block font-bold text-stone-800 uppercase tracking-wider">
              Rejection reason *
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              maxLength={max}
              onChange={e => {
                setReason(e.target.value);
                if (reasonError) setReasonError(validateReason(e.target.value));
              }}
              onBlur={() => setReasonError(validateReason(reason))}
              disabled={isSubmitting}
              aria-invalid={!!reasonError}
              aria-describedby={`${reasonId}-meta`}
              placeholder="Why is this review being rejected? (internal)"
              className={`w-full p-3 bg-white border rounded-xl resize-y text-sm text-stone-900 focus:outline-none ${
                reasonError ? 'border-rose-400' : 'border-stone-200 focus:border-stone-800'
              }`}
            />
            <div id={`${reasonId}-meta`} className="flex justify-between gap-2 text-[11px]">
              <span className="text-rose-700 font-medium">{reasonError}</span>
              <span className="text-stone-400 tabular-nums">
                {reason.length}/{max}
              </span>
            </div>
          </div>
        )}

        {formError && (
          <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 break-words">
            {formError}
          </p>
        )}
      </form>
    </ReviewDialog>
  );
};
