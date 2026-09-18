import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  let style = 'bg-stone-100 text-stone-700 border-stone-200';

  const normalized = status.toLowerCase();

  if (normalized.includes('delivered') || normalized.includes('paid') || normalized.includes('active') || normalized.includes('captured') || normalized.includes('approved') || normalized.includes('completed') || normalized.includes('published')) {
    style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (normalized.includes('shipped') || normalized.includes('transit') || normalized.includes('processing') || normalized.includes('scheduled')) {
    style = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (normalized.includes('pending') || normalized.includes('review') || normalized.includes('draft')) {
    style = 'bg-blue-50 text-blue-800 border-blue-200';
  } else if (normalized.includes('cancelled') || normalized.includes('failed') || normalized.includes('rejected') || normalized.includes('out of stock')) {
    style = 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (normalized.includes('returned') || normalized.includes('refunded') || normalized.includes('low stock')) {
    style = 'bg-orange-50 text-orange-800 border-orange-200';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-sans font-medium rounded-full border ${padding} ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
      <span>{status}</span>
    </span>
  );
};
