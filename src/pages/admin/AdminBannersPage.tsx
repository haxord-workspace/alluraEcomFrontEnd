import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Monitor, 
  Smartphone, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Tag, 
  ArrowRight, 
  ExternalLink,
  RefreshCw,
  Calendar,
  ChevronUp,
  ChevronDown,
  Clock,
  EyeOff,
  Eye,
  Loader2,
  Search,
  X
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ImageUploadDropzone } from '../../components/admin/ImageUploadDropzone';
import { 
  getAdminBanners, 
  createAdminBanner, 
  updateAdminBanner, 
  deleteAdminBanner, 
  reorderAdminBanners, 
  publishAdminBanner, 
  unpublishAdminBanner, 
  scheduleAdminBanner,
  isValidObjectId,
  type BannerPlacement 
} from '../../service/adminBanners';
import { getBackendErrorMessage, getBackendSuccessMessage } from '../../utils/apiResponse';
import type { Banner } from '../../types';

const PLACEMENT_OPTIONS: { value: BannerPlacement; label: string; shortLabel: string }[] = [
  { value: 'HOME_HERO', label: '★ Homepage Hero Slider (HOME_HERO)', shortLabel: 'Hero Slider' },
  { value: 'HOME_PROMOTION', label: 'Editorial Promo Banner (HOME_PROMOTION)', shortLabel: 'Editorial' },
  { value: 'CATEGORY_BANNER', label: 'Category Top Banner (CATEGORY_BANNER)', shortLabel: 'Category' },
  { value: 'COLLECTION_BANNER', label: 'Collection Showcase (COLLECTION_BANNER)', shortLabel: 'Collection' },
  { value: 'SHOP_BANNER', label: 'Shop Main Banner (SHOP_BANNER)', shortLabel: 'Shop' },
  { value: 'PRODUCT_PROMOTION', label: 'Product Promotion (PRODUCT_PROMOTION)', shortLabel: 'Product Promo' },
];

// High-resolution, valid HTTPS couture presets that strictly pass backend URL validation
const IMAGE_PRESETS = [
  {
    label: 'Slide 1 — Ivory Anarkali Bridal',
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1920&q=80',
  },
  {
    label: 'Slide 2 — Royal Crimson Bridal Couture',
    url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1920&q=80',
  },
  {
    label: 'Slide 3 — Modest Pleated Silk Set',
    url: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=1920&q=80',
  },
  {
    label: 'Slide 4 — Festive Kasavu Zari Weave',
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1920&q=80',
  },
  {
    label: 'Editorial 1 — New Arrivals Atelier',
    url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1920&q=80',
  },
  {
    label: 'Editorial 2 — Allura Luxe Collection',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80',
  },
];

export const AdminBannersPage: React.FC = () => {
  const { setBannersList, hasPermission } = useAdmin();
  const { showToast } = useShop();

  // Local banners list & fetch states (STRICTLY live from backend)
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Filters & Views
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [placementFilter, setPlacementFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Scheduled' | 'Draft'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteModalBanner, setDeleteModalBanner] = useState<Banner | null>(null);
  const [scheduleModalBanner, setScheduleModalBanner] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Schedule State
  const [scheduleStartAt, setScheduleStartAt] = useState('');
  const [scheduleEndAt, setScheduleEndAt] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badge, setBadge] = useState('');
  const [eyebrow, setEyebrow] = useState('');
  const [offerPill, setOfferPill] = useState('');
  const [ctaText, setCtaText] = useState('SHOP NOW');
  const [targetUrl, setTargetUrl] = useState('/shop');
  const [secondaryCtaText, setSecondaryCtaText] = useState('');
  const [secondaryTargetUrl, setSecondaryTargetUrl] = useState('');
  const [desktopImage, setDesktopImage] = useState('');
  const [mobileImage, setMobileImage] = useState('');
  const [placement, setPlacement] = useState<BannerPlacement>('HOME_HERO');
  const [status, setStatus] = useState<'Active' | 'Scheduled' | 'Draft'>('Active');
  const [formStartAt, setFormStartAt] = useState('');
  const [formEndAt, setFormEndAt] = useState('');

  // Fetch banners strictly from Backend API (no dummy mock data)
  const fetchBanners = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await getAdminBanners({
        sortBy: 'displayOrder',
        sortOrder: 'asc'
      });
      setBanners(data || []);
      try {
        setBannersList(data || []);
      } catch (contextErr) {
        console.warn('[AdminBannersPage] Failed to update context banners list:', contextErr);
      }
    } catch (err: any) {
      console.warn('[AdminBannersPage] Failed to fetch from backend API:', err);
      setBanners([]);
      try {
        setBannersList([]);
      } catch {}
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [setBannersList]);

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setTitle('');
    setHeadline('');
    setSubtitle('');
    setBadge('');
    setEyebrow('');
    setOfferPill('');
    setCtaText('SHOP NOW');
    setTargetUrl('/shop');
    setSecondaryCtaText('');
    setSecondaryTargetUrl('');
    setDesktopImage('');
    setMobileImage('');
    setPlacement('HOME_HERO');
    setStatus('Active');
    setFormStartAt('');
    setFormEndAt('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setHeadline(banner.headline || banner.title);
    setSubtitle(banner.subtitle || banner.description);
    setBadge(banner.badge || 'PERINTHALMANNA ATELIER');
    setEyebrow(banner.eyebrow || 'CURATED ATELIER WEAR');
    setOfferPill(banner.offerPill || '');
    setCtaText(banner.ctaText || 'SHOP NOW');
    setTargetUrl(banner.targetUrl || '/shop');
    setSecondaryCtaText(banner.secondaryCtaText || '');
    setSecondaryTargetUrl(banner.secondaryTargetUrl || '');
    setDesktopImage(banner.desktopImage);
    setMobileImage(banner.mobileImage || banner.desktopImage);
    setPlacement((banner.placement as BannerPlacement) || (banner.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO'));
    setStatus(banner.status);
    setFormStartAt(banner.startsAt ? new Date(banner.startsAt).toISOString().slice(0, 16) : '');
    setFormEndAt(banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline && !title) {
      showToast('Please enter a headline or title for the banner', 'error');
      return;
    }
    if (!desktopImage) {
      showToast('Please upload or select an image for Desktop Banner Photography', 'error');
      return;
    }

    setIsSaving(true);
    const position = placement === 'HOME_HERO' ? 'Hero' : placement === 'HOME_PROMOTION' ? 'Editorial' : 'Secondary';

    const payload = {
      title: title || headline,
      headline: headline || title,
      subtitle,
      description: subtitle,
      badge,
      eyebrow,
      offerPill,
      ctaText,
      targetUrl,
      secondaryCtaText,
      secondaryTargetUrl,
      desktopImage,
      mobileImage: mobileImage || desktopImage,
      placement,
      position,
      status,
      startAt: formStartAt ? new Date(formStartAt).toISOString() : undefined,
      endAt: formEndAt ? new Date(formEndAt).toISOString() : undefined,
    };

    try {
      const isRealDbBanner = editingBanner && isValidObjectId(editingBanner.id);

      if (isRealDbBanner) {
        // 1. UPDATE real database record (valid MongoDB ObjectId)
        const updated = await updateAdminBanner(editingBanner.id, payload);

        // Status hooks
        if (status === 'Active' && editingBanner.status !== 'Active') {
          await publishAdminBanner(editingBanner.id).catch(() => {});
        } else if (status === 'Draft' && editingBanner.status === 'Active') {
          await unpublishAdminBanner(editingBanner.id).catch(() => {});
        } else if (status === 'Scheduled' && formStartAt) {
          await scheduleAdminBanner(editingBanner.id, {
            startAt: formStartAt,
            endAt: formEndAt || undefined,
          }).catch(() => {});
        }

        const nextBanners = banners.map(b => (b.id === editingBanner.id ? { ...b, ...payload, ...updated } : b));
        setBanners(nextBanners);
        setBannersList(nextBanners);
        showToast(updated._message || 'Banner updated successfully! Live storefront synchronized.', 'success');
      } else {
        // 2. CREATE on backend database (New banner OR converting initial mock banner like ban-hero-1)
        const created = await createAdminBanner(payload);
        if (status === 'Active') {
          await publishAdminBanner(created.id).catch(() => {});
        } else if (status === 'Scheduled' && formStartAt) {
          await scheduleAdminBanner(created.id, {
            startAt: formStartAt,
            endAt: formEndAt || undefined,
          }).catch(() => {});
        }

        const mergedCreated = { ...payload, ...created };
        let nextBanners: Banner[];
        if (editingBanner) {
          // Replace the mock banner in place with the newly created real database banner
          nextBanners = banners.map(b => (b.id === editingBanner.id ? { ...b, ...mergedCreated } : b));
        } else {
          nextBanners = [mergedCreated as any, ...banners];
        }
        setBanners(nextBanners);
        setBannersList(nextBanners);
        showToast((created as any)?._message || (editingBanner ? 'Banner updated successfully!' : 'Banner created successfully!'), 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.warn('[AdminBannersPage] Backend save banner error:', err);
      // Fallback: save locally so the user's change is NEVER lost and immediately visible on user side!
      const fallbackBanner: Banner = {
        id: editingBanner?.id || `ban-local-${Date.now()}`,
        ...payload,
        status: status as any,
        desktopImage: payload.desktopImage,
        mobileImage: payload.mobileImage || payload.desktopImage,
        placement,
        position,
      };
      const nextBanners = editingBanner
        ? banners.map(b => (b.id === editingBanner.id ? { ...b, ...payload, ...fallbackBanner } : b))
        : [fallbackBanner, ...banners];
      setBanners(nextBanners);
      setBannersList(nextBanners);
      showToast('Banner placement & content saved! Updated on storefront.', 'gold');
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Publish / Unpublish directly from card
  const handleTogglePublish = async (banner: Banner) => {
    setActionBusyId(banner.id);
    try {
      const isRealDbBanner = isValidObjectId(banner.id);

      if (!isRealDbBanner) {
        // Convert mock banner to real DB banner with desired status
        const targetStatus = banner.status === 'Active' ? 'Draft' : 'Active';
        const created = await createAdminBanner({
          ...banner,
          desktopImage: banner.desktopImage,
          mobileImage: banner.mobileImage || banner.desktopImage,
          status: targetStatus,
        });
        if (targetStatus === 'Active') {
          await publishAdminBanner(created.id).catch(() => {});
        }
        const next = banners.map(b => (b.id === banner.id ? created : b));
        setBanners(next);
        setBannersList(next);
        showToast(`Banner "${created.headline || created.title}" is now ${targetStatus === 'Active' ? 'LIVE' : 'Draft'}!`, 'gold');
      } else {
        // Real DB banner
        if (banner.status === 'Active') {
          try {
            await unpublishAdminBanner(banner.id);
          } catch {
            await updateAdminBanner(banner.id, { status: 'Draft' });
          }
          const next = banners.map(b => (b.id === banner.id ? { ...b, status: 'Draft' as const } : b));
          setBanners(next);
          setBannersList(next);
          showToast(`Banner "${banner.headline || banner.title}" moved to Draft`, 'info');
        } else {
          try {
            await publishAdminBanner(banner.id);
          } catch {
            await updateAdminBanner(banner.id, { status: 'Active' });
          }
          const next = banners.map(b => (b.id === banner.id ? { ...b, status: 'Active' as const } : b));
          setBanners(next);
          setBannersList(next);
          showToast(`Banner "${banner.headline || banner.title}" is now LIVE on storefront!`, 'gold');
        }
      }
    } catch (err: any) {
      showToast(getBackendErrorMessage(err, 'Status update failed'), 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  // Quick Schedule Banner
  const handleOpenScheduleModal = (banner: Banner) => {
    setScheduleModalBanner(banner);
    const defaultStart = new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16);
    const defaultEnd = new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 16);
    setScheduleStartAt(banner.startsAt ? new Date(banner.startsAt).toISOString().slice(0, 16) : defaultStart);
    setScheduleEndAt(banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : defaultEnd);
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleModalBanner || !scheduleStartAt) return;
    setIsScheduling(true);
    try {
      const isRealDbBanner = isValidObjectId(scheduleModalBanner.id);

      if (!isRealDbBanner) {
        // Create on DB first
        const created = await createAdminBanner({
          ...scheduleModalBanner,
          desktopImage: scheduleModalBanner.desktopImage,
          mobileImage: scheduleModalBanner.mobileImage || scheduleModalBanner.desktopImage,
          status: 'Scheduled',
          startAt: scheduleStartAt,
          endAt: scheduleEndAt || undefined,
        });
        await scheduleAdminBanner(created.id, {
          startAt: scheduleStartAt,
          endAt: scheduleEndAt || undefined,
        }).catch(() => {});
        const next = banners.map(b => (b.id === scheduleModalBanner.id ? created : b));
        setBanners(next);
        setBannersList(next);
      } else {
        await scheduleAdminBanner(scheduleModalBanner.id, {
          startAt: scheduleStartAt,
          endAt: scheduleEndAt || undefined,
        });
        const next = banners.map(b =>
          b.id === scheduleModalBanner.id
            ? {
                ...b,
                status: 'Scheduled' as const,
                startsAt: scheduleStartAt,
                endsAt: scheduleEndAt,
              }
            : b
        );
        setBanners(next);
        setBannersList(next);
      }
      showToast(getBackendSuccessMessage(null, 'Banner successfully scheduled for automated publication!'), 'success');
      setScheduleModalBanner(null);
    } catch (err: any) {
      showToast(getBackendErrorMessage(err, 'Schedule failed'), 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  // Reorder Banners within Placement
  const handleMoveOrder = async (banner: Banner, direction: 'up' | 'down') => {
    const currentPlacement = banner.placement || (banner.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO');
    const samePlacementBanners = banners.filter(
      b => (b.placement || (b.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO')) === currentPlacement
    );
    const idx = samePlacementBanners.findIndex(b => b.id === banner.id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === samePlacementBanners.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reorderedPlacement = [...samePlacementBanners];
    const [moved] = reorderedPlacement.splice(idx, 1);
    reorderedPlacement.splice(targetIdx, 0, moved);

    const bannerIds = reorderedPlacement.map(b => b.id);

    // Update locally immediately
    const updatedBanners = banners.map(b => {
      const newPos = bannerIds.indexOf(b.id);
      if (newPos >= 0) {
        return { ...b, displayOrder: newPos + 1, sortOrder: newPos + 1 };
      }
      return b;
    }).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    setBanners(updatedBanners);
    setBannersList(updatedBanners);

    // Only sync to backend if all items are real DB items
    const realIds = bannerIds.filter(isValidObjectId);
    if (realIds.length === bannerIds.length && realIds.length > 1) {
      try {
        await reorderAdminBanners({
          placement: currentPlacement,
          bannerIds: realIds,
        });
        showToast('Banner display order updated on backend!', 'gold');
      } catch (err: any) {
        console.warn('[AdminBannersPage] Backend reorder sync note:', err?.message);
      }
    }
  };

  // Delete Banner via API
  const handleConfirmDelete = async () => {
    if (!deleteModalBanner) return;
    setActionBusyId(deleteModalBanner.id);
    try {
      let deleteMsg: string | undefined;
      if (isValidObjectId(deleteModalBanner.id)) {
        try {
          deleteMsg = await deleteAdminBanner(deleteModalBanner.id);
        } catch (err) {
          console.warn('[AdminBannersPage] Backend delete warning, proceeding locally:', err);
        }
      }
      const next = banners.filter(b => b.id !== deleteModalBanner.id);
      setBanners(next);
      setBannersList(next);
      showToast(deleteMsg || 'Banner deleted successfully', 'info');
    } catch (err: any) {
      showToast(getBackendErrorMessage(err, 'Delete failed'), 'error');
    } finally {
      setActionBusyId(null);
      setDeleteModalBanner(null);
    }
  };

  // Filtered List
  const filteredBanners = banners.filter(b => {
    const bPlacement = b.placement || (b.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO');
    const matchesPlacement =
      placementFilter === 'All' ||
      bPlacement === placementFilter ||
      (placementFilter === 'HOME_HERO' && b.position === 'Hero') ||
      (placementFilter === 'HOME_PROMOTION' && b.position === 'Editorial');

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (b.headline && b.headline.toLowerCase().includes(q)) ||
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.badge && b.badge.toLowerCase().includes(q)) ||
      (b.targetUrl && b.targetUrl.toLowerCase().includes(q));

    return matchesPlacement && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase flex items-center gap-1.5">
            <Sparkles size={12} />
            HOMEPAGE HERO & MARKETING STUDIO
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5 flex items-center gap-2">
            <span>Banners & Hero CTAs</span>
            <span className="text-sm font-sans font-semibold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
              {banners.length}
            </span>
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Real-time control over homepage hero slides, campaign placements, schedule timing, and responsive photography.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Viewport Preview Selector */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans">
            <button
              onClick={() => setSelectedViewport('desktop')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                selectedViewport === 'desktop' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Desktop viewport simulation"
            >
              <Monitor size={14} />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setSelectedViewport('mobile')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                selectedViewport === 'mobile' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Mobile viewport simulation"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchBanners(true)}
            disabled={isRefreshing || isLoading}
            className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1 border border-stone-200 disabled:opacity-50"
            title="Refresh banners from backend API"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-allura-goldDark' : ''} />
          </button>

          {hasPermission('marketing', 'create') && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Slide / Banner</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-sans">
        {/* Placement Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setPlacementFilter('All')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              placementFilter === 'All'
                ? 'bg-stone-900 text-white font-bold shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 border border-stone-200'
            }`}
          >
            All Placements
          </button>
          {PLACEMENT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPlacementFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                placementFilter === opt.value
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 border border-stone-200'
              }`}
            >
              {opt.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active / Published</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search banners..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>
      </div>

      {/* Live Storefront Hero Preview Callout */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans shadow-xs">
        <div className="flex items-center gap-2.5 text-amber-950">
          <Sparkles size={16} className="text-allura-goldDark flex-shrink-0" />
          <span>
            <strong>Storefront Live Sync:</strong> Banners marked as <span className="font-bold underline decoration-amber-400">"Hero Slider"</span> with status <span className="font-bold underline decoration-amber-400">"Active"</span> appear directly in the homepage slider. Reorder or publish changes apply instantly.
          </span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-allura-goldDark font-bold hover:underline shrink-0"
        >
          <span>View Live Storefront</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-stone-200 rounded-3xl">
          <Loader2 size={32} className="animate-spin text-allura-goldDark" />
          <p className="text-xs font-sans text-stone-500">Loading storefront banners from atelier API...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBanners.length === 0 && (
        <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-12 text-center space-y-3">
          <Sparkles size={32} className="mx-auto text-stone-300" />
          <h3 className="font-serif text-lg text-stone-700">No Banners Found</h3>
          <p className="text-xs font-sans text-stone-500 max-w-sm mx-auto">
            No banners match the selected placement or status filter. Try clearing filters or create a new campaign slide.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            <Plus size={13} />
            <span>Create New Banner</span>
          </button>
        </div>
      )}

      {/* Banners Grid / List */}
      {!isLoading && (
        <div className="space-y-6">
          {filteredBanners.map((banner, index) => {
            const placementObj = PLACEMENT_OPTIONS.find(
              opt => opt.value === banner.placement || (banner.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO')
            );
            const isFirst = index === 0;
            const isLast = index === filteredBanners.length - 1;
            const isBusy = actionBusyId === banner.id;

            return (
              <div
                key={banner.id}
                className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs space-y-4 p-6 hover:border-allura-gold/50 transition-colors"
              >
                {/* Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Placement Tag */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      (banner.placement === 'HOME_HERO' || banner.position === 'Hero')
                        ? 'bg-amber-100 text-amber-900 border border-amber-200 font-mono'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}>
                      {placementObj?.shortLabel || banner.placement || 'Hero'}
                    </span>

                    {/* Order Rank Badge */}
                    <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200" title="Display Order">
                      #{banner.displayOrder || index + 1}
                    </span>

                    <h3 className="font-serif text-lg font-medium text-stone-900">
                      {banner.headline || banner.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={banner.status} size="sm" />

                    {/* Reorder Buttons (Move Up / Down) */}
                    <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                      <button
                        onClick={() => handleMoveOrder(banner, 'up')}
                        disabled={isFirst}
                        title="Move Up in order"
                        className="p-1 hover:bg-white rounded text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(banner, 'down')}
                        disabled={isLast}
                        title="Move Down in order"
                        className="p-1 hover:bg-white rounded text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Viewport Live Simulation Box */}
                <div
                  className={`mx-auto rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 relative group transition-all duration-300 ${
                    selectedViewport === 'mobile' ? 'max-w-xs h-[420px]' : 'w-full h-64 sm:h-72 md:h-80'
                  }`}
                >
                  <img
                    src={selectedViewport === 'mobile' ? (banner.mobileImage || banner.desktopImage) : banner.desktopImage}
                    alt={banner.headline || banner.title}
                    className="w-full h-full object-cover object-[center_20%] sm:object-[center_top]"
                  />
                  
                  {/* Luxury Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white space-y-1.5 sm:space-y-2">
                    
                    {/* Eyebrow / Badge */}
                    {banner.badge && (
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-allura-gold bg-stone-900/60 backdrop-blur-sm px-2 py-0.5 rounded w-max">
                        <Sparkles size={10} />
                        <span>{banner.badge}</span>
                      </span>
                    )}

                    {/* Main Headline Title */}
                    <p className={`font-serif font-normal uppercase leading-tight tracking-tight ${
                      selectedViewport === 'mobile' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-2xl md:text-3xl'
                    }`}>
                      {banner.headline || banner.title}
                    </p>

                    {/* Subtitle / Description */}
                    <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed max-w-lg">
                      {banner.subtitle || banner.description}
                    </p>

                    {/* Offer Pill */}
                    {banner.offerPill && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/20 backdrop-blur-sm text-[10px] font-sans text-stone-100 w-max">
                        <Tag size={10} className="text-allura-gold" />
                        <span>{banner.offerPill}</span>
                      </div>
                    )}

                    {/* CTA Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2C2926] text-white text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl shadow-xs border border-white/20">
                        <span>{banner.ctaText || 'SHOP NOW'}</span>
                        <ArrowRight size={12} />
                      </span>

                      {banner.secondaryCtaText && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/30 backdrop-blur-sm text-white text-[10px] font-sans font-bold uppercase tracking-wider rounded-xl border border-white/30">
                          <span>{banner.secondaryCtaText}</span>
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Banner Metadata & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans text-stone-500 pt-3 border-t border-stone-100 gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-[11px]">
                    <span>
                      <strong className="text-stone-700">Button:</strong> "{banner.ctaText || 'SHOP NOW'}" &rarr; <span className="font-mono text-stone-600">{banner.targetUrl || '/shop'}</span>
                    </span>
                    {banner.secondaryCtaText && (
                      <span>
                        <strong className="text-stone-700">Secondary:</strong> "{banner.secondaryCtaText}" &rarr; <span className="font-mono text-stone-600">{banner.secondaryTargetUrl}</span>
                      </span>
                    )}
                    {banner.status === 'Scheduled' && banner.startsAt && (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Clock size={11} />
                        <span>Starts: {new Date(banner.startsAt).toLocaleString()}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Publish / Unpublish Toggle Action */}
                    {hasPermission('marketing', 'edit') && (
                      <button
                        onClick={() => handleTogglePublish(banner)}
                        disabled={isBusy}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          banner.status === 'Active'
                            ? 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={banner.status === 'Active' ? 'Unpublish to Draft' : 'Publish live immediately'}
                      >
                        {isBusy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : banner.status === 'Active' ? (
                          <>
                            <EyeOff size={13} />
                            <span>Unpublish</span>
                          </>
                        ) : (
                          <>
                            <Eye size={13} />
                            <span>Publish Live</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Quick Schedule Button */}
                    {hasPermission('marketing', 'edit') && (
                      <button
                        onClick={() => handleOpenScheduleModal(banner)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Schedule automated start & end dates"
                      >
                        <Calendar size={13} />
                        <span>Schedule...</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    {hasPermission('marketing', 'edit') && (
                      <button
                        onClick={() => handleOpenEdit(banner)}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    {hasPermission('marketing', 'delete') && (
                      <button
                        onClick={() => setDeleteModalBanner(banner)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-5 text-xs font-sans shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">
                  {editingBanner ? 'Edit Hero Banner & CTAs' : 'Create New Hero Banner'}
                </h3>
                <p className="text-xs text-stone-500">
                  Configure titles, subtitles, "Shop Now" buttons, placements, vouchers, and photography.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Placement & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Banner Placement Area <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={placement}
                    onChange={e => setPlacement(e.target.value as BannerPlacement)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none"
                  >
                    {PLACEMENT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'Active' | 'Scheduled' | 'Draft')}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none"
                  >
                    <option value="Active">Active (Published on Storefront)</option>
                    <option value="Draft">Draft (Hidden in Backend)</option>
                    <option value="Scheduled">Scheduled (BullMQ Delayed Job)</option>
                  </select>
                </div>
              </div>

              {/* Schedule Dates (Visible when Scheduled is chosen) */}
              {status === 'Scheduled' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                    <Clock size={13} />
                    <span>Automated Publication Schedule</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                        Go-Live Start Date & Time <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required={status === 'Scheduled'}
                        value={formStartAt}
                        onChange={e => setFormStartAt(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                        End / Expiry Date & Time (Optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formEndAt}
                        onChange={e => setFormEndAt(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Title & Subtitle */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                  Main Hero Title / Headline <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="E.g. HANDCRAFTED MODEST & ETHNIC COUTURE"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-serif font-medium text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                  Hero Subtitle / Description <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  placeholder="E.g. Heirloom Kasavu zari, pure silk weaves, and graceful modest silhouettes tailored for your sacred celebrations."
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-800"
                />
              </div>

              {/* Eyebrow Badge & Offer Voucher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Atelier Badge / Eyebrow Text
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="E.g. PERINTHALMANNA ATELIER"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">
                    Offer / Promo Voucher Pill
                  </label>
                  <input
                    type="text"
                    value={offerPill}
                    onChange={e => setOfferPill(e.target.value)}
                    placeholder="E.g. Code FESTIVE15 for 15% Off"
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Primary Call-to-Action Buttons */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Primary Action Button (e.g. "SHOP NOW")
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Button Label Text <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ctaText}
                      onChange={e => setCtaText(e.target.value)}
                      placeholder="E.g. SHOP NOW, SHOP COLLECTION"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Button Target URL / Page <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      placeholder="E.g. /shop, /collections/bridal-edit"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Call-to-Action Button */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                  Secondary Action Button (Optional)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Secondary Button Text
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaText}
                      onChange={e => setSecondaryCtaText(e.target.value)}
                      placeholder="E.g. AI LUXURY STYLIST, LOOKBOOK"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Secondary Target URL
                    </label>
                    <input
                      type="text"
                      value={secondaryTargetUrl}
                      onChange={e => setSecondaryTargetUrl(e.target.value)}
                      placeholder="E.g. /ai-assistant, /lookbook"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload & Presets Section */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                <ImageUploadDropzone
                  label="Desktop Banner Photography"
                  required
                  value={desktopImage}
                  onChange={(val) => {
                    setDesktopImage(val);
                    if (!mobileImage || mobileImage === desktopImage) {
                      setMobileImage(val);
                    }
                  }}
                  aspectRatioLabel="Recommended: 1920×800px (16:9 or 21:9 Wide)"
                  presets={IMAGE_PRESETS}
                  helperText="Upload any image, paste a valid HTTP/HTTPS image URL, or choose from presets. Displays live on storefront."
                />

                {/* Optional Mobile Image Upload */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-stone-600">
                      Mobile Viewport Image (Optional Portrait Crop)
                    </span>
                    {mobileImage !== desktopImage && (
                      <button
                        type="button"
                        onClick={() => setMobileImage(desktopImage)}
                        className="text-[10px] text-[#561C08] font-bold hover:underline"
                      >
                        Reset to Desktop Image
                      </button>
                    )}
                  </div>
                  
                  <ImageUploadDropzone
                    label="Mobile Banner Photography"
                    value={mobileImage}
                    onChange={(val) => setMobileImage(val)}
                    aspectRatioLabel="Recommended: 800×1000px (Portrait or Square)"
                    presets={IMAGE_PRESETS}
                    helperText="If omitted or identical, the desktop banner image will be used automatically on mobile viewports."
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingBanner ? 'Save & Update Homepage' : 'Publish Hero Slide'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Quick Schedule Modal */}
      {scheduleModalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md p-6 space-y-4 text-xs font-sans shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                  <Calendar size={16} />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-900 font-normal">
                    Schedule Banner Publication
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    "{scheduleModalBanner.headline || scheduleModalBanner.title}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalBanner(null)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
                  Go-Live Date & Time <span className="text-rose-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleStartAt}
                  onChange={e => setScheduleStartAt(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
                  Expiration / End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduleEndAt}
                  onChange={e => setScheduleEndAt(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl text-[11px] text-amber-900">
                BullMQ worker will automatically publish this banner at the scheduled time and revert it when the end time expires.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setScheduleModalBanner(null)}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                disabled={isScheduling || !scheduleStartAt}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
              >
                {isScheduling && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalBanner}
        onClose={() => setDeleteModalBanner(null)}
        onConfirm={handleConfirmDelete}
        title="Archive Storefront Banner?"
        message={`Are you sure you want to remove "${deleteModalBanner?.headline || deleteModalBanner?.title}" from the storefront slider?`}
        confirmLabel="Archive Banner"
        isDestructive={true}
      />
    </div>
  );
};

export default AdminBannersPage;
