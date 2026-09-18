import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  ShoppingBag, 
  RotateCcw, 
  HelpCircle,
  Package,
  ArrowRight
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { mockAISuggestedPrompts } from '../../data/mockAIKnowledge';
import { Link } from 'react-router-dom';

export const AIAssistantPage: React.FC = () => {
  const {
    aiMessages,
    isAITyping,
    sendAIMessage,
    clearAIConversation,
    addToCart,
    formatPrice,
  } = useShop();

  const [inputPrompt, setInputPrompt] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAITyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isAITyping) return;
    const q = inputPrompt.trim();
    setInputPrompt('');
    sendAIMessage(q);
  };

  const handlePromptClick = (prompt: string) => {
    if (isAITyping) return;
    sendAIMessage(prompt);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-allura-gold/15 text-allura-goldDark text-[11px] font-sans font-bold uppercase tracking-wider">
          <Sparkles size={13} />
          <span>ALLURA AI CONCIERGE</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-allura-text font-normal tracking-tight">
          Personal Fashion & Styling Assistant
        </h1>
        <p className="text-xs sm:text-sm font-sans text-allura-muted leading-relaxed">
          Intelligent occasion recommendations, silhouette pairing, bespoke sizing, and real-time order tracking.
        </p>
      </div>

      {/* Main Chat Container */}
      <div className="bg-allura-card border border-allura-border rounded-2xl shadow-luxury overflow-hidden flex flex-col h-[700px]">
        {/* Top Control Bar */}
        <div className="bg-allura-bgSecondary/80 px-6 py-4 border-b border-allura-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-allura-gold to-allura-goldLight text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-normal text-allura-text">ALLURA AI Stylist</h3>
                <span className="text-[10px] font-sans bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-xs font-sans text-allura-muted">Bespoke fashion advisor</p>
            </div>
          </div>

          <button
            onClick={clearAIConversation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text hover:bg-allura-bg transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Chat</span>
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-allura-bg/40">
          {aiMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-3`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm font-sans leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-allura-darkBrown text-white rounded-br-none'
                    : 'bg-allura-card border border-allura-border text-allura-text rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Order Card if present */}
              {msg.orderSummary && (
                <div className="w-full max-w-md bg-allura-card border border-allura-gold/40 rounded-2xl p-5 space-y-3 shadow-subtle text-xs font-sans">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-allura-goldDark">{msg.orderSummary.orderNumber}</span>
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold text-[11px]">
                      {msg.orderSummary.status}
                    </span>
                  </div>
                  <p className="text-allura-muted">
                    Estimated Delivery: <strong>{msg.orderSummary.estimatedDelivery}</strong> via {msg.orderSummary.courier}
                  </p>
                  <Link
                    to="/account/orders/ord-849201/tracking"
                    className="inline-flex items-center gap-1.5 font-bold text-allura-goldDark hover:underline pt-1"
                  >
                    <Package size={14} />
                    <span>View Complete Tracking History</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}

              {/* Product Recommendations Grid */}
              {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                <div className="w-full max-w-2xl space-y-3 pt-1">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-goldDark">
                    CURATED ATELIER SUGGESTIONS
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {msg.suggestedProducts.map(p => (
                      <div
                        key={p.id}
                        className="bg-white border border-allura-border rounded-xl p-3 flex gap-3 shadow-xs hover:border-allura-gold transition-colors"
                      >
                        <img
                          src={p.images.primary}
                          alt={p.name}
                          className="w-20 h-24 object-cover rounded-lg bg-allura-bgSecondary flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-1.5 text-xs font-sans">
                          <h4 className="font-serif text-sm font-normal text-allura-text truncate">
                            {p.name}
                          </h4>
                          <p className="font-bold text-allura-darkBrown">
                            {formatPrice(p.price)}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <Link
                              to={`/product/${p.slug}`}
                              className="text-allura-goldDark font-semibold hover:underline text-[11px]"
                            >
                              Details
                            </Link>
                            <span className="text-stone-300">•</span>
                            <button
                              onClick={() => addToCart(p, p.sizes[0] || 'M', p.colors[0])}
                              className="text-allura-text hover:text-allura-goldDark font-bold flex items-center gap-1 text-[11px]"
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

          {isAITyping && (
            <div className="flex items-center gap-2 bg-allura-card border border-allura-border p-4 rounded-2xl rounded-bl-none w-24">
              <span className="w-2 h-2 rounded-full bg-allura-gold animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-allura-gold animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-allura-gold animate-bounce [animation-delay:0.4s]" />
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="p-4 bg-allura-card border-t border-allura-border/60">
          <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted mb-2 flex items-center gap-1.5">
            <HelpCircle size={13} />
            <span>Try Asking About</span>
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mockAISuggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(p)}
                className="flex-shrink-0 text-xs font-sans bg-allura-bg hover:bg-allura-bgSecondary text-allura-text px-3.5 py-1.5 rounded-full border border-allura-border transition-colors whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-allura-card border-t border-allura-border flex items-center gap-3"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder="Type your fashion query, event style requirement, or order reference..."
            className="flex-1 bg-allura-bg px-4 py-3 rounded-xl border border-allura-border text-xs sm:text-sm font-sans text-allura-text focus:outline-none focus:border-allura-gold placeholder:text-allura-muted/60"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isAITyping}
            className="px-6 py-3 bg-allura-darkBrown hover:bg-allura-softBrown disabled:opacity-40 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
