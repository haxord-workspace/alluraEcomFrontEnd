import { useCallback, useRef, useState } from 'react';
import { toggleReviewHelpfulVote } from '../service/reviews';
import { toReviewApiError } from '../service/reviewErrors';
import type { ReviewApiError, ReviewVoteResult } from '../types/reviews';

// -----------------------------------------------------------------------------
// "Helpful" vote state. The public list has no "already voted" flag, so votes are
// tracked for this browser session only (module-level, survives re-renders and
// re-mounts, cleared on reload). The server response is always the source of truth.
// -----------------------------------------------------------------------------

const sessionVotes = new Map<string, ReviewVoteResult>();

export type ReviewVoteOutcome =
  | { ok: true; result: ReviewVoteResult }
  | { ok: false; error: ReviewApiError };

interface UseReviewVoteResult {
  voted: boolean;
  helpfulCount: number;
  isVoting: boolean;
  /** Optimistic toggle; rolled back on error. Resolves null if a vote was already in flight. */
  toggle: () => Promise<ReviewVoteOutcome | null>;
}

export const useReviewVote = (reviewId: string, initialHelpfulCount: number): UseReviewVoteResult => {
  const [state, setState] = useState<ReviewVoteResult>(
    () => sessionVotes.get(reviewId) ?? { voted: false, helpfulCount: initialHelpfulCount }
  );
  const [isVoting, setIsVoting] = useState(false);
  const inFlight = useRef(false);

  const toggle = useCallback(async (): Promise<ReviewVoteOutcome | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setIsVoting(true);

    const previous = state;
    const optimistic: ReviewVoteResult = {
      voted: !previous.voted,
      helpfulCount: Math.max(0, previous.helpfulCount + (previous.voted ? -1 : 1)),
    };
    setState(optimistic);

    try {
      const result = await toggleReviewHelpfulVote(reviewId);
      sessionVotes.set(reviewId, result);
      setState(result);
      return { ok: true, result };
    } catch (error) {
      setState(previous);
      return { ok: false, error: toReviewApiError(error, 'vote', 'Could not record your vote.') };
    } finally {
      inFlight.current = false;
      setIsVoting(false);
    }
  }, [reviewId, state]);

  return { voted: state.voted, helpfulCount: state.helpfulCount, isVoting, toggle };
};
