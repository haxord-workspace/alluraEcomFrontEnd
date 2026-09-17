import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const announcements = [
    'FREE SHIPPING ON ORDERS ABOVE ₹2,999',
    'HANDCRAFTED DESIGNER & ETHNIC WEAR',
    'EXPRESS COURIER & WHATSAPP SUPPORT',
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <div className="bg-[#8B6335] text-[#FCFAF6] py-2 px-3 sm:px-4 text-[10px] sm:text-[11px] font-sans tracking-[0.22em] uppercase font-medium flex items-center justify-between border-b border-[#735028] select-none">
      <button
        onClick={() =>
          setCurrentIndex(prev => (prev === 0 ? announcements.length - 1 : prev - 1))
        }
        className="hidden sm:flex opacity-70 hover:opacity-100 p-0.5 transition-opacity"
        aria-label="Previous notice"
      >
        <ChevronLeft size={13} />
      </button>

      {/* Desktop Full Strip */}
      <div className="hidden md:flex flex-1 text-center items-center justify-center gap-4 whitespace-nowrap">
        <span>FREE SHIPPING ON ORDERS ABOVE ₹2,999</span>
        <span className="opacity-60">•</span>
        <span>EASY 7-DAY EXCHANGE</span>
        <span className="opacity-60">•</span>
        <span>WHATSAPP STYLIST SUPPORT</span>
      </div>

      {/* Mobile Rotating Single Line with smooth fade */}
      <div className="md:hidden flex-1 text-center overflow-hidden px-2">
        <span className="inline-block transition-all duration-500 transform truncate max-w-[320px]">
          {announcements[currentIndex]}
        </span>
      </div>

      <button
        onClick={() => setCurrentIndex(prev => (prev + 1) % announcements.length)}
        className="hidden sm:flex opacity-70 hover:opacity-100 p-0.5 transition-opacity"
        aria-label="Next notice"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
};

