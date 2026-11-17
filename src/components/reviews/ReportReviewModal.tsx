import React, { useId, useState } from 'react';
import { ReviewDialog } from './ReviewDialog';
import { reportReview } from '../../service/reviews';
import { toReviewApiError } from '../../service/reviewErrors';
import { REVIEW_LIMITS } from '../../config/reviews';
import { REPORT_REASONS, REPORT_REASON_LABELS } from '../../types/reviews';
import type { ReportReason, ReviewApiError } from '../../types/reviews';

interface ReportReviewModalProps {
  reviewId: string | null;
  onClose: () => void;
  /** Called with the outcome so the parent shows the toast */
  onDone: (result: { ok: true; message: string } | { ok: false; error: ReviewApiError }) => void;
}

export const ReportReviewModal: React.FC<ReportReviewModalProps> = ({ reviewId, onClose, onDone }) => {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const descriptionId = useId();
  const counterId = useId();
  const max = REVIEW_LIMITS.reportDescriptionMax;

  const close = () => {
    if (isSubmitting) return;
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId || isSubmitting) return;
    if (!reason) {
      setReasonError('Please choose a reason.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      const result = await reportReview(reviewId, { reason, description });
      onDone({ ok: true, message: result.message });
      onClose();
    } catch (error) {
      const apiError = toReviewApiError(error, 'report', 'Could not submit your report.');
      if (apiError.kind === 'validation') {
        setFormError(apiError.fieldErrors.description || apiError.fieldErrors.reason || apiError.message);
      } else {
        // 409 already reported, 401, network… → parent toast, close the dialog
        onDone({ ok: false, error: apiError });
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ReviewDialog
      isOpen={!!reviewId}
      onClose={close}
      title="Report this review"
      description="Tell us what's wrong. Reports are checked by our team; the review stays visible until then."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="min-h-11 px-4 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-muted hover:text-allura-text disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="report-review-form"
            disabled={isSubmitting}
            className="min-h-11 px-5 bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      }
    >
      <form id="report-review-form" onSubmit={submit} noValidate className="space-y-5 text-xs font-sans">
        <fieldset className="space-y-2" aria-invalid={!!reasonError} aria-describedby={reasonError ? 'report-reason-error' : undefined}>
          <legend className="font-bold text-allura-darkBrown uppercase tracking-wider mb-2">Reason *</legend>
          {REPORT_REASONS.map((value, idx) => (
            <label key={value} className="flex items-center gap-3 min-h-11 px-3 border border-allura-border rounded-xl cursor-pointer hover:bg-allura-bg/40 has-[:checked]:border-allura-darkBrown has-[:checked]:bg-allura-bg/50">
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={reason === value}
                onChange={() => {
                  setReason(value);
                  setReasonError('');
                }}
                data-autofocus={idx === 0 ? true : undefined}
                className="accent-allura-goldDark w-4 h-4"
              />
              <span className="text-allura-text">{REPORT_REASON_LABELS[value]}</span>
            </label>
          ))}
          {reasonError && (
            <p id="report-reason-error" className="text-rose-700 font-medium">
              {reasonError}
            </p>
          )}
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor={descriptionId} className="block font-bold text-allura-darkBrown uppercase tracking-wider">
            Details <span className="font-normal normal-case tracking-normal text-allura-muted">(optional)</span>
          </label>
          <textarea
            id={descriptionId}
            rows={4}
            maxLength={max}
            value={description}
            onChange={e => setDescription(e.target.value)}
            aria-describedby={counterId}
            className="w-full p-3 bg-allura-bg/40 border border-allura-border rounded-xl resize-none text-sm text-allura-text focus:outline-none focus:border-allura-gold"
          />
          <p id={counterId} className="text-right text-[11px] text-allura-muted" aria-live="polite">
            {description.length}/{max}
          </p>
        </div>

        {formError && (
          <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
            {formError}
          </p>
        )}
      </form>
    </ReviewDialog>
  );
};
