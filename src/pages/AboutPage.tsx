import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Scissors, Heart, Award, MessageCircle } from 'lucide-react';
import { AlluraLogo } from '../components/common/AlluraLogo';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* Hero Header */}
      <section className="relative h-[45vh] sm:h-[52vh] min-h-[360px] bg-allura-bgSecondary flex items-center justify-center text-center px-6 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85"
          alt="Allura Boutique Heritage"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
        />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-allura-card/80 border border-allura-border text-allura-goldDark text-[11px] font-sans font-bold tracking-[0.25em] uppercase">
            <Sparkles size={12} />
            <span>OUR HERITAGE</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-normal text-allura-text tracking-tight uppercase">
            MORE THAN A BOUTIQUE
          </h1>
          <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
            A sanctuary of quiet luxury, bespoke craftsmanship, and timeless silhouettes situated in the heart of Perinthalmanna, Kerala.
          </p>
        </div>
      </section>

      {/* Section 1: The Story & Philosophy */}
      <section className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
              OUR JOURNEY
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal leading-tight uppercase">
              REIMAGINING TRADITION FOR THE MODERN WOMAN
            </h2>
            <div className="space-y-4 text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
              <p>
                Founded on Ooty Road in Perinthalmanna, Allura Boutique was created with a clear intention: to bridge the gap between regal South Indian ethnic heritage and effortless contemporary luxury.
              </p>
              <p>
                What began as a passion for bespoke tailoring and intimate styling consultations has grown into a cherished destination for discerning women across Kerala who seek outfits for their most unforgettable occasions.
              </p>
            </div>
            <div className="pt-2">
              <AlluraLogo size="sm" showTagline={false} clickable={false} />
            </div>
          </div>

          <div className="lg:col-span-6 relative aspect-[4/5] rounded-xl overflow-hidden shadow-luxury border border-allura-border/60">
            <img
              src="https://images.unsplash.com/photo-1583391733975-088dd9fa7182?auto=format&fit=crop&w=1000&q=85"
              alt="Allura Boutique Perinthalmanna"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Core Values Grid */}
      <section className="bg-allura-bgSecondary/40 border-y border-allura-border py-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block mb-1">
              THE THREE PILLARS
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal uppercase">
              CURATED WITH INTENTION
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-allura-card border border-allura-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark mx-auto">
                <Scissors size={20} />
              </div>
              <h4 className="font-serif text-base font-semibold uppercase text-allura-text">
                Bespoke Tailoring
              </h4>
              <p className="text-xs text-allura-muted font-sans leading-relaxed">
                Every stitch, pleat, and neckline is measured with precision to ensure a graceful, flattering silhouette for every body type.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-allura-card border border-allura-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark mx-auto">
                <Award size={20} />
              </div>
              <h4 className="font-serif text-base font-semibold uppercase text-allura-text">
                Pure Fabrics & Zari
              </h4>
              <p className="text-xs text-allura-muted font-sans leading-relaxed">
                We select only authentic Georgettes, Organzas, and Banarasi Silks with high-grade embroidery that endures for generations.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-allura-card border border-allura-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark mx-auto">
                <Heart size={20} />
              </div>
              <h4 className="font-serif text-base font-semibold uppercase text-allura-text">
                Personalized Care
              </h4>
              <p className="text-xs text-allura-muted font-sans leading-relaxed">
                Our resident stylists on WhatsApp and in our salon assist you one-on-one from initial styling ideas to doorstep delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Visit The Boutique Callout */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="bg-allura-darkBrown text-allura-card rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-luxury">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-[10px] font-sans font-bold tracking-[0.3em] uppercase text-allura-gold">
              EXPERIENCE ALLURA IN PERSON
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-medium">
              VISIT OUR PERINTHALMANNA BOUTIQUE
            </h3>
            <p className="text-xs text-allura-bgSecondary font-sans max-w-md">
              Located on Ooty Road, Perinthalmanna, Kerala. Discover our full bridal studio, try on curated pieces, and enjoy private styling.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/contact"
              className="bg-allura-card text-allura-darkBrown hover:bg-allura-bgSecondary text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-sm transition-all text-center"
            >
              GET DIRECTIONS
            </Link>
            <a
              href="https://wa.me/919037991774?text=Hello%20Allura%2C%20I%20would%20like%20to%20book%20a%20visit%20to%20your%20Perinthalmanna%20boutique."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white hover:bg-[#128C7E] text-xs font-sans font-bold tracking-[0.2em] uppercase py-3.5 px-6 rounded-sm transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} />
              <span>BOOK VISIT</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
