import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import type { HomepageExperience } from '../../types/homepageExperience';
import { ExperienceIcon } from '../common/ExperienceIcon';

interface AlluraExperienceSectionProps {
  data: HomepageExperience;
  mobileTrustStrip?: React.ReactNode;
}

export const AlluraExperienceSection: React.FC<AlluraExperienceSectionProps> = ({
  data,
  mobileTrustStrip,
}) => {
  const { subtitle, title, description, media, cta, features } = data;
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasMedia = Boolean(media && media.url);
  const hasFeatures = Array.isArray(features) && features.length > 0;

  // Handle playing video when user clicks custom overlay button
  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlayingVideo(true);
    }
  };

  // Determine grid column spans based on presence of media and features
  const mediaColSpan = hasMedia ? 'lg:col-span-5' : 'hidden';
  let centerColSpan = 'lg:col-span-4';
  if (!hasMedia && !hasFeatures) {
    centerColSpan = 'lg:col-span-12 text-center max-w-3xl mx-auto';
  } else if (!hasMedia) {
    centerColSpan = 'lg:col-span-7';
  } else if (!hasFeatures) {
    centerColSpan = 'lg:col-span-7';
  }

  // CTA rendering helper
  const renderCTA = () => {
    if (!cta || !cta.isEnabled || !cta.label || !cta.link) {
      return null;
    }

    const ctaClassName =
      'inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-[0.25em] uppercase py-3.5 px-6 rounded-xl transition-all duration-300 shadow-md';

    const isInternal = cta.link.startsWith('/');

    if (isInternal && !cta.openInNewTab) {
      return (
        <Link to={cta.link} className={ctaClassName}>
          <span>{cta.label}</span>
          <ArrowRight size={14} />
        </Link>
      );
    }

    return (
      <a
        href={cta.link}
        className={ctaClassName}
        target={cta.openInNewTab ? '_blank' : undefined}
        rel={cta.openInNewTab ? 'noopener noreferrer' : undefined}
      >
        <span>{cta.label}</span>
        <ArrowRight size={14} />
      </a>
    );
  };

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8" aria-label="The Allura Experience">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-md:gap-4">
        {/* Left-side media (image or video) */}
        {hasMedia && media && (
          <div className={`${mediaColSpan} relative aspect-[4/5] rounded-2xl overflow-hidden shadow-md group border border-[#561C08]/15 bg-stone-100`}>
            {media.type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  src={media.url}
                  poster={media.thumbnailUrl || undefined}
                  controls={isPlayingVideo}
                  playsInline
                  preload={media.thumbnailUrl ? 'none' : 'metadata'}
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlayingVideo(true)}
                  onPause={() => setIsPlayingVideo(false)}
                >
                  Your browser does not support the video tag.
                </video>

                {/* Overlay play button when not playing */}
                {!isPlayingVideo && (
                  <div className="absolute inset-0 bg-[#561C08]/20 flex items-center justify-center pointer-events-auto">
                    <button
                      type="button"
                      onClick={handlePlayVideo}
                      className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-md text-[#561C08] flex items-center justify-center shadow-md hover:scale-110 transition-transform hover:bg-[#561C08] hover:text-white"
                      aria-label="Play boutique film"
                    >
                      <Play size={22} className="ml-1 fill-current" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <img
                src={media.url}
                alt={media.altText || title || 'The Allura Boutique Experience'}
                loading="lazy"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
            )}
          </div>
        )}

        {/* Mobile only — trust strip shown under the media card */}
        {mobileTrustStrip && (
          <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-5 text-center rounded-2xl border border-[#561C08]/15 bg-[#F7E6C8] py-5 px-4">
            {mobileTrustStrip}
          </div>
        )}

        {/* Center content */}
        <div className={`${centerColSpan} space-y-5 max-md:space-y-3 max-md:pt-2`}>
          {subtitle && (
            <span className="text-[11px] font-heading font-bold tracking-[0.25em] uppercase text-[#561C08]">
              {subtitle}
            </span>
          )}

          <h2 className="font-heading text-3xl sm:text-4xl text-[#000000] font-bold leading-tight uppercase max-md:text-base max-md:font-semibold max-md:tracking-[0.06em] max-md:leading-[1.2]">
            {title}
          </h2>

          {description && (
            <p className="text-xs sm:text-sm text-[#561C08] font-body leading-relaxed font-normal">
              {description}
            </p>
          )}

          {cta?.isEnabled && (
            <div className="pt-2">
              {renderCTA()}
            </div>
          )}
        </div>

        {/* Right-side feature highlights */}
        {hasFeatures && (
          <div className="lg:col-span-3 space-y-6 lg:border-l lg:border-[#561C08]/15 lg:pl-8 max-md:space-y-4 max-md:pt-1">
            {features.map((feature) => (
              <div key={feature.id || feature.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#561C08] flex-shrink-0 border border-[#561C08]/15 shadow-xs">
                  <ExperienceIcon name={feature.icon} size={18} />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold tracking-wider uppercase text-[#000000]">
                    {feature.title}
                  </h4>
                  {feature.description && (
                    <p className="text-xs text-[#561C08] font-body mt-0.5 font-medium">
                      {feature.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
