import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  AdminHomepageExperienceFeature,
  CreateFeatureDTO,
  UpdateFeatureDTO,
  HomepageExperienceOptions,
} from '../../../../../types/homepageExperience';
import {
  createAdminExperienceFeature,
  updateAdminExperienceFeature,
  updateAdminExperienceFeatureStatus,
  deleteAdminExperienceFeature,
  reorderAdminExperienceFeatures,
  formatExperienceErrorMessage,
} from '../../../../../service/adminHomepageExperience';
import { ExperienceIcon } from '../../../../../components/common/ExperienceIcon';
import { ConfirmModal } from '../../../../../components/common/ConfirmModal';
import { FeatureFormModal } from './FeatureFormModal';

interface FeatureManagementProps {
  features: AdminHomepageExperienceFeature[];
  options: HomepageExperienceOptions | null;
  canEdit: boolean;
  onFeaturesUpdated: (features: AdminHomepageExperienceFeature[]) => void;
  onReloadRequested: () => Promise<void>;
}

export const FeatureManagement: React.FC<FeatureManagementProps> = ({
  features,
  options,
  canEdit,
  onFeaturesUpdated,
  onReloadRequested,
}) => {
  const maxFeatures = options?.maxFeatures || 12;
  const isAtLimit = features.length >= maxFeatures;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<AdminHomepageExperienceFeature | null>(null);
  const [isSavingFeature, setIsSavingFeature] = useState(false);

  const [featureToDelete, setFeatureToDelete] = useState<AdminHomepageExperienceFeature | null>(null);
  const [isDeletingFeature, setIsDeletingFeature] = useState(false);

  const [reordering, setReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Open modal for adding
  const handleOpenAdd = () => {
    if (isAtLimit) return;
    setEditingFeature(null);
    setIsModalOpen(true);
    setActionError(null);
  };

  // Open modal for editing
  const handleOpenEdit = (feature: AdminHomepageExperienceFeature) => {
    setEditingFeature(feature);
    setIsModalOpen(true);
    setActionError(null);
  };

  // Save (create or update)
  const handleSaveFeature = async (payload: CreateFeatureDTO | UpdateFeatureDTO) => {
    setIsSavingFeature(true);
    setActionError(null);
    try {
      if (editingFeature) {
        const res = await updateAdminExperienceFeature(editingFeature.id, payload);
        onFeaturesUpdated(res.features);
      } else {
        const res = await createAdminExperienceFeature(payload as CreateFeatureDTO);
        onFeaturesUpdated(res.features);
      }
    } catch (err: any) {
      const msg = formatExperienceErrorMessage(err, 'Failed to save feature.');
      setActionError(msg);
      throw new Error(msg);
    } finally {
      setIsSavingFeature(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (feature: AdminHomepageExperienceFeature) => {
    if (!canEdit) return;
    setActionError(null);
    try {
      const res = await updateAdminExperienceFeatureStatus(feature.id, !feature.isActive);
      onFeaturesUpdated(res.features);
    } catch (err: any) {
      setActionError(formatExperienceErrorMessage(err, 'Failed to update feature status.'));
    }
  };

  // Delete feature
  const handleConfirmDelete = async () => {
    if (!featureToDelete) return;
    setIsDeletingFeature(true);
    setActionError(null);
    try {
      const res = await deleteAdminExperienceFeature(featureToDelete.id);
      onFeaturesUpdated(res.features);
      setFeatureToDelete(null);
    } catch (err: any) {
      setActionError(formatExperienceErrorMessage(err, 'Failed to delete feature.'));
    } finally {
      setIsDeletingFeature(false);
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (index: number) => {
    if (!canEdit) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex || !canEdit) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...features];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, movedItem);

    // Optimistically update
    onFeaturesUpdated(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Send payload with 1-based sort orders
    const payload = {
      features: reordered.map((item, idx) => ({
        featureId: item.id,
        sortOrder: idx + 1,
      })),
    };

    setReordering(true);
    setActionError(null);
    try {
      const res = await reorderAdminExperienceFeatures(payload);
      onFeaturesUpdated(res.features);
    } catch (err: any) {
      setActionError(formatExperienceErrorMessage(err, 'Reorder failed. Restoring authoritative order...'));
      // Restore from server
      await onReloadRequested();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-stone-900">
                Feature Highlights
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
                {features.length}/{maxFeatures}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans">
              Display up to {maxFeatures} artisan qualities, fabric highlights, or craftsmanship guarantees.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAtLimit && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-sans">
              Maximum {maxFeatures} reached
            </span>
          )}

          <button
            type="button"
            disabled={!canEdit || isAtLimit}
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-[#561C08] hover:bg-[#3D1406] text-white shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={15} />
            <span>Add Highlight</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {reordering && (
        <div className="flex items-center gap-2 p-2 bg-stone-100 rounded-xl text-xs text-stone-600 font-sans">
          <Loader2 size={14} className="animate-spin text-stone-700" />
          <span>Saving highlight order...</span>
        </div>
      )}

      {/* Feature Items List */}
      {features.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-stone-200 rounded-2xl bg-stone-50/50 space-y-2">
          <Sparkles size={28} className="mx-auto text-stone-300" />
          <p className="text-xs font-sans text-stone-500">No feature highlights added yet.</p>
          {canEdit && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="text-xs font-sans font-semibold text-[#561C08] hover:underline"
            >
              Add your first highlight
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {features.map((feature, index) => {
            const isDragging = draggedIndex === index;
            const isDropTarget = dragOverIndex === index;

            return (
              <div
                key={feature.id || index}
                draggable={canEdit}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(index)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                  isDragging
                    ? 'opacity-40 border-stone-400 bg-stone-100'
                    : isDropTarget
                    ? 'border-[#561C08] bg-amber-50/40 ring-2 ring-[#561C08]/20'
                    : feature.isActive
                    ? 'border-stone-200 bg-white hover:border-stone-300'
                    : 'border-stone-200 bg-stone-100/70 opacity-60'
                }`}
              >
                {/* Drag Handle */}
                {canEdit && (
                  <button
                    type="button"
                    className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 p-1 rounded-md"
                    title="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </button>
                )}

                {/* Sort Order Index */}
                <span className="w-5 text-center text-[11px] font-mono text-stone-400 font-bold">
                  {index + 1}
                </span>

                {/* Icon Preview */}
                <div className="w-9 h-9 rounded-xl bg-stone-100 border border-stone-200/80 text-[#561C08] flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <ExperienceIcon name={feature.icon} size={18} />
                </div>

                {/* Title & Description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-heading text-xs font-bold uppercase tracking-wide text-stone-900 truncate">
                      {feature.title}
                    </h4>
                    {!feature.isActive && (
                      <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-md bg-stone-200 text-stone-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {feature.description && (
                    <p className="text-xs text-stone-500 font-sans truncate mt-0.5">
                      {feature.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Status toggle */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleStatus(feature)}
                    className={`p-2 rounded-xl transition-colors ${
                      feature.isActive
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-stone-400 hover:bg-stone-200'
                    }`}
                    title={feature.isActive ? 'Active on storefront (Click to hide)' : 'Hidden (Click to activate)'}
                  >
                    {feature.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleOpenEdit(feature)}
                    className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                    title="Edit Feature"
                  >
                    <Edit2 size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setFeatureToDelete(feature)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Feature"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Add/Edit Modal */}
      <FeatureFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFeature}
        feature={editingFeature}
        suggestedIcons={options?.suggestedIcons}
        isSaving={isSavingFeature}
      />

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={Boolean(featureToDelete)}
        onClose={() => setFeatureToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Feature Highlight?"
        message={`Are you sure you want to permanently delete "${featureToDelete?.title}"? This cannot be undone.`}
        confirmLabel={isDeletingFeature ? 'Deleting...' : 'Delete Feature'}
        isDestructive
      />
    </div>
  );
};
