import React, { useState } from 'react';
import { Tag, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { Link, useNavigate } from 'react-router-dom';

export const OffersPage: React.FC = () => {
  const { applyCoupon, appliedCoupon, formatPrice, showToast } = useShop();
  const { coupons, promotions } = useAdmin();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Code "${code}" copied to clipboard!`, 'gold');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApplyAndShop = (code: string) => {
    applyCoupon(code);
    navigate('/shop');
  };

  const activePromos = promotions && promotions.length > 0 ? promotions : [];
  const activeCoupons = (coupons || []).filter(c => c.status === 'Active');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-allura-goldDark uppercase">
          EXCLUSIVE PRIVILEGES & REWARDS
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal tracking-tight">
          Allura Boutique Offers
        </h1>
        <p className="text-xs sm:text-sm font-sans text-allura-muted leading-relaxed">
          Quiet luxury courtesies, private invitations, and celebratory privileges for our cherished patrons.
        </p>
      </div>

      {/* Active Promotion Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activePromos.map(promo => (
          <div
            key={promo.id}
            className="bg-gradient-to-br from-allura-bgSecondary to-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-subtle flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-allura-gold/15 text-allura-goldDark text-[10px] font-sans font-bold uppercase tracking-wider">
                <Sparkles size={12} />
                <span>{promo.type}</span>
              </span>
              <h3 className="font-serif text-2xl text-allura-text font-normal">{promo.title}</h3>
              <p className="text-xs font-sans text-allura-muted leading-relaxed">{promo.conditions}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-allura-border/60">
              <div>
                <span className="text-[10px] font-sans uppercase font-bold tracking-wider text-allura-muted">Benefit</span>
                <p className="font-serif text-lg font-bold text-allura-darkBrown">{promo.discount}</p>
              </div>
              <Link
                to="/shop"
                className="px-4 py-2 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span>Shop Collection</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Available Coupon Cards */}
      <div className="space-y-6">
        <div className="flex items-end justify-between border-b border-allura-border/60 pb-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              Available Couture Coupons
            </h2>
            <p className="text-xs font-sans text-allura-muted mt-0.5">
              Apply at checkout or tap below to activate directly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeCoupons.map(coupon => {
            const isApplied = appliedCoupon?.code === coupon.code;

            return (
              <div
                key={coupon.id}
                className={`bg-allura-card border rounded-2xl p-6 shadow-subtle flex flex-col justify-between space-y-6 transition-all ${
                  isApplied ? 'border-allura-gold bg-allura-gold/5 shadow-md' : 'border-allura-border hover:border-allura-gold/60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-2xl font-bold text-allura-darkBrown tracking-wider">
                        {coupon.code}
                      </span>
                      {coupon.isExclusive && (
                        <span className="text-[9px] font-sans bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          VIP Exclusive
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-sans text-allura-muted leading-relaxed">
                      {coupon.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCopy(coupon.code)}
                    title="Copy coupon code"
                    className="p-2.5 rounded-xl border border-allura-border bg-allura-bg hover:bg-allura-bgSecondary text-allura-muted hover:text-allura-text transition-colors flex items-center gap-1.5 text-xs font-sans"
                  >
                    {copiedCode === coupon.code ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                    <span className="hidden sm:inline">{copiedCode === coupon.code ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-xs font-sans text-allura-muted space-y-1 pt-2 border-t border-dashed border-allura-border">
                  <p>Minimum Order: <strong>{formatPrice(coupon.minOrderValue)}</strong></p>
                  {coupon.maxDiscount && <p>Maximum Savings: <strong>{formatPrice(coupon.maxDiscount)}</strong></p>}
                  <p>Valid Through: <strong>{coupon.endDate}</strong></p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-sans text-allura-muted">
                    Applicable on all handcrafted categories
                  </span>

                  <button
                    type="button"
                    onClick={() => handleApplyAndShop(coupon.code)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      isApplied
                        ? 'bg-emerald-700 text-white cursor-default'
                        : 'bg-allura-darkBrown hover:bg-allura-softBrown text-white'
                    }`}
                  >
                    <Tag size={13} />
                    <span>{isApplied ? 'Applied ✓' : 'Apply & Shop'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
