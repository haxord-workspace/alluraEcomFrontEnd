import React from 'react';
import { ShoppingBag, Loader2, Check } from 'lucide-react';
import type { AddToBagState } from '../../hooks/useAddToBag';

interface AddToBagLabelProps {
  state: AddToBagState;
  label: string;
  iconSize?: number;
  addingLabel?: string;
  addedLabel?: string;
}

/** Icon + text for an "Add to Bag" button: bag → spinner while adding → tick when added */
export const AddToBagLabel: React.FC<AddToBagLabelProps> = ({
  state,
  label,
  iconSize = 15,
  addingLabel = 'ADDING…',
  addedLabel = 'ADDED',
}) => (
  <>
    {state === 'adding' ? (
      <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
    ) : state === 'added' ? (
      <Check size={iconSize} className="animate-[pop_0.3s_ease-out]" aria-hidden="true" />
    ) : (
      <ShoppingBag size={iconSize} aria-hidden="true" />
    )}
    <span aria-live="polite">{state === 'adding' ? addingLabel : state === 'added' ? addedLabel : label}</span>
  </>
);

/** Shared press / busy / success styling for Add to Bag buttons */
export const addToBagButtonState = (state: AddToBagState) =>
  `transition-all duration-200 active:scale-[0.97] disabled:cursor-wait ${state === 'adding' ? 'opacity-80' : ''}`;
