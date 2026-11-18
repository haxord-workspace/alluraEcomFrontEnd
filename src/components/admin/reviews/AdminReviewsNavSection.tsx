import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Flag, MessageSquareText } from 'lucide-react';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ADMIN_REVIEWS_PATH,
  ADMIN_REVIEW_ANALYTICS_PATH,
  ADMIN_REVIEW_REPORTS_PATH,
  REVIEWS_ADMIN_MODULE,
  REVIEWS_ENABLED,
} from '../../../config/reviews';

interface AdminReviewsNavSectionProps {
  /** The sidebar's own NavLink class function, so the entry matches its siblings */
  navLinkClass: (state: { isActive: boolean }) => string;
  isCollapsed: boolean;
}

/** "Reviews" section of the admin sidebar. Hidden when the module is off or without permission. */
export const AdminReviewsNavSection: React.FC<AdminReviewsNavSectionProps> = ({ navLinkClass, isCollapsed }) => {
  const { can } = usePermissions();
  if (!REVIEWS_ENABLED || !can(REVIEWS_ADMIN_MODULE, 'view')) return null;

  return (
    <div className="space-y-1">
      <p className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-allura-muted/80">
        <span>Reviews</span>
      </p>
      <div className="space-y-0.5 pl-1">
        <NavLink to={ADMIN_REVIEWS_PATH} end className={navLinkClass} title={isCollapsed ? 'All Reviews' : undefined}>
          <MessageSquareText size={15} />
          {!isCollapsed && <span>All Reviews</span>}
        </NavLink>
        <NavLink to={ADMIN_REVIEW_REPORTS_PATH} end className={navLinkClass} title={isCollapsed ? 'Reported Reviews' : undefined}>
          <Flag size={15} />
          {!isCollapsed && <span>Reported Reviews</span>}
        </NavLink>
        <NavLink to={ADMIN_REVIEW_ANALYTICS_PATH} end className={navLinkClass} title={isCollapsed ? 'Review Analytics' : undefined}>
          <BarChart3 size={15} />
          {!isCollapsed && <span>Analytics</span>}
        </NavLink>
      </div>
    </div>
  );
};
