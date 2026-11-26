import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Globe,
  EyeOff,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useShop } from '../../../../context/ShopContext';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import type {
  AdminHomepageExperience,
  AdminHomepageExperienceMedia,
  AdminHomepageExperienceFeature,
  HomepageExperienceCTA,
  HomepageExperienceOptions,
  UpdateHomepageExperienceDTO,
  CreateHomepageExperienceDTO,
} from '../../../../types/homepageExperience';
import {
  getAdminExperienceOptions,
  getAdminHomepageExperience,
  createAdminHomepageExperience,
  updateAdminHomepageExperience,
  updateAdminExperienceStatus,
  deleteAdminHomepageExperience,
  formatExperienceErrorMessage,
} from '../../../../service/adminHomepageExperience';
import { EmptyState } from './components/EmptyState';
import { GeneralSettings } from './components/GeneralSettings';
import { CTASettings } from './components/CTASettings';
import { MediaManagement } from './components/MediaManagement';
import { FeatureManagement } from './components/FeatureManagement';

export const HomepageExperiencePage: React.FC = () => {
  const { can } = usePermissions();
  const { showToast } = useShop();

  // Fine-grained permission checks matching Phase 9
  const canView = can('cms_store_content', 'view') || can('cms', 'view');
  const canCreate = can('cms_store_content', 'create') || can('cms', 'create');
  const canEdit = can('cms_store_content', 'edit') || can('cms', 'edit');
  const canPublish = can('cms_store_content', 'publish') || can('cms', 'publish');
  const canDelete = can('cms_store_content', 'delete') || can('cms', 'delete');

  // Page state
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const [section, setSection] = useState<AdminHomepageExperience | null>(null);
  const [options, setOptions] = useState<HomepageExperienceOptions | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  // Form State
  const [sectionName, setSectionName] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [altText, setAltText] = useState<string>('');
  const [cta, setCta] = useState<HomepageExperienceCTA>({
    label: 'OUR STORY',
    link: '/about',
    isEnabled: true,
    openInNewTab: false,
  });

  // Action Loading states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Sync state with fetched section data
  const syncFormWithSection = useCallback((sec: AdminHomepageExperience | null) => {
    setSection(sec);
    if (sec) {
      setSectionName(sec.sectionName || '');
      setSubtitle(sec.subtitle || '');
      setTitle(sec.title || '');
      setDescription(sec.description || '');
      setAltText(sec.media?.altText || '');
      setCta(
        sec.cta || {
          label: 'OUR STORY',
          link: '/about',
          isEnabled: true,
          openInNewTab: false,
        }
      );
    }
    setFieldErrors({});
  }, []);

  // Initial Fetch: options + current section concurrently
  const loadInitialData = useCallback(async () => {
    setIsLoadingPage(true);
    setPageError(null);
    try {
      const [optsResult, secResult] = await Promise.allSettled([
        getAdminExperienceOptions(),
        getAdminHomepageExperience(),
      ]);

      if (optsResult.status === 'fulfilled') {
        setOptions(optsResult.value);
      } else {
        console.warn('Could not fetch options:', optsResult.reason);
      }

      if (secResult.status === 'fulfilled') {
        syncFormWithSection(secResult.value);
      } else {
        const err = secResult.reason;
        if (err?.response?.status === 404) {
          syncFormWithSection(null);
        } else {
          setPageError(formatExperienceErrorMessage(err, 'Failed to load Homepage Experience.'));
        }
      }
    } catch (err: any) {
      setPageError(formatExperienceErrorMessage(err, 'Failed to load initial data.'));
    } finally {
      setIsLoadingPage(false);
    }
  }, [syncFormWithSection]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Compute Unsaved Changes (Dirty Tracking)
  const isDirty = useMemo(() => {
    if (!section) return false;
    if (sectionName !== (section.sectionName || '')) return true;
    if (subtitle !== (section.subtitle || '')) return true;
    if (title !== (section.title || '')) return true;
    if (description !== (section.description || '')) return true;
    if (altText !== (section.media?.altText || '')) return true;

    const initialCta = section.cta || { label: '', link: '', isEnabled: false, openInNewTab: false };
    if (cta.isEnabled !== initialCta.isEnabled) return true;
    if (cta.label !== initialCta.label) return true;
    if (cta.link !== initialCta.link) return true;
    if (cta.openInNewTab !== initialCta.openInNewTab) return true;

    return false;
  }, [section, sectionName, subtitle, title, description, altText, cta]);

  // Warn before browser unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!sectionName.trim()) {
      errors.sectionName = 'Section name is required.';
    } else if (sectionName.length > 120) {
      errors.sectionName = 'Section name cannot exceed 120 characters.';
    }

    if (!title.trim()) {
      errors.title = 'Main title is required.';
    } else if (title.length > 120) {
      errors.title = 'Title cannot exceed 120 characters.';
    }

    if (subtitle.length > 120) {
      errors.subtitle = 'Subtitle cannot exceed 120 characters.';
    }

    if (description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.';
    }

    if (cta.isEnabled) {
      if (!cta.label.trim()) {
        errors.ctaLabel = 'CTA label is required when CTA is enabled.';
      } else if (cta.label.length > 40) {
        errors.ctaLabel = 'CTA label cannot exceed 40 characters.';
      }

      if (!cta.link.trim()) {
        errors.ctaLink = 'CTA destination link is required when CTA is enabled.';
      } else if (!cta.link.startsWith('/') && !/^https?:\/\//i.test(cta.link)) {
        errors.ctaLink = 'Link must be a relative path (e.g. /about) or valid URL (https://).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Changes Handler (Partial update with only changed fields)
  const handleSaveChanges = async () => {
    if (!section || !canEdit || isSaving) return;

    if (!validateForm()) {
      showToast('Please resolve validation errors before saving.', 'error');
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    try {
      const payload: UpdateHomepageExperienceDTO = {};

      if (sectionName !== section.sectionName) payload.sectionName = sectionName.trim();
      if (subtitle !== section.subtitle) payload.subtitle = subtitle.trim();
      if (title !== section.title) payload.title = title.trim();
      if (description !== section.description) payload.description = description.trim();

      // CTA partial update
      const initialCta = section.cta;
      if (
        cta.isEnabled !== initialCta?.isEnabled ||
        cta.label !== initialCta?.label ||
        cta.link !== initialCta?.link ||
        cta.openInNewTab !== initialCta?.openInNewTab
      ) {
        payload.cta = {
          label: cta.label.trim(),
          link: cta.link.trim(),
          isEnabled: cta.isEnabled,
          openInNewTab: cta.openInNewTab,
        };
      }

      // Alt text update if changed and media exists
      if (section.media && altText !== section.media.altText) {
        payload.media = {
          ...section.media,
          altText: altText.trim(),
        };
      }

      const updated = await updateAdminHomepageExperience(payload);
      syncFormWithSection(updated);
      showToast('Homepage Experience changes saved successfully.', 'success');
    } catch (err: any) {
      const msg = formatExperienceErrorMessage(err, 'Failed to save changes.');
      showToast(msg, 'error');

      // Map backend validation field errors if provided
      if (err?.response?.data?.error?.details) {
        const details = err.response.data.error.details;
        const beErrors: Record<string, string> = {};
        if (Array.isArray(details)) {
          details.forEach((d: any) => {
            if (d.field) beErrors[d.field] = d.message || d.msg;
          });
          setFieldErrors(beErrors);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Publish / Unpublish Handler
  const handleTogglePublish = async () => {
    if (!section || !canPublish || isPublishing) return;

    const nextStatus = !section.isActive;
    setIsPublishing(true);
    try {
      const updated = await updateAdminExperienceStatus(nextStatus);
      syncFormWithSection(updated);
      showToast(
        nextStatus
          ? 'Homepage Experience published! It is now live on the storefront.'
          : 'Homepage Experience unpublished. Section is now hidden from customers.',
        'success'
      );
    } catch (err: any) {
      showToast(formatExperienceErrorMessage(err, 'Failed to update publication status.'), 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete Section Handler
  const handleConfirmDeleteSection = async () => {
    if (!section || !canDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteAdminHomepageExperience();
      syncFormWithSection(null);
      setIsDeleteModalOpen(false);
      showToast('Homepage Experience section deleted.', 'success');
    } catch (err: any) {
      showToast(formatExperienceErrorMessage(err, 'Failed to delete section.'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create Section when empty
  const handleCreateDraftSection = async () => {
    if (!canCreate || isCreating) return;

    setIsCreating(true);
    try {
      const initialPayload: CreateHomepageExperienceDTO = {
        sectionKey: 'allura-experience',
        sectionName: 'The Allura Experience',
        subtitle: 'WEAR YOUR STORY WITH ALLURA',
        title: 'THE ALLURA EXPERIENCE',
        description:
          'A curated destination for modern women who appreciate modesty, timeless elegance, quality and individuality. From everyday essentials to statement pieces, Allura brings you thoughtfully selected fashion for every celebration.',
        cta: {
          label: 'OUR STORY',
          link: '/about',
          isEnabled: true,
          openInNewTab: false,
        },
        features: [
          {
            title: 'WARM LUXURY',
            description: 'Handcrafted styles for every you',
            icon: 'diamond',
            isActive: true,
            sortOrder: 1,
          },
          {
            title: 'PREMIUM FABRICS',
            description: 'Pure georgette, silk & organza',
            icon: 'feather',
            isActive: true,
            sortOrder: 2,
          },
          {
            title: 'MADE FOR YOUR MOMENTS',
            description: 'Modest fashion that feels like you',
            icon: 'heart',
            isActive: true,
            sortOrder: 3,
          },
        ],
      };

      const created = await createAdminHomepageExperience(initialPayload);
      syncFormWithSection(created);
      showToast('Homepage Experience initialized successfully as draft.', 'success');
    } catch (err: any) {
      showToast(formatExperienceErrorMessage(err, 'Failed to initialize section.'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Updates from Child Components
  const handleMediaUpdated = (updatedMedia: AdminHomepageExperienceMedia | null) => {
    if (section) {
      const updated = { ...section, media: updatedMedia };
      setSection(updated);
      setAltText(updatedMedia?.altText || '');
    }
  };

  const handleFeaturesUpdated = (updatedFeatures: AdminHomepageExperienceFeature[]) => {
    if (section) {
      setSection({ ...section, features: updatedFeatures });
    }
  };

  // Permission gate
  if (!canView) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="font-heading text-lg font-bold uppercase text-stone-900">Restricted Access</h2>
          <p className="text-xs text-stone-600 font-sans leading-relaxed">
            You don't have permission to perform this action. View permission (<code className="font-mono bg-stone-100 px-1 py-0.5 rounded">cms_store_content:view</code>) is required.
          </p>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (isLoadingPage) {
    return (
      <div className="p-6 lg:p-10 space-y-8 animate-pulse max-w-7xl mx-auto">
        <div className="h-10 w-72 bg-stone-200 rounded-xl" />
        <div className="h-28 bg-stone-200 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-stone-200 rounded-2xl" />
          <div className="h-64 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error State
  if (pageError) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl mx-auto my-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-heading font-bold text-stone-900">
          Unable to Load Section
        </h2>
        <p className="text-xs text-stone-600 font-sans max-w-md mx-auto">
          {pageError}
        </p>
        <button
          type="button"
          onClick={loadInitialData}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-sans font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
        >
          <RefreshCw size={14} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  // Missing Section Empty State
  if (!section) {
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="text-[11px] font-sans font-medium text-stone-500 uppercase tracking-wider mb-6">
          <span>Customer CRM</span> &nbsp;/&nbsp; <span className="text-stone-900">Homepage Experience</span>
        </div>
        <EmptyState
          onCreate={handleCreateDraftSection}
          isCreating={isCreating}
          canCreate={canCreate}
        />
      </div>
    );
  }

  // Format updated timestamp
  const formattedUpdatedAt = section.updatedAt
    ? new Date(section.updatedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-sans font-medium text-stone-500 uppercase tracking-wider">
            <span>Customer CRM</span>
            <span>/</span>
            <span className="text-stone-900 font-semibold">Homepage Experience</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-heading text-2xl lg:text-3xl font-bold uppercase tracking-wide text-stone-900">
              Homepage Experience
            </h1>
            <StatusBadge
              status={section.isActive ? 'PUBLISHED' : 'DRAFT'}
              size="sm"
            />
          </div>

          <p className="text-xs text-stone-500 font-sans max-w-2xl leading-relaxed">
            Manage the content displayed in the Allura Experience section on your storefront. Showcase brand heritage, artisan highlights, and curated video.
          </p>

          <p className="text-[11px] text-stone-400 font-sans pt-1">
            Last modified: <span className="font-mono text-stone-600">{formattedUpdatedAt}</span>
            {isDirty && (
              <span className="ml-2 font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Unsaved edits pending
              </span>
            )}
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Delete Section */}
          {canDelete && (
            <button
              type="button"
              disabled={isDeleting || isSaving}
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-sans font-medium border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
              title="Delete Section"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Publish / Unpublish */}
          {canPublish && (
            <button
              type="button"
              disabled={isPublishing || isSaving}
              onClick={handleTogglePublish}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50 ${
                section.isActive
                  ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300/80'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              {isPublishing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : section.isActive ? (
                <>
                  <EyeOff size={15} />
                  <span>Unpublish</span>
                </>
              ) : (
                <>
                  <Globe size={15} />
                  <span>Publish Live</span>
                </>
              )}
            </button>
          )}

          {/* Save Changes */}
          <button
            type="button"
            disabled={!isDirty || !canEdit || isSaving}
            onClick={handleSaveChanges}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider bg-[#561C08] hover:bg-[#3D1406] text-white shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 gap-8">
        {/* 1. General Settings */}
        <GeneralSettings
          sectionName={sectionName}
          subtitle={subtitle}
          title={title}
          description={description}
          onChange={(field, val) => {
            if (field === 'sectionName') setSectionName(val);
            if (field === 'subtitle') setSubtitle(val);
            if (field === 'title') setTitle(val);
            if (field === 'description') setDescription(val);
          }}
          canEdit={canEdit}
          errors={fieldErrors}
        />

        {/* 2. Media Management */}
        <MediaManagement
          media={section.media}
          options={options}
          canEdit={canEdit}
          onMediaUpdated={handleMediaUpdated}
          onAltTextChange={setAltText}
          altText={altText}
        />

        {/* 3. Call To Action Management */}
        <CTASettings
          cta={cta}
          onChange={setCta}
          canEdit={canEdit}
          errors={fieldErrors}
        />

        {/* 4. Feature Highlights CRUD */}
        <FeatureManagement
          features={section.features || []}
          options={options}
          canEdit={canEdit}
          onFeaturesUpdated={handleFeaturesUpdated}
          onReloadRequested={loadInitialData}
        />
      </div>

      {/* Confirmation Modal for Delete Section */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteSection}
        title="Delete Homepage Experience Section?"
        message="This deletes the section and its uploaded media. This cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Section'}
        isDestructive
      />
    </div>
  );
};
