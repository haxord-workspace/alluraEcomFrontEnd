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
  ArrowRight, 
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
    <section className="border-t border-[#561C08]/15 bg-white py-16 sm:py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#561C08]/15 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#561C08] animate-pulse" />
              <span className="text-[11px] font-heading font-bold tracking-[0.25em] uppercase text-[#561C08]">
                CONNECT WITH ALLURA
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-2xl sm:text-4xl text-[#000000] font-bold uppercase tracking-tight">
                AS SEEN ON INSTAGRAM
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 bg-[#F7E6C8] text-[#561C08] text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full border border-[#561C08]/20">
                <InstagramIcon size={12} className="text-[#561C08]" />
                @alluraboutiqueofficial
              </span>
            </div>
          </div>

          {/* Filter Tabs & Follow CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="inline-flex bg-[#F7E6C8]/60 p-1 rounded-xl border border-[#561C08]/15">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#561C08] text-white shadow-xs font-bold'
                    : 'text-[#561C08] hover:bg-[#F7E6C8]'
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-all ${
                  activeTab === 'video'
                    ? 'bg-[#561C08] text-white shadow-xs font-bold'
                    : 'text-[#561C08] hover:bg-[#F7E6C8]'
                }`}
              >
                <Film size={12} className={activeTab === 'video' ? 'text-white' : 'text-[#561C08]'} />
                Reels & Videos
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-medium transition-all ${
                  activeTab === 'image'
                    ? 'bg-[#561C08] text-white shadow-xs font-bold'
                    : 'text-[#561C08] hover:bg-[#F7E6C8]'
                }`}
              >
                <ImageIcon size={12} className={activeTab === 'image' ? 'text-white' : 'text-[#561C08]'} />
                Photos
              </button>
            </div>

            {/* Follow on Instagram Button */}
            <a
              href="https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg=="
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-wider px-4 py-2 rounded-xl shadow-xs transition-colors"
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
                className="group relative aspect-[9/13] rounded-2xl overflow-hidden bg-stone-900 border border-[#561C08]/15 shadow-subtle cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-luxury"
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
                  <div className="flex items-center justify-between text-[11px] font-body font-medium text-white/90 mb-1">
                    {isVideo && post.views ? (
                      <span className="flex items-center gap-1 text-white font-semibold">
                        <Eye size={12} className="text-[#F7E6C8]" />
                        {(post.views / 1000).toFixed(1)}k
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-white font-semibold">
                        <Heart size={12} className="text-rose-400 fill-current" />
                        {post.likes.toLocaleString()}
                      </span>
                    )}

                    {post.productName && (
                      <span className="text-[9px] bg-[#561C08] text-white px-1.5 py-0.5 rounded font-heading tracking-wide uppercase">
                        Shop
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-white/80 line-clamp-2 leading-tight font-body">
                    {post.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Boutique Instagram Footer Handle Bar */}
        <div className="mt-8 pt-6 border-t border-[#561C08]/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#561C08] font-body">
          <div className="flex items-center gap-2">
            <InstagramIcon size={16} className="text-[#561C08]" />
            <span>
              Tag <strong className="text-[#000000]">@alluraboutiqueofficial</strong> or use{' '}
              <strong className="text-[#561C08]">#AlluraWomen</strong> to be featured on our feed
            </span>
          </div>
          <a
            href="https://www.instagram.com/alluraboutiqueofficial?stkn=MWl1Ymx3NTNqdTc2dg=="
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[#561C08] hover:text-[#000000] transition-colors uppercase tracking-wider font-heading"
          >
            <span>EXPLORE OUR GALLERY</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* Expanded Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black text-white flex items-center justify-center transition-colors"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>

            {/* Left Media Area (Video Player or Photo) */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-[500px]">
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
            <div className="md:w-2/5 p-6 flex flex-col justify-between overflow-y-auto bg-white">
              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#561C08]/15">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#561C08] p-0.5">
                      <div className="w-full h-full rounded-full bg-[#F7E6C8] flex items-center justify-center font-heading text-sm font-bold text-[#561C08]">
                        A
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-heading font-bold text-[#000000] flex items-center gap-1">
                        alluraboutiqueofficial
                      </h4>
                      <p className="text-[10px] text-[#561C08]">Perinthalmanna Atelier</p>
                    </div>
                  </div>

                  <a
                    href={selectedPost.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-heading font-bold text-[#561C08] hover:underline"
                  >
                    View on App
                  </a>
                </div>

                {/* Audio Track Tag if video */}
                {selectedPost.audioTrack && (
                  <div className="flex items-center gap-2 text-[11px] text-[#561C08] bg-[#F7E6C8]/60 px-3 py-1.5 rounded-xl font-body">
                    <Music2 size={12} className="text-[#561C08] flex-shrink-0" />
                    <span className="truncate">{selectedPost.audioTrack}</span>
                  </div>
                )}

                {/* Caption & Hashtags */}
                <div className="space-y-2">
                  <p className="text-xs font-body text-[#000000] leading-relaxed">
                    {selectedPost.caption}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedPost.tags.map(tag => (
                      <span key={tag} className="text-[11px] text-[#561C08] font-body font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-stone-400 font-body block pt-2">
                    {selectedPost.date}
                  </span>
                </div>

                {/* Featured Product Box (Shop The Look) */}
                {selectedPost.productSlug && (
                  <div className="p-3 bg-[#F7E6C8]/50 rounded-2xl border border-[#561C08]/15 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-heading font-bold text-[#561C08] uppercase tracking-wider">
                      <Sparkles size={12} />
                      <span>FEATURED IN THIS POST</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-heading text-sm text-[#000000] font-bold">
                          {selectedPost.productName}
                        </h5>
                        <p className="text-xs font-body font-bold text-[#561C08]">
                          ₹{selectedPost.productPrice?.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Link
                        to={`/product/${selectedPost.productSlug}`}
                        onClick={handleCloseModal}
                        className="inline-flex items-center gap-1.5 bg-[#561C08] hover:bg-[#3D1406] text-white text-[11px] font-heading font-bold px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                      >
                        <ShoppingBag size={12} />
                        <span>SHOP</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#561C08]/15 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#561C08] font-body">
                  <span className="font-semibold text-[#000000]">
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
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-heading font-bold py-2.5 rounded-xl transition-colors shadow-xs"
                  >
                    <MessageCircle size={14} />
                    <span>ENQUIRE ON WHATSAPP</span>
                  </a>

                  <a
                    href={selectedPost.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-[#561C08]/20 hover:bg-[#F7E6C8] text-[#561C08] transition-colors"
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
