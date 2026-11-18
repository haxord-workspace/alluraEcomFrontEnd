import React, { useId, useRef, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import { ReviewDialog } from '../../reviews/ReviewDialog';
import { ReportStatusBadge } from './ReportStatusBadge';
import { decideReviewReport } from '../../../service/adminReviews';
import { toReviewApiError } from '../../../service/reviewErrors';
import { REPORT_DECISION_LABELS, REPORT_REASON_LABELS } from '../../../types/reviews';
import type { ReportDecision, ReportModerationAction, ReviewReport } from '../../../types/reviews';

const DECISION_HELP: Record<ReportDecision, string> = {
  REVIEWED: 'You looked into the report. Optionally hide the review if it breaks the guidelines.',
  DISMISSED: "The report doesn't need action. The review stays exactly as it is.",
};

interface ReportDecisionModalProps {
  report: ReviewReport;
  onClose: () => void;
  onDecided: (decision: ReportDecision, moderationAction: ReportModerationAction) => void;
}

/** Decide a PENDING report: mark reviewed (optionally hiding the review) or dismiss. */
export const ReportDecisionModal: React.FC<ReportDecisionModalProps> = ({ report, onClose, onDecided }) => {
  const confirm = useConfirm();
  const [decision, setDecision] = useState<ReportDecision | null>(null);
  const [hideReview, setHideReview] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
  const submitRef = useRef<HTMLButtonElement>(null);
  const formId = useId();
  const hideId = useId();

  const moderationAction: ReportModerationAction = decision === 'REVIEWED' && hideReview ? 'HIDE_REVIEW' : 'NONE';
  const reasonLabel = report.reason ? REPORT_REASON_LABELS[report.reason] : report.reasonRaw || 'No reason given';

  const close = () => {
    if (!submitting.current) onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setFormError('');
    try {
      if (moderationAction === 'HIDE_REVIEW') {
        const ok = await confirm({
          title: 'Hide the reported review?',
          message:
            'The review will be removed from the product page and no longer counted in the rating. You can restore it later from Reviews.',
          confirmLabel: 'Hide review',
          isDestructive: true,
        });
        submitRef.current?.focus();
        if (!ok) return;
      }
      await decideReviewReport(report.id, { decision, moderationAction });
      submitting.current = false;
      onDecided(decision, moderationAction);
      onClose();
    } catch (error) {
      const apiError = toReviewApiError(error, 'admin-write', 'Could not update this report.');
      setFormError(apiError.kind === 'forbidden' ? "You don't have permission to manage reports." : apiError.message);
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <ReviewDialog
      isOpen
      onClose={close}
      title="Resolve report"
      description="Reporting never hides a review on its own. Hiding is your explicit choice."
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
            disabled={isSubmitting || !decision}
            className={`min-h-11 px-5 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider text-white disabled:opacity-50 ${
              moderationAction === 'HIDE_REVIEW' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-[#561C08] hover:bg-[#561C08]/90'
            }`}
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            <span>
              {isSubmitting
                ? 'Saving…'
                : !decision
                  ? 'Choose a decision'
                  : moderationAction === 'HIDE_REVIEW'
                    ? 'Mark reviewed & hide'
                    : REPORT_DECISION_LABELS[decision]}
            </span>
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5 text-xs font-sans">
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ReportStatusBadge status={report.status} />
            <span className="inline-flex items-center gap-1 font-bold text-rose-800">
              <Flag size={12} /> {reasonLabel}
            </span>
          </div>
          {report.description && <p className="text-stone-700 whitespace-pre-line break-words">“{report.description}”</p>}
          {report.review?.title && <p className="text-stone-500 break-words">On: {report.review.title}</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className="font-bold text-stone-800 uppercase tracking-wider mb-2">Decision</legend>
          {(['REVIEWED', 'DISMISSED'] as const).map((value, idx) => (
            <label
              key={value}
              className="flex items-start gap-3 p-3 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 has-[:checked]:border-stone-800 has-[:checked]:bg-stone-50"
            >
              <input
                type="radio"
                name="report-decision"
                value={value}
                checked={decision === value}
                onChange={() => {
                  setDecision(value);
                  if (value === 'DISMISSED') setHideReview(false);
                  setFormError('');
                }}
                disabled={isSubmitting}
                data-autofocus={idx === 0 ? true : undefined}
                className="mt-0.5 w-4 h-4 accent-stone-800"
              />
              <span>
                <span className="block font-bold text-stone-900">{REPORT_DECISION_LABELS[value]}</span>
                <span className="block text-stone-500 mt-0.5">{DECISION_HELP[value]}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {decision === 'REVIEWED' && (
          <label htmlFor={hideId} className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/60 cursor-pointer min-h-11">
            <input
              id={hideId}
              type="checkbox"
              checked={hideReview}
              onChange={e => setHideReview(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 w-4 h-4 accent-rose-700"
            />
            <span>
              <span className="block font-bold text-rose-900">Also hide the reported review</span>
              <span className="block text-rose-800/80 mt-0.5">
                Removes it from the product page. You can restore it later from Reviews.
              </span>
            </span>
          </label>
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
