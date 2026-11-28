import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export const AlluraCircleSection: React.FC = () => {
  return (
    <section className="relative py-16 sm:py-20 px-6 overflow-hidden bg-[#F7E6C8] border-y border-[#561C08]/15 max-md:py-12">
      <div className="max-w-3xl mx-auto text-center relative z-10 space-y-5 sm:space-y-6 max-md:space-y-4">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#561C08]/20 text-[#561C08] text-[11px] font-heading font-bold tracking-[0.25em] uppercase shadow-xs">
          <Sparkles size={12} className="text-[#561C08]" />
          <span>GET IN TOUCH</span>
        </div>

        {/* Main Heading */}
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-[#000000] tracking-tight uppercase max-md:text-xl max-md:font-bold max-md:leading-snug">
          LET'S CONNECT WITH ALLURA
        </h2>

        {/* Description */}
        <p className="text-sm sm:text-base text-[#561C08] font-body max-w-xl mx-auto leading-relaxed font-normal">
          Have a question about our collections or need assistance finding the perfect outfit? We'd love to hear from you. Get in touch with our team and let us help you.
        </p>

        {/* Primary Contact Us Button */}
        <div className="pt-2 sm:pt-3">
          <Link
            to="/contact"
            className="group inline-flex items-center justify-center gap-2.5 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs sm:text-sm font-heading font-bold tracking-[0.2em] uppercase py-3.5 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>CONTACT US</span>
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1 shrink-0"
            />
          </Link>
        </div>
      </div>
    </section>
  );
};
