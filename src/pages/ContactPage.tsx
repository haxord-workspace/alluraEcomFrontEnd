import React, { useState } from 'react';
import { Phone, MapPin, MessageCircle, Send, CheckCircle2, Navigation, Loader2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useStoreAddress } from '../hooks/useStoreAddress';
import { cleanProfileValue, formatPhoneDisplay, phoneDigits, storeDisplayName } from '../utils/storeProfile';
import { submitPublicContactInquiry, contactInquiryErrorMessage } from '../service/contactInquiries';

/** Skeleton in the same size as an info card, so the layout doesn't jump while settings load */
const InfoCardSkeleton: React.FC<{ rows?: number }> = ({ rows = 1 }) => (
  <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-3 animate-pulse" aria-hidden="true">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-allura-bgSecondary" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-40 rounded bg-allura-bgSecondary" />
        <div className="h-3 w-56 max-w-full rounded bg-allura-bgSecondary" />
      </div>
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-10 w-full rounded-lg bg-allura-bgSecondary" />
    ))}
  </div>
);

function validateEnquiry(name: string, phone: string, message: string): string | null {
  const trimmedName = name.trim();
  if (!trimmedName) return 'Name is required.';
  if (trimmedName.length < 2) return 'Name must be at least 2 characters.';
  if (trimmedName.length > 80) return 'Name must not exceed 80 characters.';

  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return 'Phone number is required.';
  const digits = trimmedPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return 'Please enter a valid phone number (10 to 15 digits).';
  }

  if (message.length > 2000) {
    return 'Message must not exceed 2000 characters.';
  }

  return null;
}

export const ContactPage: React.FC = () => {
  const { showToast, storeSettings, storeSettingsStatus } = useShop();
  // Same shared GET /store/settings data the Footer uses (fetched once in ShopContext)
  const { address, mapsUrl } = useStoreAddress();
  const profile = storeSettings?.boutiqueProfile;
  const storeName = storeDisplayName(profile?.legalName);
  const whatsappNumber = cleanProfileValue(profile?.whatsappNumber);
  const whatsappDigits = phoneDigits(whatsappNumber);

  // One button per number. Settings currently expose a single number (whatsappNumber);
  // add more sources here if the API gains extra phone fields.
  const phoneNumbers = Array.from(new Set([whatsappNumber].filter((n): n is string => !!n && !!phoneDigits(n))));

  const isSettingsLoading = storeSettingsStatus === 'loading' && !storeSettings;
  const isSettingsError = storeSettingsStatus === 'error' && !storeSettings;
  const hasLocation = !!address;
  const hasContact = phoneNumbers.length > 0 || !!whatsappDigits;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [occasion, setOccasion] = useState('Bridal');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validateEnquiry(name, phone, message);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitPublicContactInquiry({
        name: name.trim(),
        phone: phone.trim(),
        occasionType: occasion || undefined,
        message: message.trim() || undefined,
        website: website || '',
      });

      setSubmittedName(name.trim());
      setSubmittedPhone(phone.trim());
      setIsSubmitted(true);
      const successMsg =
        response?.message ||
        (storeName ? `Enquiry sent to ${storeName} stylists!` : 'Enquiry sent to our stylists!');
      showToast(successMsg, 'gold');
    } catch (err: any) {
      const errorMsg = contactInquiryErrorMessage(err, 'Failed to submit enquiry. Please try again.');
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setOccasion('Bridal');
    setMessage('');
    setWebsite('');
    setIsSubmitted(false);
  };

  const handleOpenWhatsApp = () => {
    if (!whatsappDigits) return;
    const greeting = storeName ? `Hello ${storeName}, ` : 'Hello, ';
    const text = `${greeting}I would like to enquire about boutique timings and location.`;
    window.open(`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-16 space-y-8 sm:space-y-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark">
          SALON & ATELIER
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal uppercase tracking-tight">
          WE'D LOVE TO HEAR FROM YOU
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans leading-relaxed">
          Visit our boutique or connect directly with {storeName ? `${storeName}'s` : 'our'} stylists for custom measurements and order enquiries.
        </p>
      </div>

      {/* Main Grid: Info Cards + Interactive Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Store Information Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {isSettingsLoading && (
            <>
              <InfoCardSkeleton />
              <InfoCardSkeleton rows={2} />
            </>
          )}

          {/* Request failed, or the settings have no contact details at all */}
          {(isSettingsError || (!isSettingsLoading && !hasLocation && !hasContact)) && (
            <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs">
              <p className="text-xs text-allura-muted font-sans">
                Contact details are unavailable right now. Please try again later.
              </p>
            </div>
          )}

          {/* Location Card — boutiqueProfile.address */}
          {hasLocation && (
            <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold uppercase text-allura-text">
                    Boutique Location
                  </h3>
                  {address && (
                    <p className="text-xs text-allura-muted font-sans">
                      {address}
                    </p>
                  )}
                </div>
              </div>
              {mapsUrl && (
                <div className="pt-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-sans font-bold text-allura-goldDark hover:text-allura-darkBrown uppercase tracking-wider"
                  >
                    <Navigation size={13} />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Contact Numbers — boutiqueProfile.whatsappNumber */}
          {hasContact && (
            <div className="p-6 rounded-xl bg-allura-card border border-allura-border shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold uppercase text-allura-text">
                    Direct Phone & WhatsApp
                  </h3>
                </div>
              </div>

              {phoneNumbers.length > 0 && (
                <div className={`grid grid-cols-1 ${phoneNumbers.length > 1 ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
                  {phoneNumbers.map(number => (
                    <a
                      key={number}
                      href={`tel:+${phoneDigits(number)}`}
                      className="p-3 rounded-lg border border-allura-border/80 bg-allura-bg hover:border-allura-gold text-xs font-sans text-allura-text flex items-center justify-between"
                    >
                      <span>{formatPhoneDisplay(number)}</span>
                      <Phone size={13} className="text-allura-muted" />
                    </a>
                  ))}
                </div>
              )}

              {whatsappDigits && (
                <button
                  onClick={handleOpenWhatsApp}
                  className="w-full bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/40 py-2.5 px-4 rounded text-xs font-sans font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle size={15} />
                  <span>Instant WhatsApp Stylist Desk</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Interactive Enquiry Form (7 cols) */}
        <div className="lg:col-span-7 bg-allura-card p-6 sm:p-10 rounded-2xl border border-allura-border shadow-luxury">
          {isSubmitted ? (
            <div className="py-16 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-allura-text">
                Thank you, {submittedName}!
              </h3>
              <p className="text-xs sm:text-sm text-allura-muted font-sans max-w-sm mx-auto leading-relaxed">
                {storeName ? `A ${storeName} stylist` : 'Our stylist'} will reach out on WhatsApp / Phone ({submittedPhone}) shortly to assist you.
              </p>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-sans font-bold text-allura-goldDark hover:text-allura-darkBrown underline uppercase tracking-wider"
              >
                Send another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field (hidden from genuine users) */}
              <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
                <label htmlFor="website-field">Website</label>
                <input
                  id="website-field"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </div>

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
                    placeholder="Enter your name"
                    required
                    maxLength={80}
                    disabled={isSubmitting}
                    className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans disabled:opacity-60"
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
                    placeholder="Enter your phone number"
                    required
                    disabled={isSubmitting}
                    className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans disabled:opacity-60"
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
                  disabled={isSubmitting}
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans cursor-pointer disabled:opacity-60"
                >
                  <option value="Bridal">Bridal Couture & Lehengas</option>
                  <option value="Festive">Festive Celebration (Eid / Onam / Diwali)</option>
                  <option value="Party Wear">Evening Gown / Party Wear</option>
                  <option value="Western">Western Co-ords & Maxis</option>
                  <option value="Custom">Custom Stitching & Sizing Advice</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-allura-darkBrown uppercase tracking-wider">
                    Your Message or Outfit Requirements
                  </label>
                  {message.length > 0 && (
                    <span className={`text-[10px] font-sans ${message.length > 2000 ? 'text-rose-600 font-bold' : 'text-allura-muted'}`}>
                      {message.length} / 2000
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={2000}
                  disabled={isSubmitting}
                  placeholder="Tell us about the design, size, or event date you have in mind..."
                  className="w-full bg-allura-bg border border-allura-border rounded p-3 text-xs sm:text-sm text-allura-text focus:outline-none focus:border-allura-gold font-sans resize-none disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-allura-goldDark hover:bg-allura-darkBrown disabled:opacity-60 disabled:cursor-not-allowed text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-4 px-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-luxury"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>SUBMITTING...</span>
                  </>
                ) : (
                  <>
                    <span>SUBMIT ENQUIRY</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
