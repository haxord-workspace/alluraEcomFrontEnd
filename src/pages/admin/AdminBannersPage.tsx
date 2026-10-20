import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  X,
  Copy,
  LayoutGrid,
  List,
  CheckCircle2,
  Wand2,
  Link as LinkIcon,
  Layers,
  ArrowUpRight
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
  isValidObjectId,
  type BannerPlacement,
  type BannerPayload
} from '../../service/adminBanners';
import { getBackendErrorMessage, getBackendSuccessMessage } from '../../utils/apiResponse';
import { resizeImageSource } from '../../utils/image';
import type { Banner } from '../../types';

const PLACEMENT_OPTIONS: { value: BannerPlacement; label: string; shortLabel: string; desc: string }[] = [
  { value: 'HOME_HERO', label: '★ Homepage Hero Slider (HOME_HERO)', shortLabel: 'Hero Slider', desc: 'Main carousel at the top of the homepage' },
  { value: 'HOME_PROMOTION', label: 'Editorial Promo Banner (HOME_PROMOTION)', shortLabel: 'Editorial', desc: 'Curated editorial spotlight showcase' },
  { value: 'CATEGORY_BANNER', label: 'Category Top Banner (CATEGORY_BANNER)', shortLabel: 'Category', desc: 'Headers shown at the top of category pages' },
  { value: 'COLLECTION_BANNER', label: 'Collection Showcase (COLLECTION_BANNER)', shortLabel: 'Collection', desc: 'Featured hero headers for lookbooks & collections' },
  { value: 'SHOP_BANNER', label: 'Shop Main Banner (SHOP_BANNER)', shortLabel: 'Shop', desc: 'Promotional strip on the all-products shop page' },
  { value: 'PRODUCT_PROMOTION', label: 'Product Promotion (PRODUCT_PROMOTION)', shortLabel: 'Product Promo', desc: 'In-page banner alongside product details' },
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

// 1-Click Starter Templates for effortless creation
const BANNER_TEMPLATES = [
  {
    name: 'Bridal Heritage Couture',
    icon: '👑',
    headline: 'ROYAL HEIRLOOM BRIDAL COUTURE',
    subtitle: 'Handcrafted Zardozi, pure silk weaves, and graceful modest silhouettes tailored for sacred celebrations.',
    badge: 'PERINTHALMANNA ATELIER',
    eyebrow: 'EXCLUSIVE ATELIER WEAR',
    offerPill: 'Complimentary Bespoke Consultation',
    ctaText: 'EXPLORE BRIDAL',
    targetUrl: '/collections/bridal',
    desktopImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1920&q=80',
    placement: 'HOME_HERO' as BannerPlacement,
  },
  {
    name: 'Festive Kasavu Zari',
    icon: '✨',
    headline: 'FESTIVE KASAVU & HANDLOOM SILKS',
    subtitle: 'Timeless handloom heritage reimagined with contemporary modest grace for upcoming celebrations.',
    badge: 'FESTIVE 2026 EDIT',
    eyebrow: 'PURE HANDLOOM WEAVES',
    offerPill: 'Code FESTIVE15 for 15% Off',
    ctaText: 'SHOP FESTIVE',
    targetUrl: '/collections/festive',
    desktopImage: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1920&q=80',
    placement: 'HOME_HERO' as BannerPlacement,
  },
  {
    name: 'New Season Atelier',
    icon: '🌟',
    headline: 'THE NEW SEASON MODEST ATELIER',
    subtitle: 'Fresh arrivals crafted in limited artisan batches. Elevate your everyday modest wardrobe with effortless elegance.',
    badge: 'NEW ARRIVALS',
    eyebrow: 'CURATED ATELIER WEAR',
    offerPill: 'Express Dispatch from Atelier',
    ctaText: 'SHOP NEW ARRIVALS',
    targetUrl: '/shop?sort=newest',
    desktopImage: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1920&q=80',
    placement: 'HOME_HERO' as BannerPlacement,
  },
  {
    name: 'Editorial Luxe Showcase',
    icon: '💎',
    headline: 'BESPOKE MODEST EVENING WEAR',
    subtitle: 'Sculpted silhouettes, artisanal hand-embroidery, and breathable pure silks tailored to perfection.',
    badge: 'HAUTE COUTURE',
    eyebrow: 'EDITORIAL SHOWCASE',
    offerPill: 'Limited Edition Series',
    ctaText: 'DISCOVER LOOKBOOK',
    targetUrl: '/lookbook',
    desktopImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80',
    placement: 'HOME_PROMOTION' as BannerPlacement,
  },
];

// Quick target URL presets for instant 1-click selection
const QUICK_DESTINATIONS = [
  { label: 'Shop All', url: '/shop' },
  { label: 'New Arrivals', url: '/shop?sort=newest' },
  { label: 'Bridal Couture', url: '/collections/bridal' },
  { label: 'Festive Edit', url: '/collections/festive' },
  { label: 'Lookbook', url: '/lookbook' },
  { label: 'AI Luxury Stylist', url: '/ai-assistant' },
];

export const AdminBannersPage: React.FC = () => {
  const { setBannersList, hasPermission } = useAdmin();
  const { showToast } = useShop();

  // Local banners list & fetch states
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // View Mode: Visual Cards vs Compact Fast Table
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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

  // Modal Interactive Live Preview Toggle
  const [modalPreviewViewport, setModalPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');

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

  // Fetch banners strictly from Backend API
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

  // Quick Stats KPI computation
  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter(b => b.status === 'Active').length;
    const scheduled = banners.filter(b => b.status === 'Scheduled').length;
    const draft = banners.filter(b => b.status === 'Draft' || !b.status).length;
    const heroSlides = banners.filter(b => (b.placement === 'HOME_HERO' || b.position === 'Hero') && b.status === 'Active').length;
    return { total, active, scheduled, draft, heroSlides };
  }, [banners]);

  // Handle Form Open for Create
  const handleOpenCreate = () => {
    setEditingBanner(null);
    setTitle('');
    setHeadline('');
    setSubtitle('');
    setBadge('PERINTHALMANNA ATELIER');
    setEyebrow('CURATED ATELIER WEAR');
    setOfferPill('');
    setCtaText('SHOP NOW');
    setTargetUrl('/shop');
    setSecondaryCtaText('');
    setSecondaryTargetUrl('');
    setDesktopImage(IMAGE_PRESETS[0].url);
    setMobileImage(IMAGE_PRESETS[0].url);
    setPlacement('HOME_HERO');
    setStatus('Active');
    setFormStartAt('');
    setFormEndAt('');
    setIsModalOpen(true);
  };

  // Handle Form Open for Edit
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

  // 1-Click apply template
  const applyTemplate = (tmpl: typeof BANNER_TEMPLATES[0]) => {
    setTitle(tmpl.headline);
    setHeadline(tmpl.headline);
    setSubtitle(tmpl.subtitle);
    setBadge(tmpl.badge);
    setEyebrow(tmpl.eyebrow);
    setOfferPill(tmpl.offerPill);
    setCtaText(tmpl.ctaText);
    setTargetUrl(tmpl.targetUrl);
    setDesktopImage(tmpl.desktopImage);
    setMobileImage(tmpl.desktopImage);
    setPlacement(tmpl.placement);
    showToast(`Template "${tmpl.name}" applied!`, 'gold');
  };

  // Fast 1-Click Duplicate Banner
  const handleDuplicate = async (banner: Banner) => {
    setActionBusyId(banner.id);
    const newTitle = `${banner.headline || banner.title} (Copy)`;
    const copyPayload: BannerPayload = {
      title: newTitle,
      headline: newTitle,
      subtitle: banner.subtitle || banner.description || '',
      description: banner.description || banner.subtitle || '',
      badge: banner.badge || '',
      eyebrow: banner.eyebrow || '',
      offerPill: banner.offerPill || '',
      ctaText: banner.ctaText || 'SHOP NOW',
      targetUrl: banner.targetUrl || '/shop',
      secondaryCtaText: banner.secondaryCtaText || '',
      secondaryTargetUrl: banner.secondaryTargetUrl || '',
      desktopImage: banner.desktopImage,
      mobileImage: banner.mobileImage || banner.desktopImage,
      placement: banner.placement || 'HOME_HERO',
      position: banner.position || 'Hero',
      status: 'Draft',
    };

    try {
      const created = await createAdminBanner(copyPayload);
      const next = [created, ...banners];
      setBanners(next);
      setBannersList(next);
      showToast(`Duplicated "${banner.headline || banner.title}" as Draft!`, 'success');
    } catch {
      const fallback: Banner = {
        id: `ban-copy-${Date.now()}`,
        ...copyPayload,
        title: newTitle,
        headline: newTitle,
        subtitle: copyPayload.subtitle || '',
        description: copyPayload.description || '',
        badge: copyPayload.badge,
        eyebrow: copyPayload.eyebrow,
        offerPill: copyPayload.offerPill,
        ctaText: copyPayload.ctaText || 'SHOP NOW',
        targetUrl: copyPayload.targetUrl || '/shop',
        secondaryCtaText: copyPayload.secondaryCtaText,
        secondaryTargetUrl: copyPayload.secondaryTargetUrl,
        placement: copyPayload.placement,
        position: copyPayload.position,
        status: 'Draft',
        desktopImage: copyPayload.desktopImage!,
        mobileImage: copyPayload.mobileImage!,
        image: { url: copyPayload.desktopImage!, alt: newTitle },
      };
      const next = [fallback, ...banners];
      setBanners(next);
      setBannersList(next);
      showToast('Created draft copy locally!', 'gold');
    } finally {
      setActionBusyId(null);
    }
  };

  // Submit Handler with image compression & single-roundtrip request
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

    // Compress any oversized raw base64 data URLs before transmitting
    let optimizedDesktop = desktopImage;
    let optimizedMobile = mobileImage || desktopImage;
    if (optimizedDesktop.startsWith('data:') && optimizedDesktop.length > 200000) {
      try {
        optimizedDesktop = await resizeImageSource(optimizedDesktop, 1920, 0.82);
      } catch {}
    }
    if (optimizedMobile.startsWith('data:') && optimizedMobile.length > 200000) {
      try {
        optimizedMobile = await resizeImageSource(optimizedMobile, 1080, 0.82);
      } catch {}
    }

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
      desktopImage: optimizedDesktop,
      mobileImage: optimizedMobile,
      placement,
      position,
      status,
      startAt: formStartAt ? new Date(formStartAt).toISOString() : undefined,
      endAt: formEndAt ? new Date(formEndAt).toISOString() : undefined,
    };

    try {
      const isRealDbBanner = editingBanner && isValidObjectId(editingBanner.id);

      if (isRealDbBanner) {
        // 1. UPDATE real database record with status and payload in ONE single request
        const updated = await updateAdminBanner(editingBanner.id, payload);

        const nextBanners = banners.map(b => (b.id === editingBanner.id ? { ...b, ...payload, ...updated } : b));
        setBanners(nextBanners);
        setBannersList(nextBanners);
        showToast(updated._message || 'Banner updated successfully! Live storefront synchronized.', 'success');
      } else {
        // 2. CREATE on backend database
        const created = await createAdminBanner(payload);
        const mergedCreated = { ...payload, ...created };
        let nextBanners: Banner[];
        if (editingBanner) {
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
      // Fallback: save locally so the user's change is never lost
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

  // Toggle Publish / Unpublish directly from card with instant optimistic UI
  const handleTogglePublish = async (banner: Banner) => {
    setActionBusyId(banner.id);
    const targetStatus: 'Active' | 'Draft' = banner.status === 'Active' ? 'Draft' : 'Active';
    const previousBanners = banners;

    // Optimistic UI update: flip state immediately for 0ms delay in UI
    const optimisticBanners = banners.map(b => (b.id === banner.id ? { ...b, status: targetStatus } : b));
    setBanners(optimisticBanners);
    setBannersList(optimisticBanners);

    try {
      const isRealDbBanner = isValidObjectId(banner.id);

      if (!isRealDbBanner) {
        const created = await createAdminBanner({
          ...banner,
          desktopImage: banner.desktopImage,
          mobileImage: banner.mobileImage || banner.desktopImage,
          status: targetStatus,
        });
        const next = banners.map(b => (b.id === banner.id ? created : b));
        setBanners(next);
        setBannersList(next);
      } else {
        await updateAdminBanner(banner.id, { status: targetStatus });
      }

      showToast(
        `Banner "${banner.headline || banner.title}" is now ${targetStatus === 'Active' ? 'LIVE' : 'Draft'}!`,
        targetStatus === 'Active' ? 'gold' : 'info'
      );
    } catch (err: any) {
      setBanners(previousBanners);
      setBannersList(previousBanners);
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
    const targetBanner = scheduleModalBanner;
    try {
      const isRealDbBanner = isValidObjectId(targetBanner.id);

      if (!isRealDbBanner) {
        const created = await createAdminBanner({
          ...targetBanner,
          desktopImage: targetBanner.desktopImage,
          mobileImage: targetBanner.mobileImage || targetBanner.desktopImage,
          status: 'Scheduled',
          startAt: scheduleStartAt,
          endAt: scheduleEndAt || undefined,
        });
        const next = banners.map(b => (b.id === targetBanner.id ? created : b));
        setBanners(next);
        setBannersList(next);
      } else {
        await updateAdminBanner(targetBanner.id, {
          status: 'Scheduled',
          startAt: scheduleStartAt,
          endAt: scheduleEndAt || undefined,
        });
        const next = banners.map(b =>
          b.id === targetBanner.id
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

    // Sync to backend if all items are real DB items
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

  // Delete Banner via API with instant optimistic UI update
  const handleConfirmDelete = async () => {
    if (!deleteModalBanner) return;
    const bannerToDelete = deleteModalBanner;
    setDeleteModalBanner(null);

    // Optimistic UI update: remove banner immediately from UI for instant response
    const previousBanners = banners;
    const nextBanners = banners.filter(b => b.id !== bannerToDelete.id);
    setBanners(nextBanners);
    setBannersList(nextBanners);

    try {
      if (isValidObjectId(bannerToDelete.id)) {
        await deleteAdminBanner(bannerToDelete.id);
      }
      showToast('Banner deleted successfully', 'info');
    } catch (err: any) {
      // Revert if API failed
      setBanners(previousBanners);
      setBannersList(previousBanners);
      showToast(getBackendErrorMessage(err, 'Delete failed'), 'error');
    }
  };

  // Filtered List
  const filteredBanners = useMemo(() => {
    return banners.filter(b => {
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
  }, [banners, placementFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header & Quick Actions */}
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
          {/* View Mode Toggle: Cards vs Table */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Studio Visual Cards View"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-700'
              }`}
              title="Compact Management Table View"
            >
              <List size={14} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Viewport Simulation Selector (Active in Cards View) */}
          {viewMode === 'cards' && (
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
          )}

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
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span>Create Slide / Banner</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Campaign Analytics & KPI Summary Cards (Clickable Quick Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs font-sans">
        <button
          onClick={() => { setStatusFilter('All'); setPlacementFilter('All'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'All' && placementFilter === 'All'
              ? 'border-stone-900 bg-white shadow-sm ring-1 ring-stone-900'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-stone-400">Total Banners</span>
          <p className="font-serif text-2xl font-bold text-stone-900 mt-0.5">{stats.total}</p>
          <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
            <Layers size={11} /> All campaign areas
          </p>
        </button>

        <button
          onClick={() => { setStatusFilter('Active'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Active'
              ? 'border-emerald-700 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-700'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-emerald-700">Live on Storefront</span>
          <p className="font-serif text-2xl font-bold text-emerald-800 mt-0.5">{stats.active}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5 flex items-center gap-1">
            <Eye size={11} /> {stats.heroSlides} in Hero Slider
          </p>
        </button>

        <button
          onClick={() => { setStatusFilter('Scheduled'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Scheduled'
              ? 'border-amber-700 bg-amber-50/50 shadow-sm ring-1 ring-amber-700'
              : 'border-stone-200 bg-white hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-amber-700">Scheduled Launches</span>
          <p className="font-serif text-2xl font-bold text-amber-800 mt-0.5">{stats.scheduled}</p>
          <p className="text-[11px] text-amber-600 mt-0.5 flex items-center gap-1">
            <Clock size={11} /> Auto-timed campaigns
          </p>
        </button>

        <button
          onClick={() => { setStatusFilter('Draft'); }}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'Draft'
              ? 'border-stone-700 bg-stone-100 shadow-sm ring-1 ring-stone-700'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-stone-500">Drafts / Inactive</span>
          <p className="font-serif text-2xl font-bold text-stone-700 mt-0.5">{stats.draft}</p>
          <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
            <EyeOff size={11} /> Hidden from customers
          </p>
        </button>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-sans bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
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
            All Placements ({banners.length})
          </button>
          {PLACEMENT_OPTIONS.map(opt => {
            const count = banners.filter(
              b => (b.placement || (b.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO')) === opt.value
            ).length;
            return (
              <button
                key={opt.value}
                onClick={() => setPlacementFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
                  placementFilter === opt.value
                    ? 'bg-stone-900 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 border border-stone-200'
                }`}
              >
                <span>{opt.shortLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${placementFilter === opt.value ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 focus:outline-none"
          >
            <option value="All">All Statuses ({banners.length})</option>
            <option value="Active">Active ({stats.active})</option>
            <option value="Scheduled">Scheduled ({stats.scheduled})</option>
            <option value="Draft">Draft ({stats.draft})</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search banners or links..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>
      </div>

      {/* 4. Live Storefront Hero Preview Callout */}
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

      {/* 5. Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-stone-200 rounded-3xl">
          <Loader2 size={32} className="animate-spin text-allura-goldDark" />
          <p className="text-xs font-sans text-stone-500">Loading storefront banners from atelier API...</p>
        </div>
      )}

      {/* 6. Empty State */}
      {!isLoading && filteredBanners.length === 0 && (
        <div className="bg-white border border-dashed border-stone-300 rounded-3xl p-12 text-center space-y-4">
          <Sparkles size={36} className="mx-auto text-stone-300" />
          <h3 className="font-serif text-xl text-stone-800">No Banners Found</h3>
          <p className="text-xs font-sans text-stone-500 max-w-sm mx-auto">
            {searchQuery || placementFilter !== 'All' || statusFilter !== 'All'
              ? 'No banners match your active filters. Try clearing your search query or filters.'
              : 'You have not created any campaign banners yet. Use our 1-click templates to launch a campaign in seconds!'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {(searchQuery || placementFilter !== 'All' || statusFilter !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setPlacementFilter('All'); setStatusFilter('All'); }}
                className="px-4 py-2 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-semibold"
              >
                Clear All Filters
              </button>
            )}
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={13} />
              <span>Create New Banner</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. View Mode A: Visual Studio Cards */}
      {!isLoading && viewMode === 'cards' && filteredBanners.length > 0 && (
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
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', IMAGE_PRESETS[0].url);
                    }}
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
                    <span className="flex items-center gap-1.5">
                      <LinkIcon size={12} className="text-stone-400" />
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
                        <span>Schedule</span>
                      </button>
                    )}

                    {/* Duplicate Action */}
                    {hasPermission('marketing', 'create') && (
                      <button
                        onClick={() => handleDuplicate(banner)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Duplicate as Draft copy"
                      >
                        <Copy size={13} />
                        <span className="hidden sm:inline">Duplicate</span>
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

      {/* 8. View Mode B: Compact Fast Management Table */}
      {!isLoading && viewMode === 'table' && filteredBanners.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Thumbnail</th>
                  <th className="py-3 px-4">Headline & Eyebrow</th>
                  <th className="py-3 px-4">Placement</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Link</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBanners.map((banner, index) => {
                  const placementObj = PLACEMENT_OPTIONS.find(
                    opt => opt.value === banner.placement || (banner.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO')
                  );
                  const isFirst = index === 0;
                  const isLast = index === filteredBanners.length - 1;
                  const isBusy = actionBusyId === banner.id;

                  return (
                    <tr key={banner.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Order rank with up/down arrows */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-700 text-xs bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                            #{banner.displayOrder || index + 1}
                          </span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOrder(banner, 'up')}
                              disabled={isFirst}
                              className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                              title="Move up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(banner, 'down')}
                              disabled={isLast}
                              className="text-stone-400 hover:text-stone-900 disabled:opacity-20"
                              title="Move down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-16 h-10 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0">
                          <img
                            src={banner.desktopImage || IMAGE_PRESETS[0].url}
                            alt={banner.headline || banner.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', IMAGE_PRESETS[0].url);
                            }}
                          />
                        </div>
                      </td>

                      {/* Headline & Badge */}
                      <td className="py-3 px-4 min-w-[200px]">
                        {banner.badge && (
                          <span className="text-[9px] font-bold text-allura-goldDark uppercase tracking-wider block">
                            {banner.badge}
                          </span>
                        )}
                        <span className="font-serif font-medium text-stone-900 text-sm block truncate max-w-xs">
                          {banner.headline || banner.title}
                        </span>
                        {banner.subtitle && (
                          <span className="text-[11px] text-stone-500 block truncate max-w-xs">
                            {banner.subtitle}
                          </span>
                        )}
                      </td>

                      {/* Placement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          {placementObj?.shortLabel || banner.placement || 'Hero'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={banner.status} size="sm" />
                      </td>

                      {/* Target Link */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <a
                          href={banner.targetUrl || '/shop'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-stone-900 hover:underline"
                        >
                          <span className="truncate max-w-[140px]">{banner.targetUrl || '/shop'}</span>
                          <ArrowUpRight size={11} className="text-stone-400" />
                        </a>
                      </td>

                      {/* Fast Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Fast Toggle */}
                          <button
                            onClick={() => handleTogglePublish(banner)}
                            disabled={isBusy}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              banner.status === 'Active'
                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                            title={banner.status === 'Active' ? 'Unpublish to Draft' : 'Publish Live'}
                          >
                            {banner.status === 'Active' ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>

                          {/* Quick Edit */}
                          <button
                            onClick={() => handleOpenEdit(banner)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                            title="Edit banner"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(banner)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                            title="Duplicate as Draft copy"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Quick Schedule */}
                          <button
                            onClick={() => handleOpenScheduleModal(banner)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                            title="Schedule launch"
                          >
                            <Calendar size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteModalBanner(banner)}
                            disabled={isBusy}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            title="Delete banner"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. Create / Edit Modal with Real-Time Interactive Storefront Live Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col text-xs font-sans shadow-2xl my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 p-5 sm:p-6 bg-stone-50/50">
              <div>
                <h3 className="font-serif text-2xl text-stone-900 font-normal">
                  {editingBanner ? 'Edit Hero Banner & CTAs' : 'Create New Hero Banner'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure headline, typography overlays, responsive photography, and action buttons with live storefront preview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Starter Template Bar for New Banners */}
            {!editingBanner && (
              <div className="px-5 sm:px-6 py-3 bg-amber-50/60 border-b border-amber-200/60 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-900 whitespace-nowrap flex items-center gap-1">
                  <Wand2 size={12} className="text-allura-goldDark" />
                  Quick Starter Templates:
                </span>
                {BANNER_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-lg text-[11px] font-medium text-stone-800 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Modal Body: Split into Form (Left) & Real-Time Live Preview (Right) */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
              
              {/* Left Column: Form Fields */}
              <form id="banner-form" onSubmit={handleSubmit} className="lg:col-span-7 p-5 sm:p-6 space-y-5 overflow-y-auto">
                
                {/* Placement & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
                      Placement Area <span className="text-rose-600">*</span>
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
                    <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
                      Campaign Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as 'Active' | 'Scheduled' | 'Draft')}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-800 focus:outline-none"
                    >
                      <option value="Active">Active (Live on Storefront)</option>
                      <option value="Draft">Draft (Staging / Hidden)</option>
                      <option value="Scheduled">Scheduled (BullMQ Auto-Launch)</option>
                    </select>
                  </div>
                </div>

                {/* Schedule Dates */}
                {status === 'Scheduled' && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                      <Clock size={13} />
                      <span>Automated Publication Schedule</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-semibold text-stone-600 mb-1">
                          Go-Live Date & Time <span className="text-rose-600">*</span>
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

                {/* Headline & Eyebrow */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                      Main Hero Headline <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={headline}
                      onChange={e => setHeadline(e.target.value)}
                      placeholder="E.g. ROYAL HEIRLOOM BRIDAL COUTURE"
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-serif font-medium text-stone-900 focus:outline-none focus:border-stone-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-700 mb-1">
                      Hero Subtitle / Description
                    </label>
                    <textarea
                      rows={2}
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      placeholder="E.g. Handcrafted Zardozi, pure silk weaves, and graceful modest silhouettes tailored for your sacred celebrations."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-stone-800"
                    />
                  </div>
                </div>

                {/* Eyebrow Badge & Offer Voucher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
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
                    <label className="block text-[10px] uppercase font-bold text-stone-600 mb-1">
                      Offer Voucher / Promo Pill
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

                {/* Action Buttons & Quick Destination Chips */}
                <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                      Primary Action Button (Call-To-Action)
                    </span>
                    <span className="text-[10px] text-stone-400">Quick Destination Presets:</span>
                  </div>

                  {/* 1-Click Quick Destination Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {QUICK_DESTINATIONS.map(dest => (
                      <button
                        key={dest.url}
                        type="button"
                        onClick={() => setTargetUrl(dest.url)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors border ${
                          targetUrl === dest.url
                            ? 'bg-stone-900 text-white border-stone-900 font-bold'
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {dest.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                        Button Label <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ctaText}
                        onChange={e => setCtaText(e.target.value)}
                        placeholder="E.g. SHOP NOW"
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                        Target Page URL <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={targetUrl}
                        onChange={e => setTargetUrl(e.target.value)}
                        placeholder="E.g. /shop, /collections/bridal"
                        className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1">
                      Secondary Button Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={secondaryCtaText}
                      onChange={e => setSecondaryCtaText(e.target.value)}
                      placeholder="E.g. AI LUXURY STYLIST"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
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
                      placeholder="E.g. /ai-assistant"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Image Upload Dropzones */}
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
                    aspectRatioLabel="Recommended: 1920×800px (Auto-Optimized)"
                    presets={IMAGE_PRESETS}
                    helperText="Upload device file, paste URL, or choose preset. Automatically compressed for fast live loading."
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
                      aspectRatioLabel="Recommended: 800×1000px"
                      presets={IMAGE_PRESETS}
                      helperText="If omitted or identical, desktop banner image will be used automatically on mobile viewports."
                    />
                  </div>
                </div>

              </form>

              {/* Right Column: Real-Time Interactive Live Storefront Preview */}
              <div className="lg:col-span-5 p-5 sm:p-6 bg-stone-50/70 flex flex-col justify-between space-y-4 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-allura-goldDark" />
                      Live Storefront Simulation
                    </span>

                    {/* Viewport simulation toggle inside modal */}
                    <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setModalPreviewViewport('desktop')}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                          modalPreviewViewport === 'desktop' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600'
                        }`}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalPreviewViewport('mobile')}
                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                          modalPreviewViewport === 'mobile' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600'
                        }`}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500">
                    This live preview updates in real-time as you type, simulating customer presentation on the storefront.
                  </p>

                  {/* The Simulated Live Hero Banner */}
                  <div
                    className={`mx-auto rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 relative shadow-sm transition-all duration-200 ${
                      modalPreviewViewport === 'mobile' ? 'max-w-xs h-[360px]' : 'w-full h-56 sm:h-64'
                    }`}
                  >
                    <img
                      src={modalPreviewViewport === 'mobile' ? (mobileImage || desktopImage) : desktopImage}
                      alt="Banner Preview"
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', IMAGE_PRESETS[0].url);
                      }}
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-transparent flex flex-col justify-end p-4 text-white space-y-1.5">
                      {badge && (
                        <span className="inline-flex items-center gap-1 text-[8px] font-sans font-bold tracking-[0.2em] uppercase text-allura-gold bg-stone-900/70 backdrop-blur-sm px-1.5 py-0.5 rounded w-max">
                          <Sparkles size={8} />
                          <span>{badge}</span>
                        </span>
                      )}

                      <p className={`font-serif font-normal uppercase leading-tight tracking-tight ${
                        modalPreviewViewport === 'mobile' ? 'text-lg' : 'text-lg sm:text-xl'
                      }`}>
                        {headline || 'YOUR HEADLINE HERE'}
                      </p>

                      <p className="text-[10px] text-stone-300 line-clamp-2 leading-relaxed">
                        {subtitle || 'Your subtitle and collection description will appear here on the homepage slider.'}
                      </p>

                      {offerPill && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm text-[9px] font-sans text-stone-100 w-max">
                          <Tag size={8} className="text-allura-gold" />
                          <span>{offerPill}</span>
                        </div>
                      )}

                      <div className="pt-1.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2C2926] text-white text-[10px] font-sans font-bold uppercase tracking-wider rounded-lg shadow-xs border border-white/20">
                          <span>{ctaText || 'SHOP NOW'}</span>
                          <ArrowRight size={10} />
                        </span>

                        {secondaryCtaText && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/30 backdrop-blur-sm text-white text-[9px] font-sans font-bold uppercase tracking-wider rounded-lg border border-white/30">
                            <span>{secondaryCtaText}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-1 text-[11px] text-stone-600">
                    <p className="font-semibold text-stone-800 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Storefront Synchronization Check
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Destination URL: <code className="text-stone-800 font-mono">{targetUrl || '/shop'}</code>
                    </p>
                    <p className="text-[10px] text-stone-500">
                      Status: <strong className={status === 'Active' ? 'text-emerald-700' : 'text-stone-700'}>{status}</strong>
                    </p>
                  </div>
                </div>

                {/* Bottom Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="banner-form"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingBanner ? 'Update Banner' : 'Publish Banner'}</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 10. Quick Schedule Modal */}
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
                    Schedule Automated Launch
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

      {/* 11. Delete Confirmation Modal */}
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
