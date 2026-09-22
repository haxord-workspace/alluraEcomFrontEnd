import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Truck,
  Sparkles,
  Tag,
  MessageCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ui/ProductCard';
import type { CartItem, Product } from '../types';

export const CartPage: React.FC = () => {
  const {
    products,
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    freeShippingRemaining,
    freeShippingProgress,
    formatPrice,
    showToast,
  } = useShop();

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'ALLURA10' || code === 'FIRST10') {
      const disc = Math.round(cartSubtotal * 0.1);
      setDiscount(disc);
      setAppliedPromo(code);
      showToast(`Promo code ${code} applied! 10% off.`, 'gold');
    } else {
      showToast('Invalid promo code. Try ALLURA10', 'info');
    }
  };

  const finalTotal = cartSubtotal - discount + (freeShippingRemaining === 0 ? 0 : 150);

  const recommendedItems = products.filter(
    (p: Product) => !cart.some((c: CartItem) => c.product.id === p.id)
  ).slice(0, 4);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-gold mx-auto">
          <ShoppingBag size={36} />
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal uppercase">
          YOUR SHOPPING BAG IS EMPTY
        </h1>
        <p className="text-xs sm:text-sm text-allura-muted font-sans max-w-md mx-auto leading-relaxed">
          Looks like you haven't added any luxury pieces to your bag yet. Explore our latest curations.
        </p>
        <div className="pt-4">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-3.5 px-8 rounded-sm shadow-luxury transition-all"
          >
            <span>START SHOPPING</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-12">
      {/* Header */}
      <div>
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
          YOUR SELECTION
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal uppercase tracking-tight">
          SHOPPING BAG ({cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)})
        </h1>
      </div>

      {/* Free Shipping Meter */}
      <div className="bg-allura-card p-4 sm:p-5 rounded-xl border border-allura-border shadow-xs">
        <div className="flex items-center justify-between text-xs font-medium text-allura-text mb-2">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-allura-goldDark" />
            <span>
              {freeShippingRemaining > 0 ? (
                <>
                  Add <strong className="text-allura-goldDark">{formatPrice(freeShippingRemaining)}</strong> more to get <strong className="text-allura-darkBrown">FREE SHIPPING</strong>
                </>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Sparkles size={14} /> You've unlocked FREE SHIPPING across India!
                </span>
              )}
            </span>
          </div>
          <span className="text-xs text-allura-muted">Threshold ₹2,999</span>
        </div>
        <div className="w-full h-2 bg-allura-bgSecondary rounded-full overflow-hidden">
          <div
            className="h-full bg-allura-gold transition-all duration-500 rounded-full"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      {/* Main Grid: Cart Items (8 cols) + Order Summary (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item: CartItem) => (
            <div
              key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
              className="flex flex-col sm:flex-row gap-5 p-4 sm:p-6 rounded-xl border border-allura-border bg-allura-card shadow-xs"
            >
              {/* Image */}
              <Link
                to={`/product/${item.product.slug}`}
                className="w-full sm:w-28 h-36 rounded-lg overflow-hidden flex-shrink-0 bg-allura-bgSecondary"
              >
                <img
                  src={item.product.images.primary}
                  alt={item.product.name}
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform"
                />
              </Link>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-sans font-medium text-allura-goldDark uppercase tracking-widest">
                      {item.product.category}
                    </span>
                    <h3 className="font-serif text-lg font-medium text-allura-text">
                      <Link to={`/product/${item.product.slug}`} className="hover:text-allura-goldDark">
                        {item.product.name}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-allura-muted mt-1 font-sans">
                      <span>Size: <strong className="text-allura-text">{item.selectedSize}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        Color:
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full border border-allura-border"
                          style={{ backgroundColor: item.selectedColor.hex }}
                        />
                        <strong className="text-allura-text">{item.selectedColor.name}</strong>
                      </span>
                    </div>
                  </div>

                  <p className="font-serif text-lg font-semibold text-allura-darkBrown">
                    {formatPrice(item.product.price * item.quantity)}
                  </p>
                </div>

                {/* Quantity Controls & Remove */}
                <div className="flex items-center justify-between pt-2 border-t border-allura-border/60">
                  <div className="flex items-center border border-allura-border rounded bg-allura-bg">
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor.name,
                          item.quantity - 1
                        )
                      }
                      className="p-1.5 px-3 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold px-3 text-allura-text">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.selectedSize,
                          item.selectedColor.name,
                          item.quantity + 1
                        )
                      }
                      className="p-1.5 px-3 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      removeFromCart(
                        item.product.id,
                        item.selectedSize,
                        item.selectedColor.name
                      )
                    }
                    className="flex items-center gap-1 text-xs text-allura-muted hover:text-red-700 font-sans transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-4 bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-luxury space-y-6 sticky top-24">
          <h3 className="font-serif text-xl font-semibold uppercase tracking-wide text-allura-text border-b border-allura-border pb-3">
            ORDER SUMMARY
          </h3>

          {/* Pricing Breakdown */}
          <div className="space-y-2.5 text-xs font-sans text-allura-muted">
            <div className="flex justify-between items-center">
              <span>Bag Subtotal</span>
              <span className="font-semibold text-allura-text text-sm">{formatPrice(cartSubtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold">
                <span>Boutique Discount ({appliedPromo})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span>Estimated Shipping</span>
              <span>
                {freeShippingRemaining === 0 ? (
                  <strong className="text-emerald-700 uppercase">FREE</strong>
                ) : (
                  '₹ 150'
                )}
              </span>
            </div>

            <div className="flex justify-between items-center text-base font-serif font-semibold text-allura-text pt-3 border-t border-allura-border">
              <span>Total Amount</span>
              <span className="text-xl text-allura-goldDark">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          {/* Promo Code Input */}
          <form onSubmit={handleApplyPromo} className="space-y-2 pt-2 border-t border-allura-border/60">
            <label className="text-[11px] font-bold text-allura-darkBrown uppercase tracking-wider flex items-center gap-1">
              <Tag size={12} />
              <span>HAVE A PROMO CODE?</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="e.g. ALLURA10"
                className="flex-1 bg-allura-bg border border-allura-border rounded px-3 py-2 text-xs uppercase font-sans tracking-wider text-allura-text focus:outline-none focus:border-allura-gold"
              />
              <button
                type="submit"
                className="bg-allura-darkBrown hover:bg-allura-goldDark text-allura-card text-xs font-sans font-bold tracking-wider uppercase px-4 py-2 rounded transition-colors"
              >
                APPLY
              </button>
            </div>
          </form>

          {/* Checkout CTA */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-4 px-6 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-luxury"
            >
              <span>PROCEED TO CHECKOUT</span>
              <ArrowRight size={15} />
            </button>

            <div className="text-center">
              <a
                href="https://wa.me/919037991774?text=Hello%20Allura%2C%20I%20have%20questions%20regarding%20my%20bag%20items%20before%20placing%20the%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-sans text-allura-goldDark hover:text-allura-darkBrown flex items-center justify-center gap-1 underline tracking-wider uppercase"
              >
                <MessageCircle size={13} />
                <span>Order Assistance on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Items */}
      <section className="pt-12 border-t border-allura-border/60">
        <h2 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal uppercase mb-8">
          RECOMMENDED FOR YOUR WARDROBE
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {recommendedItems.map((p: Product) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
};
