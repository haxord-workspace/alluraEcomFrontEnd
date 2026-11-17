import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';

interface ReviewCallToActionProps {
  isAuthenticated: boolean;
  /**
   * Content for signed-in customers who can review (the "Write a Review" button and
   * own-review shortcuts), wired up in Phase C. When omitted, signed-in customers see
   * the eligibility hint.
   */
  eligibleSlot?: React.ReactNode;
}

/** "Write a Review" call-to-action on Product Details. */
export const ReviewCallToAction: React.FC<ReviewCallToActionProps> = ({ isAuthenticated, eligibleSlot }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-3 text-xs font-sans">
      <div className="flex items-center gap-2 text-allura-darkBrown">
        <MessageSquareText size={16} />
        <p className="font-bold uppercase tracking-wider">Share your experience</p>
      </div>

      {!isAuthenticated ? (
        <>
          <p className="text-allura-muted leading-relaxed">Sign in to review pieces you have purchased.</p>
          <button
            type="button"
            onClick={() => navigate('/auth/login', { state: { from: location } })}
            className="w-full min-h-11 bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
          >
            Login to review
          </button>
        </>
      ) : eligibleSlot ? (
        eligibleSlot
      ) : (
        <p className="text-allura-muted leading-relaxed">
          Reviews can be written by customers whose order for this piece has been delivered. You can review it from{' '}
          <Link to="/account/orders" className="font-bold text-allura-goldDark underline">
            My Orders
          </Link>{' '}
          once it arrives.
        </p>
      )}
    </div>
  );
};
