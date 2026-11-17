import React, { useRef, useState } from 'react';
import { Loader2, Wrench } from 'lucide-react';
import { useConfirm } from '../../../context/ConfirmContext';
import { useShop } from '../../../context/ShopContext';
import { reconcileReviewRatings } from '../../../service/adminReviews';
import { toReviewApiError } from '../../../service/reviewErrors';

const EXPLANATION =
  'Rebuilds the average rating and review count for every product from its approved reviews. This runs in the background and may take a while.';

/**
 * Maintenance: POST /admin/product-reviews/reconcile-ratings (202 Queued).
 * Only ever runs on an explicit, confirmed click. Never automatically.
 */
export const ReconcileRatingsCard: React.FC = () => {
  const confirm = useConfirm();
  const { showToast } = useShop();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [queuedAt, setQueuedAt] = useState<Date | null>(null);
  const running = useRef(false);

  const run = async () => {
    if (running.current) return;
    running.current = true;
    setError('');
    try {
      const ok = await confirm({ title: 'Reconcile ratings?', message: EXPLANATION, confirmLabel: 'Reconcile ratings' });
      if (!ok) return;
      setIsRunning(true);
      await reconcileReviewRatings();
      // 202 Queued: the work happens in the background. Never claim it is done.
      setQueuedAt(new Date());
      showToast('Reconcile queued. Ratings will update shortly', 'success');
    } catch (err) {
      const apiError = toReviewApiError(err, 'admin-write', 'Could not queue the reconcile.');
      const message = apiError.kind === 'forbidden' ? "You don't have permission to reconcile ratings" : apiError.message;
      setError(message);
      showToast(message, 'error');
    } finally {
      running.current = false;
      setIsRunning(false);
    }
  };

  return (
    <section className="bg-stone-50 border border-dashed border-stone-300 rounded-2xl p-5 sm:p-6 space-y-3" aria-labelledby="reconcile-heading">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 flex-shrink-0">
          <Wrench size={16} />
        </span>
        <div className="min-w-0">
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-stone-400 uppercase">Maintenance</span>
          <h2 id="reconcile-heading" className="font-serif text-lg text-stone-900 font-normal">
            Reconcile product ratings
          </h2>
          <p className="text-xs font-sans text-stone-500 mt-0.5">{EXPLANATION}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={isRunning}
          className="inline-flex items-center gap-2 min-h-11 px-5 rounded-xl border border-stone-300 bg-white text-xs font-sans font-bold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
        >
          {isRunning && <Loader2 size={14} className="animate-spin" />}
          <span>{isRunning ? 'Queuing…' : 'Reconcile ratings'}</span>
        </button>
        {queuedAt && !error && (
          <p className="text-xs font-sans text-emerald-800" role="status">
            Queued at {queuedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}. Ratings will update shortly; use
            Refresh above to check analytics later.
          </p>
        )}
        {error && (
          <p className="text-xs font-sans text-rose-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
};
