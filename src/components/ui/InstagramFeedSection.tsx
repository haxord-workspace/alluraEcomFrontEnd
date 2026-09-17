import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  MessageCircle, 
  Share2, 
  ExternalLink, 
  X, 
  ShoppingBag, 
  Sparkles, 
  Film, 
  Image as ImageIcon, 
  Eye, 
  Music2 
} from 'lucide-react';
import { instagramFeedData, type InstagramPost } from '../../data/instagram';

const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const InstagramFeedSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'image'>('all');
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);
  const [isPlayingModalVideo, setIsPlayingModalVideo] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const filteredPosts = instagramFeedData.filter(post => {
    if (activeTab === 'video') return post.type === 'video';
    if (activeTab === 'image') return post.type === 'image';
    return true;
  });

  const handleOpenPost = (post: InstagramPost) => {
    setSelectedPost(post);
    setIsPlayingModalVideo(true);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const toggleModalPlay = () => {
    if (modalVideoRef.current) {
      if (isPlayingModalVideo) {
        modalVideoRef.current.pause();
        setIsPlayingModalVideo(false);
      } else {
        modalVideoRef.current.play();
        setIsPlayingModalVideo(true);
      }
    }
  };

  const toggleModalMute = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="border-t border-[#DED2C1]/80 bg-[#FCFAF6] py-16 sm:py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#DED2C1]/70 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E1306C] animate-pulse" />
              <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-[#8B6335]">
                CONNECT WITH ALLURA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl sm:text-4xl text-[#2C2926] font-normal tracking-tight">
                AS SEEN ON INSTAGRAM
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#EFE5D5] text-[#8B6335] text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full border border-[#DED2C1]">
                <InstagramIcon size={12} className="text-[#E1306C]" />
                @alluraboutiqueofficial
              </span>
            </div>
          </div>

          {/* Filter Tabs & Follow CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="inline-flex bg-[#EFE5D5]/80 p-1 rounded-lg border border-[#DED2C1]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#FCFAF6] text-[#2C2926] shadow-xs font-semibold'
                    : 'text-[#746A60] hover:text-[#2C2926]'
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-all ${
                  activeTab === 'video'
                    ? 'bg-[#FCFAF6] text-[#2C2926] shadow-xs font-semibold'
                    : 'text-[#746A60] hover:text-[#2C2926]'
                }`}
              >
                <Film size={12} className="text-[#8B6335]" />
                Reels & Videos
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans font-medium transition-all ${
                  activeTab === 'image'
                    ? 'bg-[#FCFAF6] text-[#2C2926] shadow-xs font-semibold'
                    : 'text-[#746A60] hover:text-[#2C2926]'
                }`}
              >
                <ImageIcon size={12} className="text-[#8B6335]" />
                Photos
              </button>
            </div>

            {/* Follow on Instagram Button */}
            <a
              href="https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg=="
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] hover:opacity-90 text-white text-xs font-sans font-bold tracking-wider px-4 py-2 rounded-lg shadow-sm transition-opacity"
            >
              <InstagramIcon size={14} />
              <span>FOLLOW</span>
            </a>
          </div>
        </div>

        {/* Dynamic Feed Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {filteredPosts.map(post => {
            const isVideo = post.type === 'video';
            const isHovered = hoveredVideoId === post.id;

            return (
              <div
                key={post.id}
                onClick={() => handleOpenPost(post)}
                onMouseEnter={() => isVideo && setHoveredVideoId(post.id)}
                onMouseLeave={() => isVideo && setHoveredVideoId(null)}
                className="group relative aspect-[9/13] rounded-xl overflow-hidden bg-[#2C2926] border border-[#DED2C1] shadow-subtle cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-luxury"
              >
                {/* Media (Video preview or Image) */}
                {isVideo ? (
                  <div className="w-full h-full relative">
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        isHovered ? 'opacity-0' : 'opacity-100'
                      }`}
                      loading="lazy"
                    />
                    {isHovered && (
                      <video
                        src={post.mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <img
                    src={post.thumbnailUrl}
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}

                {/* Top Badge (Reel icon or Tag) */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                  {isVideo ? (
                    <span className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                      <Film size={11} />
                    </span>
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                      <InstagramIcon size={11} />
                    </span>
                  )}
                </div>

                {/* Bottom Overlay Info on Card */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3 text-white opacity-90 group-hover:opacity-100 transition-opacity">
                  {/* Views or Likes */}
                  <div className="flex items-center justify-between text-[11px] font-sans font-medium text-white/90 mb-1">
                    {isVideo && post.views ? (
                      <span className="flex items-center gap-1 text-white font-semibold">
                        <Eye size={12} className="text-amber-300" />
                        {(post.views / 1000).toFixed(1)}k
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-white font-semibold">
                        <Heart size={12} className="text-rose-400 fill-current" />
                        {post.likes.toLocaleString()}
                      </span>
                    )}

                    {post.productName && (
                      <span className="text-[9px] bg-[#8B6335]/90 text-[#FCFAF6] px-1.5 py-0.5 rounded font-sans tracking-wide uppercase">
                        Shop
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-white/80 line-clamp-2 leading-tight font-sans">
                    {post.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Boutique Instagram Footer Handle Bar */}
        <div className="mt-8 pt-6 border-t border-[#DED2C1]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#746A60] font-sans">
          <div className="flex items-center gap-2">
            <InstagramIcon size={16} className="text-[#E1306C]" />
            <span>
              Tag <strong className="text-[#2C2926]">@alluraboutiqueofficial</strong> or use{' '}
              <strong className="text-[#8B6335]">#AlluraWomen</strong> to be featured on our feed
            </span>
          </div>
          <a
            href="https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg=="
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#8B6335] hover:text-[#2C2926] transition-colors uppercase tracking-wider"
          >
            <span>View More on Instagram</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Interactive Lightbox / Modal for Instagram Post & Video */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#FCFAF6] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-[#DED2C1]"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Left Media Area (Video Player or Photo) */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[360px] md:min-h-[520px]">
              {selectedPost.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={modalVideoRef}
                    src={selectedPost.mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full max-h-[520px] object-contain"
                  />

                  {/* Video Play / Mute Controls */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
                    <button
                      onClick={toggleModalPlay}
                      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95"
                      aria-label={isPlayingModalVideo ? 'Pause' : 'Play'}
                    >
                      {isPlayingModalVideo ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-current" />}
                    </button>

                    <button
                      onClick={toggleModalMute}
                      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-transform active:scale-95"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>
                </div>
              ) : (
                <img
                  src={selectedPost.mediaUrl}
                  alt={selectedPost.caption}
                  className="w-full h-full max-h-[520px] object-contain bg-black"
                />
              )}
            </div>

            {/* Right Information & Interaction Column */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto bg-[#FCFAF6]">
              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#DED2C1]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] p-0.5">
                      <div className="w-full h-full rounded-full bg-[#FCFAF6] flex items-center justify-center font-serif text-sm font-bold text-[#8B6335]">
                        A
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-sans font-bold text-[#2C2926] flex items-center gap-1">
                        alluraboutiqueofficial
                        <span className="text-blue-500">✓</span>
                      </h4>
                      <p className="text-[10px] text-[#746A60]">Perinthalmanna, Kerala</p>
                    </div>
                  </div>

                  <a
                    href={selectedPost.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-sans font-bold text-[#8B6335] hover:underline"
                  >
                    View on App
                  </a>
                </div>

                {/* Audio Track Tag if video */}
                {selectedPost.audioTrack && (
                  <div className="flex items-center gap-2 text-[11px] text-[#746A60] bg-[#EFE5D5]/60 px-3 py-1.5 rounded-md font-sans">
                    <Music2 size={12} className="text-[#8B6335] flex-shrink-0" />
                    <span className="truncate">{selectedPost.audioTrack}</span>
                  </div>
                )}

                {/* Caption & Hashtags */}
                <div className="space-y-2">
                  <p className="text-xs font-sans text-[#2C2926] leading-relaxed">
                    {selectedPost.caption}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPost.tags.map(tag => (
                      <span key={tag} className="text-[11px] text-[#8B6335] font-sans font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[#746A60] font-sans block pt-2">
                    {selectedPost.date}
                  </span>
                </div>

                {/* Featured Product Box (Shop The Look) */}
                {selectedPost.productSlug && (
                  <div className="p-3 bg-[#EFE5D5]/80 rounded-xl border border-[#DED2C1] space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-[#8B6335] uppercase tracking-wider">
                      <Sparkles size={12} />
                      <span>FEATURED IN THIS POST</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-serif text-sm text-[#2C2926] font-medium">
                          {selectedPost.productName}
                        </h5>
                        <p className="text-xs font-sans font-semibold text-[#8B6335]">
                          ₹{selectedPost.productPrice?.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        to={`/product/${selectedPost.productSlug}`}
                        onClick={handleCloseModal}
                        className="inline-flex items-center gap-1.5 bg-[#8B6335] hover:bg-[#2C2926] text-[#FCFAF6] text-[11px] font-sans font-bold px-3 py-1.5 rounded-md transition-colors shadow-xs"
                      >
                        <ShoppingBag size={12} />
                        <span>SHOP</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#DED2C1] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#746A60] font-sans">
                  <span className="font-semibold text-[#2C2926]">
                    {selectedPost.likes.toLocaleString()} likes
                  </span>
                  {selectedPost.views && (
                    <span>{selectedPost.views.toLocaleString()} views</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/919037991774?text=${encodeURIComponent(
                      `Hello Allura, I saw this post on Instagram (${selectedPost.caption.slice(0, 40)}...) and would like to enquire.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-sans font-bold py-2.5 rounded-lg transition-colors shadow-xs"
                  >
                    <MessageCircle size={14} />
                    <span>ENQUIRE ON WHATSAPP</span>
                  </a>

                  <a
                    href={selectedPost.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg border border-[#DED2C1] hover:bg-[#EFE5D5] text-[#2C2926] transition-colors"
                    title="Open in Instagram"
                  >
                    <Share2 size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
