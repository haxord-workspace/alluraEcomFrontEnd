import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  ShoppingBag, 
  RotateCcw, 
  MessageCircle, 
  Package, 
  ArrowRight,
  HelpCircle 
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { mockAISuggestedPrompts } from '../../data/mockAIKnowledge';
import { Link } from 'react-router-dom';

export const AlluraAIAssistant: React.FC = () => {
  const {
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    aiMessages,
    isAITyping,
    sendAIMessage,
    clearAIConversation,
    addToCart,
    formatPrice,
  } = useShop();

  const [inputPrompt, setInputPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAIAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAITyping, isAIAssistantOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAITyping) return;
    const msg = inputPrompt.trim();
    setInputPrompt('');
    sendAIMessage(msg);
  };

  const handleSuggestedClick = (prompt: string) => {
    if (isAITyping) return;
    sendAIMessage(prompt);
  };

  return (
    <>
      {/* Floating Trigger Button (Positioned above WhatsApp & mobile nav) */}
      {!isAIAssistantOpen && (
        <button
          onClick={() => setIsAIAssistantOpen(true)}
          className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 z-40 bg-allura-card text-allura-darkBrown border border-allura-gold/40 shadow-luxury hover:shadow-2xl rounded-full p-3.5 sm:px-5 sm:py-3 flex items-center gap-2.5 transition-all duration-300 hover:scale-105 group"
          aria-label="Open Allura AI Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-allura-gold to-allura-goldLight flex items-center justify-center text-white shadow-sm">
            <Sparkles size={16} className="animate-pulse-subtle" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
              ALLURA AI
            </span>
            <span className="block text-xs font-serif font-medium text-allura-text">
              Personal Fashion Stylist
            </span>
          </div>
        </button>
      )}

      {/* Slide-in / Centered Modal Assistant */}
      {isAIAssistantOpen && (
        <div className="fixed inset-0 z-50 flex justify-end p-0 sm:p-6 bg-allura-darkBrown/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-allura-card border border-allura-border w-full sm:max-w-md h-full sm:h-[640px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up sm:animate-slide-up">
            
            {/* Header */}
            <div className="bg-allura-bgSecondary/80 px-5 py-4 border-b border-allura-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-allura-gold to-allura-goldLight text-white flex items-center justify-center shadow-sm">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-normal text-allura-text">ALLURA AI Stylist</h3>
                    <span className="text-[9px] font-sans bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] font-sans text-allura-muted">Boutique sizing, curation & orders</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearAIConversation}
                  title="Reset conversation"
                  className="p-2 text-allura-muted hover:text-allura-text rounded-full hover:bg-allura-bg transition-colors"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => setIsAIAssistantOpen(false)}
                  className="p-2 text-allura-muted hover:text-allura-text rounded-full hover:bg-allura-bg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-allura-bg/40">
              {aiMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs font-sans leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-allura-darkBrown text-white rounded-br-none'
                        : 'bg-allura-card border border-allura-border text-allura-text rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Order Lookup Card */}
                  {msg.orderSummary && (
                    <div className="w-full max-w-[90%] bg-allura-card border border-allura-gold/40 rounded-xl p-3.5 space-y-2 shadow-subtle">
                      <div className="flex items-center justify-between text-[11px] font-sans">
                        <span className="font-bold text-allura-goldDark">{msg.orderSummary.orderNumber}</span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-[10px]">
                          {msg.orderSummary.status}
                        </span>
                      </div>
                      <p className="text-xs text-allura-muted font-sans">
                        Delivery: <strong>{msg.orderSummary.estimatedDelivery}</strong> via {msg.orderSummary.courier}
                      </p>
                      <Link
                        to={`/account/orders/ord-849201/tracking`}
                        onClick={() => setIsAIAssistantOpen(false)}
                        className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-allura-goldDark hover:underline pt-1"
                      >
                        <Package size={13} />
                        <span>View Live Courier Milestones</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  )}

                  {/* Product Recommendations Grid */}
                  {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                    <div className="w-full space-y-2.5 pt-1">
                      <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-goldDark">
                        RECOMMENDED PIECES
                      </p>
                      <div className="grid grid-cols-1 gap-2.5">
                        {msg.suggestedProducts.map(p => (
                          <div
                            key={p.id}
                            className="bg-white border border-allura-border/80 rounded-xl p-2.5 flex items-center gap-3 shadow-xs hover:border-allura-gold transition-colors"
                          >
                            <img
                              src={p.images.primary}
                              alt={p.name}
                              className="w-16 h-20 object-cover rounded-lg bg-allura-bgSecondary flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <h4 className="font-serif text-xs font-normal text-allura-text truncate">
                                {p.name}
                              </h4>
                              <p className="text-xs font-sans font-bold text-allura-darkBrown">
                                {formatPrice(p.price)}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <Link
                                  to={`/product/${p.slug}`}
                                  onClick={() => setIsAIAssistantOpen(false)}
                                  className="text-[11px] font-sans font-semibold text-allura-goldDark hover:underline"
                                >
                                  View Details
                                </Link>
                                <span className="text-stone-300">•</span>
                                <button
                                  onClick={() => {
                                    addToCart(p, p.sizes[0] || 'M', p.colors[0]);
                                  }}
                                  className="text-[11px] font-sans font-bold text-allura-text hover:text-allura-goldDark flex items-center gap-1"
                                >
                                  <ShoppingBag size={12} />
                                  <span>Add to Bag</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isAITyping && (
                <div className="flex items-center gap-2 bg-allura-card border border-allura-border p-3 rounded-2xl rounded-bl-none w-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-allura-gold animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-allura-gold animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-allura-gold animate-bounce [animation-delay:0.4s]" />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts Carousel */}
            <div className="p-3 bg-allura-card border-t border-allura-border/60 overflow-x-auto">
              <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-2 flex items-center gap-1">
                <HelpCircle size={12} />
                <span>Suggested Inquiries</span>
              </p>
              <div className="flex gap-2 pb-1">
                {mockAISuggestedPrompts.slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedClick(prompt)}
                    className="flex-shrink-0 text-[11px] font-sans bg-allura-bg hover:bg-allura-bgSecondary text-allura-text px-3 py-1.5 rounded-full border border-allura-border transition-colors whitespace-nowrap"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-allura-card border-t border-allura-border flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={e => setInputPrompt(e.target.value)}
                placeholder="Ask about outfits, sizing, or order..."
                className="flex-1 bg-allura-bg px-3.5 py-2.5 rounded-xl border border-allura-border text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold placeholder:text-allura-muted/60"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isAITyping}
                className="bg-allura-darkBrown hover:bg-allura-softBrown disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors flex items-center justify-center flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </form>

            {/* WhatsApp Fallback */}
            <div className="bg-allura-bgSecondary/60 px-4 py-2 border-t border-allura-border text-[11px] font-sans text-center text-allura-muted flex items-center justify-center gap-2">
              <span>Need human stylist assistance?</span>
              <a
                href="https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20would%20like%20personal%20styling%20advice."
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <MessageCircle size={12} />
                <span>WhatsApp Stylist</span>
              </a>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
