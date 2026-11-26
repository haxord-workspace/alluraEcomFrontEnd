import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type {
  AdminHomepageExperienceMedia,
  HomepageExperienceOptions,
} from '../../../../../types/homepageExperience';
import {
  uploadAdminExperienceMedia,
  deleteAdminExperienceMedia,
  uploadAdminExperienceThumbnail,
  deleteAdminExperienceThumbnail,
  formatExperienceErrorMessage,
} from '../../../../../service/adminHomepageExperience';
import { ConfirmModal } from '../../../../../components/common/ConfirmModal';

interface MediaManagementProps {
  media: AdminHomepageExperienceMedia | null;
  options: HomepageExperienceOptions | null;
  canEdit: boolean;
  onMediaUpdated: (media: AdminHomepageExperienceMedia | null) => void;
  onAltTextChange: (altText: string) => void;
  altText: string;
}

export const MediaManagement: React.FC<MediaManagementProps> = ({
  media,
  options,
  canEdit,
  onMediaUpdated,
  onAltTextChange,
  altText,
}) => {
  const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState<boolean>(false);
  const [thumbnailProgress, setThumbnailProgress] = useState<number | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const [isDeleteMediaModalOpen, setIsDeleteMediaModalOpen] = useState<boolean>(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState<boolean>(false);

  const [isDeleteThumbnailModalOpen, setIsDeleteThumbnailModalOpen] = useState<boolean>(false);
  const [isDeletingThumbnail, setIsDeletingThumbnail] = useState<boolean>(false);

  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbFileInputRef = useRef<HTMLInputElement | null>(null);

  // Maximum allowed sizes
  const maxImageBytes = options?.media?.image?.maxBytes || 10 * 1024 * 1024; // 10MB
  const maxVideoBytes = options?.media?.video?.maxBytes || 50 * 1024 * 1024; // 50MB

  const imageFormats = options?.media?.image?.formats || ['jpeg', 'png', 'webp', 'avif', 'gif'];
  const videoFormats = options?.media?.video?.formats || ['mp4', 'webm'];

  const imageAcceptString = imageFormats.map((f: string) => `image/${f}`).join(',');
  const videoAcceptString = videoFormats.map((f: string) => `video/${f}`).join(',');

  const imageMimeTypes = imageFormats.map((f: string) => `image/${f === 'svg' ? 'svg+xml' : f}`);
  const videoMimeTypes = videoFormats.map((f: string) => `video/${f}`);

  // Handle main media file selection
  const handleMainFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate .mov file explicitly (by MIME type and extension, since some browsers omit file.type)
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (file.type === 'video/quicktime' || extension === 'mov') {
      setUploadError('Please convert your video to MP4 before uploading.');
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
      return;
    }

    const isVideo = videoMimeTypes.includes(file.type) || extension === 'mp4' || extension === 'webm';
    const isImage = imageMimeTypes.includes(file.type);

    if (!isVideo && !isImage) {
      setUploadError(
        `Supported formats: ${imageFormats.join(', ').toUpperCase()}, ${videoFormats.join(', ').toUpperCase()}.`
      );
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
      return;
    }

    // Size validation
    const limit = isVideo ? maxVideoBytes : maxImageBytes;
    const limitMb = Math.round(limit / (1024 * 1024));

    if (file.size > limit) {
      setUploadError(
        `File exceeds maximum allowed size of ${limitMb}MB for ${isVideo ? 'video' : 'image'}s.`
      );
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const updatedSection = await uploadAdminExperienceMedia(
        file,
        altText,
        (percent: number) => setUploadProgress(percent)
      );

      onMediaUpdated(updatedSection.media);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 1500);
    } catch (err: any) {
      setUploadError(formatExperienceErrorMessage(err, 'Failed to upload media.'));
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (mainFileInputRef.current) mainFileInputRef.current.value = '';
    }
  };

  // Handle thumbnail file selection
  const handleThumbnailFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailError(null);

    if (!file.type.startsWith('image/')) {
      setThumbnailError('Thumbnail must be an image file.');
      if (thumbFileInputRef.current) thumbFileInputRef.current.value = '';
      return;
    }

    if (file.size > maxImageBytes) {
      setThumbnailError(`Thumbnail image exceeds maximum size of ${Math.round(maxImageBytes / (1024 * 1024))}MB.`);
      if (thumbFileInputRef.current) thumbFileInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingThumbnail(true);
      setThumbnailProgress(0);

      const updatedSection = await uploadAdminExperienceThumbnail(
        file,
        (percent: number) => setThumbnailProgress(percent)
      );

      onMediaUpdated(updatedSection.media);
      setThumbnailProgress(100);
      setTimeout(() => setThumbnailProgress(null), 1500);
    } catch (err: any) {
      setThumbnailError(formatExperienceErrorMessage(err, 'Failed to upload video thumbnail.'));
      setThumbnailProgress(null);
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbFileInputRef.current) thumbFileInputRef.current.value = '';
    }
  };

  // Handle Remove Main Media
  const handleConfirmDeleteMedia = async () => {
    try {
      setIsDeletingMedia(true);
      const updatedSection = await deleteAdminExperienceMedia();
      onMediaUpdated(updatedSection.media);
      setIsDeleteMediaModalOpen(false);
    } catch (err: any) {
      setUploadError(formatExperienceErrorMessage(err, 'Failed to remove media.'));
    } finally {
      setIsDeletingMedia(false);
    }
  };

  // Handle Remove Thumbnail
  const handleConfirmDeleteThumbnail = async () => {
    try {
      setIsDeletingThumbnail(true);
      const updatedSection = await deleteAdminExperienceThumbnail();
      onMediaUpdated(updatedSection.media);
      setIsDeleteThumbnailModalOpen(false);
    } catch (err: any) {
      setThumbnailError(formatExperienceErrorMessage(err, 'Failed to remove video thumbnail.'));
    } finally {
      setIsDeletingThumbnail(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            {media?.type === 'video' ? <Film size={18} /> : <ImageIcon size={18} />}
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-stone-900">
              Media Showcase
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Upload a high-resolution portrait boutique image (up to 10MB) or promotional film (up to 50MB).
            </p>
          </div>
        </div>

        {media && (
          <span className="text-[11px] font-sans font-semibold uppercase px-2.5 py-1 bg-stone-100 text-stone-700 rounded-md">
            Type: {media.type}
          </span>
        )}
      </div>

      {/* Media Type Filter Selector for Picker */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-sans font-semibold text-stone-700 uppercase tracking-wider">
          Upload Type:
        </span>
        <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200/80">
          <button
            type="button"
            onClick={() => setSelectedMediaType('image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors flex items-center gap-1.5 ${
              selectedMediaType === 'image'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <ImageIcon size={14} />
            <span>Image</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMediaType('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-colors flex items-center gap-1.5 ${
              selectedMediaType === 'video'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Film size={14} />
            <span>Video</span>
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={mainFileInputRef}
        onChange={handleMainFileSelected}
        accept={selectedMediaType === 'video' ? videoAcceptString : imageAcceptString}
        className="hidden"
      />
      <input
        type="file"
        ref={thumbFileInputRef}
        onChange={handleThumbnailFileSelected}
        accept={imageAcceptString}
        className="hidden"
      />

      {/* Media Preview & Upload Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Preview area */}
        <div className="lg:col-span-5">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 relative group flex items-center justify-center">
            {media?.url ? (
              media.type === 'video' ? (
                <video
                  src={media.url}
                  poster={media.thumbnailUrl || undefined}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={media.url}
                  alt={media.altText || 'Allura Boutique Experience'}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="p-8 text-center space-y-3 text-stone-400">
                <UploadCloud size={40} className="mx-auto text-stone-300" />
                <p className="text-xs font-sans">No media uploaded yet</p>
              </div>
            )}

            {isUploading && uploadProgress !== null && (
              <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white text-center space-y-3 z-10">
                <Loader2 size={32} className="animate-spin text-amber-300" />
                <p className="text-xs font-sans font-medium tracking-wide">
                  Uploading {selectedMediaType}... {uploadProgress}%
                </p>
                <div className="w-48 bg-stone-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons under preview */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              disabled={!canEdit || isUploading}
              onClick={() => mainFileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-sans font-semibold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <UploadCloud size={15} />
              <span>{media ? `Replace ${media.type}` : `Upload ${selectedMediaType}`}</span>
            </button>

            {media && (
              <button
                type="button"
                disabled={!canEdit || isUploading}
                onClick={() => setIsDeleteMediaModalOpen(true)}
                className="p-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                title="Remove Media"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-sans">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Right: Media Metadata & Video Thumbnail */}
        <div className="lg:col-span-7 space-y-5">
          {/* Alt Text Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Media Alt / Accessibility Description
            </label>
            <input
              type="text"
              value={altText}
              disabled={!canEdit}
              onChange={(e) => onAltTextChange(e.target.value)}
              placeholder="e.g. Allura boutique store interior and couture dress collection"
              className="w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border border-stone-200 rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] disabled:bg-stone-100 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-stone-500 font-sans">
              Required for SEO and screen-readers. Saved automatically when you save general settings.
            </p>
          </div>

          {/* Video Thumbnail Management (Only visible when media.type === 'video') */}
          {media?.type === 'video' && (
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-xs font-bold tracking-wider uppercase text-stone-900">
                    Video Poster Thumbnail
                  </h4>
                  <p className="text-[11px] text-stone-500 font-sans">
                    Display an elegant first-frame image poster before the customer plays the video.
                  </p>
                </div>
                {media.thumbnailUrl && (
                  <span className="text-[10px] font-sans font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    Custom Poster Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-stone-200 bg-white flex items-center justify-center flex-shrink-0 relative">
                  {media.thumbnailUrl ? (
                    <img
                      src={media.thumbnailUrl}
                      alt="Thumbnail poster"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Eye size={20} className="text-stone-300" />
                  )}

                  {isUploadingThumbnail && (
                    <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!canEdit || isUploadingThumbnail}
                      onClick={() => thumbFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                    >
                      {media.thumbnailUrl ? 'Replace Thumbnail' : 'Upload Thumbnail'}
                    </button>

                    {media.thumbnailUrl && (
                      <button
                        type="button"
                        disabled={!canEdit || isUploadingThumbnail}
                        onClick={() => setIsDeleteThumbnailModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {thumbnailProgress !== null && (
                    <p className="text-[11px] text-stone-500 font-sans">
                      Uploading thumbnail: {thumbnailProgress}%
                    </p>
                  )}

                  {thumbnailError && (
                    <p className="text-[11px] text-rose-500 font-sans">{thumbnailError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Removing Media */}
      <ConfirmModal
        isOpen={isDeleteMediaModalOpen}
        onClose={() => setIsDeleteMediaModalOpen(false)}
        onConfirm={handleConfirmDeleteMedia}
        title="Remove Main Media?"
        message="Are you sure you want to remove the current media? The homepage section will render without a media card until a new file is uploaded."
        confirmLabel={isDeletingMedia ? 'Removing...' : 'Remove Media'}
        isDestructive
      />

      {/* Confirmation Modal for Removing Thumbnail */}
      <ConfirmModal
        isOpen={isDeleteThumbnailModalOpen}
        onClose={() => setIsDeleteThumbnailModalOpen(false)}
        onConfirm={handleConfirmDeleteThumbnail}
        title="Remove Video Thumbnail?"
        message="Are you sure you want to remove the custom thumbnail? The video will fall back to browser first-frame preload."
        confirmLabel={isDeletingThumbnail ? 'Removing...' : 'Remove Thumbnail'}
        isDestructive
      />
    </div>
  );
};
