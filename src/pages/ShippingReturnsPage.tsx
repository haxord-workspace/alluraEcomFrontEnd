import React from 'react';
import { Truck, RefreshCw, HelpCircle } from 'lucide-react';

export const ShippingReturnsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-[11px] font-sans font-bold tracking-[0.28em] uppercase text-allura-goldDark">
          CLIENT CARE
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal uppercase tracking-tight">
          SHIPPING & EXCHANGE POLICY
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans max-w-lg mx-auto leading-relaxed">
          Transparent, reliable, and client-first boutique policies for all Kerala and national orders.
        </p>
      </div>

      {/* Policies */}
      <div className="space-y-8">
        {/* Shipping */}
        <div className="bg-allura-card rounded-2xl border border-allura-border p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
              <Truck size={20} />
            </div>
            <h2 className="font-serif text-xl font-semibold uppercase text-allura-text">
              Shipping & Delivery
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-allura-muted font-sans space-y-3 leading-relaxed">
            <p>
              • <strong>Free Shipping:</strong> All orders above ₹2,999 qualify for complimentary express shipping anywhere in India.
            </p>
            <p>
              • <strong>Kerala Express Delivery:</strong> Orders within Malappuram, Kozhikode, Ernakulam, and all Kerala districts are delivered within 2–3 business days.
            </p>
            <p>
              • <strong>National Delivery:</strong> Rest of India orders are dispatched via premium couriers (BlueDart / DTDC) and arrive in 4–6 business days.
            </p>
            <p>
              • <strong>In-Store Pickup:</strong> Select "In-Store Pickup" at checkout to collect your order in person from our Perinthalmanna boutique on Ooty Road.
            </p>
          </div>
        </div>

        {/* Exchange & Returns */}
        <div id="exchange" className="bg-allura-card rounded-2xl border border-allura-border p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
              <RefreshCw size={20} />
            </div>
            <h2 className="font-serif text-xl font-semibold uppercase text-allura-text">
              7-Day Easy Exchange Policy
            </h2>
          </div>

          <div className="text-xs sm:text-sm text-allura-muted font-sans space-y-3 leading-relaxed">
            <p>
              • <strong>Eligibility:</strong> If an outfit does not fit as desired or you prefer a different color/silhouette, you may request an exchange within 7 days of delivery.
            </p>
            <p>
              • <strong>Condition:</strong> Items must be unwashed, unworn, with all original tags and boutique invoice intact.
            </p>
            <p>
              • <strong>WhatsApp Initiation:</strong> To initiate an exchange, simply WhatsApp us at <strong>+91 9037991774</strong> with your order reference number. Our team will arrange reverse pickup.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div id="faqs" className="bg-allura-card rounded-2xl border border-allura-border p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-goldDark">
              <HelpCircle size={20} />
            </div>
            <h2 className="font-serif text-xl font-semibold uppercase text-allura-text">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm font-sans divide-y divide-allura-border/60">
            <div className="pt-3">
              <h4 className="font-serif text-base font-semibold text-allura-text">
                Can I customize bridal lehengas or blouse stitching?
              </h4>
              <p className="text-allura-muted mt-1">
                Yes! We offer bespoke stitching and bridal customizations at our Perinthalmanna atelier. Reach out on WhatsApp or visit our salon to discuss measurements.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-serif text-base font-semibold text-allura-text">
                Is Cash on Delivery (COD) supported?
              </h4>
              <p className="text-allura-muted mt-1">
                Yes, COD is available for all serviceable pin codes in Kerala and India up to ₹15,000.
              </p>
            </div>

            <div className="pt-3">
              <h4 className="font-serif text-base font-semibold text-allura-text">
                How do I track my order?
              </h4>
              <p className="text-allura-muted mt-1">
                Once dispatched, tracking links are sent via SMS and WhatsApp. You can also view live tracking directly in your Allura Account dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
