import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { splitCmsContent } from '../../utils/cmsContentCards';

// -----------------------------------------------------------------------------
// Renders CMS page content as cards, in the style of the storefront FAQ cards
// (src/pages/customer/FaqPage.tsx). Used by the storefront page viewer and by the
// admin editor's Preview, so both look the same.
//
// `html` MUST already be sanitized (prepareCmsHtml). Card bodies use `.cms-prose`,
// whose styles are injected by the caller (CMS_PROSE_CSS).
// -----------------------------------------------------------------------------

interface CmsContentCardsProps {
  /** Sanitized HTML */
  html: string;
  /** Page title; a first <h1> repeating it is not shown again */
  pageTitle?: string;
  /** Prefix for element ids (keeps ids unique when rendered twice on a page) */
  idPrefix?: string;
}

/** Sections start expanded so policy text is never hidden by default; each can be collapsed. */
const SECTIONS_START_OPEN = true;

const CARD_CSS = `
  .cms-card-body > :first-child { margin-top: 0; }
  .cms-card-body > :last-child { margin-bottom: 0; }
  .cms-card-body > ul:last-child > li:last-child,
  .cms-card-body > ol:last-child > li:last-child { margin-bottom: 0; }
`;

const cardClass = 'bg-allura-card border border-allura-border rounded-2xl shadow-subtle overflow-hidden';
const badgeClass =
  'inline-flex items-center justify-center min-w-[2rem] text-[10px] font-sans font-bold uppercase tracking-wider text-allura-goldDark bg-allura-bgSecondary border border-allura-border/60 px-2 py-1 rounded-md tabular-nums';
const bodyClass = 'cms-prose cms-card-body text-base font-sans text-stone-800 leading-relaxed';

export const CmsContentCards: React.FC<CmsContentCardsProps> = ({ html, pageTitle, idPrefix = 'cms' }) => {
  const cards = useMemo(() => splitCmsContent(html, pageTitle), [html, pageTitle]);
  // Keys of sections the reader has toggled away from the default
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());

  const sections = cards.filter(c => c.kind === 'section' && c.title && c.html);
  const isOpen = (key: string) => (toggled.has(key) ? !SECTIONS_START_OPEN : SECTIONS_START_OPEN);
  const allOpen = sections.every(s => isOpen(s.key));

  const toggle = (key: string) =>
    setToggled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setAll = (open: boolean) =>
    setToggled(open === SECTIONS_START_OPEN ? new Set() : new Set(sections.map(s => s.key)));

  if (cards.length === 0) {
    return (
      <div className={`${cardClass} p-8 text-center text-sm font-sans text-allura-muted`}>
        This page has no content yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <style>{CARD_CSS}</style>

      {sections.length > 2 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setAll(!allOpen)}
            className="min-h-11 px-3 text-[11px] font-sans font-bold uppercase tracking-wider text-allura-goldDark hover:text-allura-text underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-allura-goldDark/40 rounded-lg"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      )}

      {cards.map(card => {
        // Section with a title and content: collapsible, like the FAQ cards
        if (card.kind === 'section' && card.title && card.html) {
          const open = isOpen(card.key);
          const panelId = `${idPrefix}-panel-${card.key}`;
          return (
            <section key={card.key} className={cardClass}>
              <h2 className="m-0">
                <button
                  type="button"
                  onClick={() => toggle(card.key)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="w-full min-h-14 p-4 sm:p-6 text-left flex items-center justify-between gap-3 sm:gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-allura-goldDark/40 rounded-2xl"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`${badgeClass} shrink-0`}>{card.marker}</span>
                    <span className="font-serif text-base sm:text-lg text-allura-text font-normal leading-snug [overflow-wrap:anywhere]">
                      {card.title}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`text-allura-muted transition-transform duration-300 flex-shrink-0 ${open ? 'rotate-180 text-allura-goldDark' : ''}`}
                  />
                </button>
              </h2>
              {open && (
                <div id={panelId} className="px-4 sm:px-6 pb-5 sm:pb-6 border-t border-allura-border/40 animate-fade-in">
                  <div className={`${bodyClass} pt-4`} dangerouslySetInnerHTML={{ __html: card.html }} />
                </div>
              )}
            </section>
          );
        }

        // Heading without content: a title-only card
        if (card.kind === 'section' && card.title) {
          return (
            <section key={card.key} className={`${cardClass} p-4 sm:p-6 flex items-center gap-3`}>
              <span className={`${badgeClass} shrink-0`}>{card.marker}</span>
              <h2 className="m-0 font-serif text-base sm:text-lg text-allura-text font-normal leading-snug [overflow-wrap:anywhere]">
                {card.title}
              </h2>
            </section>
          );
        }

        // Point (paragraph, list item, quote…) or intro: a static card
        return (
          <div key={card.key} className={`${cardClass} p-4 sm:p-6 flex items-start gap-3 sm:gap-4`}>
            {card.marker ? (
              <span className={`${badgeClass} shrink-0 mt-0.5`}>
                {card.marker.length < 3 && /^\d+$/.test(card.marker) ? card.marker.padStart(2, '0') : card.marker}
              </span>
            ) : card.bullet ? (
              <span className="shrink-0 mt-[0.65rem] w-2 h-2 rounded-full bg-allura-goldDark" aria-hidden="true" />
            ) : null}
            <div className={`${bodyClass} min-w-0 flex-1`} dangerouslySetInnerHTML={{ __html: card.html }} />
          </div>
        );
      })}
    </div>
  );
};

export default CmsContentCards;
