import React, { useState } from 'react';
import { Search, ChevronDown, HelpCircle, MessageCircle, ArrowRight } from 'lucide-react';
import { mockFaqsData } from '../../data/mockFaqs';
import { Link } from 'react-router-dom';

export const FaqPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openFaqId, setOpenFaqId] = useState<string | null>(mockFaqsData[0].id);

  const categories = ['All', 'Orders', 'Payments', 'Shipping', 'Returns', 'Sizing', 'Products'];

  const filteredFaqs = mockFaqsData.filter(faq => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesQuery =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const toggleFaq = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-allura-goldDark uppercase">
          CUSTOMER CONCIERGE & ASSISTANCE
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm font-sans text-allura-muted leading-relaxed">
          Find instant answers to questions regarding ordering, sizing, bespoke fitting, and Delhivery luxury courier delivery.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto pt-2">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-allura-muted" />
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-allura-card border border-allura-border rounded-2xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold shadow-subtle"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex justify-center gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-allura-darkBrown text-white shadow-xs'
                : 'bg-allura-card text-allura-muted hover:text-allura-text border border-allura-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      {filteredFaqs.length === 0 ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-3 shadow-subtle">
          <HelpCircle size={28} className="mx-auto text-allura-goldDark" />
          <h3 className="font-serif text-lg text-allura-text">No matching questions found</h3>
          <p className="text-xs font-sans text-allura-muted">
            Can’t find what you’re looking for? Reach out directly to our Perinthalmanna boutique team.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map(faq => {
            const isOpen = openFaqId === faq.id;

            return (
              <div
                key={faq.id}
                className="bg-allura-card border border-allura-border rounded-2xl shadow-subtle overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-goldDark bg-allura-bgSecondary px-2.5 py-1 rounded-md">
                      {faq.category}
                    </span>
                    <h3 className="font-serif text-base sm:text-lg text-allura-text font-normal">
                      {faq.question}
                    </h3>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-allura-muted transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-allura-goldDark' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm font-sans text-allura-muted leading-relaxed border-t border-allura-border/40 animate-fade-in mt-1">
                    <p className="pt-4">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Need more help CTA */}
      <div className="bg-allura-bgSecondary/60 border border-allura-border rounded-2xl p-8 text-center space-y-4">
        <h3 className="font-serif text-2xl text-allura-text font-normal">Still have questions?</h3>
        <p className="text-xs font-sans text-allura-muted max-w-md mx-auto">
          Our senior boutique stylists in Kerala are available daily from 10:00 AM to 8:00 PM IST on WhatsApp.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20have%20a%20question%20about%20your%20boutique."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider shadow-md hover:bg-[#1EBE5D] transition-colors"
          >
            <MessageCircle size={15} />
            <span>Chat on WhatsApp</span>
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
          >
            <span>Visit Boutique / Contact Us</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
