import React, { useState } from 'react';
import { Phone, MapPin, Clock, MessageCircle, Send, CheckCircle2, Navigation } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const ContactPage: React.FC = () => {
  const { showToast } = useShop();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [occasion, setOccasion] = useState('Bridal');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('Please provide your name and phone number', 'info');
      return;
    }
    setIsSubmitted(true);
    showToast('Enquiry sent to Allura Stylists!', 'gold');
  };

  const handleOpenWhatsApp = () => {
    window.open(
      'https://wa.me/919037991774?text=Hello%20Allura%20Boutique%2C%20I%20would%20like%20to%20enquire%20about%20boutique%20timings%20and%20location.',
      '_blank'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark">
          SALON & ATELIER
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal uppercase tracking-tight">
          WE'D LOVE TO HEAR FROM YOU
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
          Visit our boutique in Perinthalmanna or connect directly with an Allura stylist for custom measurements and order enquiries.
        </p>
      </div>

      {/* Main Grid: Info Cards + Interactive Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Store Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Location Card */}
          <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold uppercase text-allura-text">
                  Boutique Location
                </h3>
                <p className="text-xs text-allura-muted font-sans">
                  Ooty Road, Perinthalmanna, Malappuram, Kerala - 679322
                </p>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="https://maps.google.com/?q=Allura+Boutique+Perinthalmanna"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-sans font-bold text-allura-goldDark hover:text-allura-darkBrown uppercase tracking-wider"
              >
                <Navigation size={13} />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
                <Phone size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold uppercase text-allura-text">
                  Direct Phone & WhatsApp
                </h3>
                <p className="text-xs text-allura-muted font-sans">Available 10 AM to 8:30 PM daily</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="tel:+919037991774"
                className="p-3 rounded-lg border border-allura-border/80 bg-allura-bg hover:border-allura-gold text-xs font-sans text-allura-text flex items-center justify-between"
              >
                <span>+91 9037991774</span>
                <Phone size={13} className="text-allura-muted" />
              </a>

              <a
                href="tel:+919207801775"
                className="p-3 rounded-lg border border-allura-border/80 bg-allura-bg hover:border-allura-gold text-xs font-sans text-allura-text flex items-center justify-between"
              >
                <span>+91 9207801775</span>
                <Phone size={13} className="text-allura-muted" />
              </a>
            </div>

            <button
              onClick={handleOpenWhatsApp}
              className="w-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/40 py-2.5 px-4 rounded text-xs font-sans font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} />
              <span>Instant WhatsApp Stylist Desk</span>
            </button>
          </div>

          {/* Opening Hours */}
          <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold uppercase text-allura-text">
                  Boutique Hours
                </h3>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-allura-muted font-sans pt-1">
              <div className="flex justify-between">
                <span>Monday - Saturday:</span>
                <strong className="text-allura-text">10:00 AM – 8:30 PM</strong>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <strong className="text-allura-text">1:30 PM – 8:30 PM</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Enquiry Form (7 cols) */}
        <div className="lg:col-span-7 bg-allura-card p-6 sm:p-10 rounded-2xl border border-allura-border shadow-luxury">
          {isSubmitted ? (
            <div className="py-16 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-allura-text">
                Thank you, {name}!
              </h3>
              <p className="text-xs sm:text-sm text-allura-muted font-sans max-w-sm mx-auto leading-relaxed">
                An Allura Boutique stylist will reach out on WhatsApp / Phone ({phone}) shortly to assist you.
              </p>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs font-sans font-bold text-allura-goldDark hover:text-allura-darkBrown underline uppercase tracking-wider"
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
                  PERSONAL CONSULTATION
                </span>
                <h3 className="font-serif text-2xl font-medium text-allura-text uppercase">
                  SEND A STYLING ENQUIRY
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Fathima / Ananya"
                    required
                    className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
                    WhatsApp / Phone *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +91 9037991774"
                    required
                    className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
                  Occasion Type
                </label>
                <select
                  value={occasion}
                  onChange={e => setOccasion(e.target.value)}
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans cursor-pointer"
                >
                  <option value="Bridal">Bridal Couture & Lehengas</option>
                  <option value="Festive">Festive Celebration (Eid / Onam / Diwali)</option>
                  <option value="Party Wear">Evening Gown / Party Wear</option>
                  <option value="Western">Western Co-ords & Maxis</option>
                  <option value="Custom">Custom Stitching & Sizing Advice</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
                  Your Message or Outfit Requirements
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us about the design, size, or event date you have in mind..."
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-4 px-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-luxury"
              >
                <span>SUBMIT ENQUIRY</span>
                <Send size={14} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
