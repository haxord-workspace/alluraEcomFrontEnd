import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles, Truck } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    freeShippingRemaining,
    freeShippingProgress,
    formatPrice,
  } = useShop();

  const navigate = useNavigate();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-allura-darkBrown/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Slide-in Panel */}
      <div className="relative w-full max-w-md bg-allura-card h-full flex flex-col z-10 shadow-drawer overflow-hidden animate-slide-up sm:animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-allura-border flex items-center justify-between bg-allura-card">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={18} className="text-allura-gold" />
            <h3 className="font-serif text-lg tracking-wide uppercase font-semibold text-allura-text">
              YOUR SHOPPING BAG ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h3>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-allura-muted hover:text-allura-text transition-colors rounded-full hover:bg-allura-bgSecondary"
            aria-label="Close cart drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div className="bg-allura-bg p-4 border-b border-allura-border">
          <div className="flex items-center justify-between text-xs font-medium text-allura-text mb-2">
            <div className="flex items-center gap-1.5">
              <Truck size={14} className="text-allura-goldDark" />
              <span>
                {freeShippingRemaining > 0 ? (
                  <>
                    Add <strong className="text-allura-goldDark">{formatPrice(freeShippingRemaining)}</strong> more for <strong className="text-allura-darkBrown">FREE SHIPPING</strong>
                  </>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Sparkles size={13} /> You've unlocked FREE SHIPPING!
                  </span>
                )}
              </span>
            </div>
            <span className="text-[10px] text-allura-muted">Threshold ₹2,999</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-allura-border rounded-full overflow-hidden">
            <div
              className="h-full bg-allura-gold transition-all duration-500 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-gold">
                <ShoppingBag size={28} />
              </div>
              <h4 className="font-serif text-xl text-allura-text font-medium">Your Bag is Empty</h4>
              <p className="text-xs text-allura-muted font-sans max-w-xs leading-relaxed">
                Discover our curated ethnic, party wear and western collections crafted with quiet luxury.
              </p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
                className="bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-semibold tracking-[0.2em] uppercase py-3 px-6 rounded-sm transition-all"
              >
                EXPLORE COLLECTION
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={`${item.product.id}-${item.selectedSize}-${item.selectedColor.name}`}
                className="flex gap-4 p-3 rounded-lg border border-allura-border/60 bg-allura-card/70 hover:border-allura-border transition-all"
              >
                {/* Product Image */}
                <Link
                  to={`/product/${item.product.slug}`}
                  onClick={() => setIsCartOpen(false)}
                  className="w-20 h-24 rounded overflow-hidden flex-shrink-0 bg-allura-bgSecondary"
                >
                  <img
                    src={item.product.images.primary}
                    alt={item.product.name}
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/product/${item.product.slug}`}
                        onClick={() => setIsCartOpen(false)}
                        className="font-serif text-sm font-medium text-allura-text hover:text-allura-goldDark transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <button
                        onClick={() =>
                          removeFromCart(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor.name
                          )
                        }
                        className="text-allura-muted hover:text-red-700 transition-colors p-1"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="text-[11px] text-allura-muted mt-1 flex items-center gap-2">
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

                    <p className="font-serif text-sm font-semibold text-allura-text mt-1">
                      {formatPrice(item.product.price)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between pt-2">
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
                        className="p-1 px-2 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-semibold px-2 text-allura-text">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product.id,
                            item.selectedSize,
                            item.selectedColor.name,
                            item.quantity + 1
                          )
                        }
                        className="p-1 px-2 text-allura-text hover:bg-allura-bgSecondary transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <span className="text-xs font-semibold text-allura-darkBrown">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-5 bg-allura-bg border-t border-allura-border space-y-4">
            <div className="space-y-1.5 text-xs text-allura-muted">
              <div className="flex justify-between items-center">
                <span>Bag Subtotal</span>
                <span className="font-semibold text-allura-text text-sm">{formatPrice(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Shipping (Kerala & India)</span>
                <span>
                  {freeShippingRemaining === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase tracking-wider">FREE</span>
                  ) : (
                    '₹ 150 (Free above ₹2,999)'
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-serif font-semibold text-allura-text pt-2 border-t border-allura-border/60">
                <span>Estimated Total</span>
                <span className="text-base text-allura-goldDark">
                  {formatPrice(cartSubtotal + (freeShippingRemaining === 0 ? 0 : 150))}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="w-full bg-allura-goldDark hover:bg-allura-darkBrown text-allura-card text-xs font-sans font-bold tracking-[0.25em] uppercase py-3.5 px-4 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-subtle"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/cart');
                }}
                className="w-full bg-transparent hover:bg-allura-card text-allura-text border border-allura-border text-xs font-sans font-semibold tracking-[0.2em] uppercase py-2.5 px-4 rounded-sm transition-colors"
              >
                VIEW FULL BAG
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
