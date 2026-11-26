import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import type {
  AdminHomepageExperienceFeature,
  CreateFeatureDTO,
  UpdateFeatureDTO,
} from '../../../../../types/homepageExperience';
import { ExperienceIcon, SUPPORTED_EXPERIENCE_ICONS } from '../../../../../components/common/ExperienceIcon';

interface FeatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateFeatureDTO | UpdateFeatureDTO) => Promise<void>;
  feature: AdminHomepageExperienceFeature | null;
  suggestedIcons?: string[];
  isSaving: boolean;
}

export const FeatureFormModal: React.FC<FeatureFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  feature,
  suggestedIcons = SUPPORTED_EXPERIENCE_ICONS,
  isSaving,
}) => {
  const isEditing = Boolean(feature);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (feature) {
        setTitle(feature.title || '');
        setDescription(feature.description || '');
        setIcon(feature.icon || 'sparkles');
        setIsActive(feature.isActive ?? true);
      } else {
        setTitle('');
        setDescription('');
        setIcon('sparkles');
        setIsActive(true);
      }
      setError(null);
    }
  }, [isOpen, feature]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError('Feature title is required.');
      return;
    }

    if (cleanTitle.length > 80) {
      setError('Title cannot exceed 80 characters.');
      return;
    }

    if (description.length > 200) {
      setError('Description cannot exceed 200 characters.');
      return;
    }

    const cleanIcon = (icon.trim() || 'sparkles').toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      await onSave({
        title: cleanTitle,
        description: description.trim(),
        icon: cleanIcon,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save feature.');
    }
  };

  const iconsToDisplay = suggestedIcons.length > 0 ? suggestedIcons : SUPPORTED_EXPERIENCE_ICONS;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 text-[#561C08] flex items-center justify-center shadow-xs">
              <ExperienceIcon name={icon} size={20} />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold uppercase tracking-wider text-stone-900">
                {isEditing ? 'Edit Feature Highlight' : 'Add Feature Highlight'}
              </h3>
              <p className="text-xs text-stone-500 font-sans">
                {isEditing ? 'Update highlight title, copy, and icon' : 'Add a luxury boutique highlight to the storefront'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans rounded-xl">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
                Feature Title <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-mono ${title.length > 80 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
                {title.length}/80
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. WARM LUXURY"
              className="w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border border-stone-200 rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08]"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
                Description
              </label>
              <span className={`text-[11px] font-mono ${description.length > 200 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
                {description.length}/200
              </span>
            </div>
            <textarea
              rows={2}
              value={description}
              maxLength={200}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Handcrafted styles for every you"
              className="w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border border-stone-200 rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] resize-none leading-relaxed"
            />
          </div>

          {/* Icon Picker Grid */}
          <div className="space-y-2">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700 block">
              Icon Symbol
            </label>
            <div className="grid grid-cols-7 gap-2 p-3 bg-stone-50 border border-stone-200/80 rounded-2xl max-h-40 overflow-y-auto">
              {iconsToDisplay.map((iconName: string) => {
                const isSelected = icon.toLowerCase() === iconName.toLowerCase();
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all p-1.5 relative ${
                      isSelected
                        ? 'bg-[#561C08] text-white shadow-xs scale-105'
                        : 'bg-white text-stone-700 border border-stone-200/60 hover:border-stone-400'
                    }`}
                    title={iconName}
                  >
                    <ExperienceIcon name={iconName} size={18} />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center text-[8px] text-stone-900 font-bold">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active status */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#561C08] relative" />
              <span className="text-xs font-sans font-medium text-stone-700">
                Visible to customers (Active)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-sans font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider bg-[#561C08] hover:bg-[#3D1406] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Feature' : 'Add Feature'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
