import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, AlertTriangle } from 'lucide-react';
import type { FunnelAnalytics, FunnelStage } from '../../../types/analytics';

interface ConversionFunnelChartProps {
  data: FunnelAnalytics;
}

// Single dark chocolate-brown shade for every stage, matching the dashboard's brand color.
const STAGE_COLOR = '#5A210F';
const AXIS_COLOR = 'rgba(198, 107, 70, 0.35)';

const CHART_HEIGHT = 220;
const MIN_BAR_HEIGHT_PCT = 6;
const BAR_WIDTH = 40;
const BAR_GAP = 32;

const TOOLTIP_WIDTH = 208;
const TOOLTIP_OFFSET = 10;
const VIEWPORT_MARGIN = 8;

interface TooltipPosition {
  key: string;
  top: number;
  left: number;
  placement: 'above' | 'below';
}

const lighten = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r}, ${g}, ${b})`;
};

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data }) => {
  const { summary, stages } = data;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipPosition | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [grown, setGrown] = useState(false);
  const barRefs = useRef(new Map<string, HTMLDivElement>());
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const updateTooltipPosition = useCallback((key: string) => {
    const el = barRefs.current.get(key);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const placement: 'above' | 'below' = spaceAbove >= 160 ? 'above' : 'below';

    const halfWidth = TOOLTIP_WIDTH / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, halfWidth + VIEWPORT_MARGIN),
      window.innerWidth - halfWidth - VIEWPORT_MARGIN
    );
    const top = placement === 'above' ? rect.top - TOOLTIP_OFFSET : rect.bottom + TOOLTIP_OFFSET;

    setTooltip({ key, top, left, placement });
  }, []);

  const showTooltip = useCallback((key: string) => {
    setHoveredKey(key);
    updateTooltipPosition(key);
  }, [updateTooltipPosition]);

  const hideTooltip = useCallback(() => {
    setHoveredKey(null);
    setTooltip(null);
  }, []);

  // Fade+slide the tooltip in once it has a position, rather than popping in instantly.
  useEffect(() => {
    if (!tooltip) {
      setTooltipVisible(false);
      return;
    }
    setTooltipVisible(false);
    const raf = requestAnimationFrame(() => setTooltipVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [tooltip?.key]);

  // Keep the tooltip glued to its bar across window resizes and scrolling (the chart
  // itself scrolls horizontally on narrow viewports).
  useEffect(() => {
    if (!hoveredKey) return;
    const handler = () => updateTooltipPosition(hoveredKey);
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [hoveredKey, updateTooltipPosition]);

  useEffect(() => {
    setGrown(false);
    setHoveredKey(null);
    setTooltip(null);
    if (prefersReducedMotion.current) {
      setGrown(true);
      return;
    }
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const baseline = stages[0]?.uniqueUsers || 1;

  const heightPctFor = (stage: FunnelStage) => {
    const pct = (stage.uniqueUsers / baseline) * 100;
    return Math.max(Math.min(pct, 100), stage.uniqueUsers > 0 ? MIN_BAR_HEIGHT_PCT : 0);
  };

  // Stage-specific summary rates, derived positionally from the six expected stages
  // so this reads correctly regardless of the exact backend `key`/`label` text.
  const rateTiles = [
    { label: 'Product View Rate', stage: stages[1] },
    { label: 'Add-to-Bag Rate', stage: stages[3] },
    { label: 'Checkout Rate', stage: stages[4] },
    { label: 'Completed Purchase Rate', stage: stages[5] },
  ].filter(t => t.stage);

  return (
    <div className="space-y-8">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Visitors</span>
          <p className="font-serif text-xl font-bold text-[#561C08]">{summary.totalVisitors.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">Total Store Visitors</p>
        </div>
        {rateTiles.map(({ label, stage }) => (
          <div key={label} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-stone-400">{stage!.conversionFromVisitors}%</span>
            <p className="font-serif text-xl font-bold text-[#561C08]">{stage!.uniqueUsers.toLocaleString()}</p>
            <p className="text-[11px] text-stone-500">{label}</p>
          </div>
        ))}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Overall</span>
          <p className="font-serif text-xl font-bold text-[#561C08]">{summary.overallConversionRate}%</p>
          <p className="text-[11px] text-stone-500">Visitor-to-Purchase Conversion</p>
        </div>
      </div>

      {/* Funnel graph — vertical column chart */}
      <div className="overflow-x-auto">
        <div
          className="relative inline-flex items-end mx-auto"
          style={{ gap: BAR_GAP, paddingLeft: 28, paddingRight: 12, paddingTop: 36, minWidth: '100%' }}
        >
          {/* Y axis */}
          <div
            className="absolute top-0 flex flex-col items-center"
            style={{ left: 4, height: CHART_HEIGHT + 36 }}
          >
            <ArrowUp size={13} style={{ color: AXIS_COLOR }} />
            <div className="w-px flex-1" style={{ backgroundColor: AXIS_COLOR }} />
          </div>

          {/* Subtle horizontal guides */}
          {[0.25, 0.5, 0.75].map(frac => (
            <div
              key={frac}
              className="absolute border-t border-dashed border-stone-100"
              style={{ left: 20, right: 12, bottom: 36 + CHART_HEIGHT * frac }}
            />
          ))}

          {stages.map((stg, i) => {
            const isAnomaly = i > 0 && stg.uniqueUsers > stages[i - 1].uniqueUsers;
            const heightPct = heightPctFor(stg);
            const targetHeight = (heightPct / 100) * CHART_HEIGHT;
            const isHovered = hoveredKey === stg.key;
            const color = STAGE_COLOR;

            return (
              <div key={stg.key} className="relative flex flex-col items-center" style={{ width: BAR_WIDTH + 24 }}>
                {/* Value + anomaly flag */}
                <div className="h-10 flex flex-col items-center justify-end mb-1">
                  {isAnomaly && (
                    <span className="flex items-center gap-1 text-[9px] font-sans font-bold text-amber-600 mb-0.5">
                      <AlertTriangle size={10} /> inconsistent
                    </span>
                  )}
                  <span className="font-mono font-bold text-xs sm:text-sm text-stone-800 whitespace-nowrap">
                    {stg.uniqueUsers.toLocaleString()}
                  </span>
                </div>

                {/* Bar column */}
                <div
                  className="relative flex items-end justify-center"
                  style={{ height: CHART_HEIGHT, width: BAR_WIDTH + 24 }}
                >
                  <div
                    ref={el => {
                      if (el) barRefs.current.set(stg.key, el);
                      else barRefs.current.delete(stg.key);
                    }}
                    className="rounded-t-[16px] rounded-b-[6px] transition-all ease-out motion-reduce:transition-none group"
                    style={{
                      width: BAR_WIDTH,
                      height: grown ? Math.max(targetHeight, 6) : 0,
                      background: `linear-gradient(180deg, ${lighten(color, 36)} 0%, ${color} 55%, ${color} 100%)`,
                      boxShadow: isHovered
                        ? `0 10px 18px -6px ${color}66`
                        : `0 6px 12px -6px ${color}40`,
                      transitionDuration: '750ms',
                      transform: isHovered ? 'scaleX(1.06)' : 'scaleX(1)',
                      transformOrigin: 'bottom',
                    }}
                    onMouseEnter={() => showTooltip(stg.key)}
                    onMouseLeave={hideTooltip}
                    onClick={() => (hoveredKey === stg.key ? hideTooltip() : showTooltip(stg.key))}
                  />
                </div>

                {/* Baseline mark + labels */}
                <div className="w-full flex flex-col items-center pt-2 mt-0 border-t" style={{ borderColor: AXIS_COLOR }}>
                  <span className="text-[11px] font-sans font-bold text-stone-700 text-center leading-tight max-w-[88px]">
                    {stg.label}
                  </span>
                  <span className="text-[10px] font-sans text-stone-400 mt-0.5">{stg.conversionFromVisitors}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tooltip && typeof document !== 'undefined' && createPortal(
        (() => {
          const idx = stages.findIndex(s => s.key === tooltip.key);
          const stg = stages[idx];
          if (!stg) return null;
          const isAnomaly = idx > 0 && stg.uniqueUsers > stages[idx - 1].uniqueUsers;
          return (
            <div
              className="fixed z-50 w-52 p-3 bg-white border border-stone-200 rounded-xl shadow-lg text-xs font-sans space-y-1.5 pointer-events-none transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
              style={{
                top: tooltip.top,
                left: tooltip.left,
                transform: `translate(-50%, ${tooltip.placement === 'above' ? '-100%' : '0'}) translateY(${
                  tooltipVisible ? '0' : tooltip.placement === 'above' ? '4px' : '-4px'
                })`,
                opacity: tooltipVisible ? 1 : 0,
              }}
            >
              <p className="font-serif font-bold text-stone-900 text-sm">{stg.label}</p>
              <div className="flex justify-between text-stone-600">
                <span>Users</span>
                <span className="font-mono font-bold text-stone-900">{stg.uniqueUsers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Of total visitors</span>
                <span className="font-mono font-bold text-stone-900">{stg.conversionFromVisitors}%</span>
              </div>
              {idx > 0 && (
                <>
                  <div className="flex justify-between text-stone-600">
                    <span>Conversion from previous</span>
                    <span className="font-mono font-bold text-stone-900">{stg.conversionFromPrevious}%</span>
                  </div>
                  <div className={isAnomaly ? 'flex justify-between text-amber-600' : 'flex justify-between text-rose-700'}>
                    <span>{isAnomaly ? 'Rose vs. previous stage' : 'Dropoff from previous'}</span>
                    <span className="font-mono font-bold">{stg.dropoffFromPrevious}%</span>
                  </div>
                </>
              )}
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};
