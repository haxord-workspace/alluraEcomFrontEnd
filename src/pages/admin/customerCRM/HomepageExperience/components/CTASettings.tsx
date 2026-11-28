import React from 'react';
import { MousePointerClick, ExternalLink } from 'lucide-react';
import type { HomepageExperienceCTA } from '../../../../../types/homepageExperience';

interface CTASettingsProps {
  cta: HomepageExperienceCTA;
  onChange: (cta: HomepageExperienceCTA) => void;
  canEdit: boolean;
  errors?: Record<string, string>;
}

export const CTASettings: React.FC<CTASettingsProps> = ({
  cta,
  onChange,
  canEdit,
  errors = {},
}) => {
  const handleChange = <K extends keyof HomepageExperienceCTA>(
    field: K,
    value: HomepageExperienceCTA[K]
  ) => {
    onChange({
      ...cta,
      [field]: value,
    });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <MousePointerClick size={18} />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-stone-900">
              Call to Action Button
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Manage the primary call-to-action button linking customers to your story or shop catalog.
            </p>
          </div>
        </div>

        {/* Enabled toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={cta.isEnabled}
            disabled={!canEdit}
            onChange={(e) => handleChange('isEnabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#561C08] peer-disabled:opacity-50 relative" />
          <span className="text-xs font-sans font-medium text-stone-700">
            {cta.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Label */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Button Label {cta.isEnabled && <span className="text-rose-500">*</span>}
            </label>
            <span className={`text-[11px] font-mono ${cta.label.length > 40 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {cta.label.length}/40
            </span>
          </div>
          <input
            type="text"
            value={cta.label}
            maxLength={40}
            disabled={!canEdit || !cta.isEnabled}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="e.g. OUR STORY"
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] ${
              errors.ctaLabel ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed`}
          />
          {errors.ctaLabel && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.ctaLabel}</p>
          )}
        </div>

        {/* Link Destination */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Destination URL {cta.isEnabled && <span className="text-rose-500">*</span>}
            </label>
            <span className="text-[10px] text-stone-400 font-sans">
              /about or https://...
            </span>
          </div>
          <input
            type="text"
            value={cta.link}
            disabled={!canEdit || !cta.isEnabled}
            onChange={(e) => handleChange('link', e.target.value)}
            placeholder="e.g. /about or /collections/bridal"
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] ${
              errors.ctaLink ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed`}
          />
          {errors.ctaLink && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.ctaLink}</p>
          )}
        </div>

        {/* Open in new tab toggle */}
        <div className="md:col-span-2 pt-1">
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-sans text-stone-700 select-none">
            <input
              type="checkbox"
              checked={cta.openInNewTab}
              disabled={!canEdit || !cta.isEnabled}
              onChange={(e) => handleChange('openInNewTab', e.target.checked)}
              className="w-4 h-4 rounded text-[#561C08] focus:ring-[#561C08] border-stone-300"
            />
            <span className="flex items-center gap-1.5">
              <span>Open destination in a new browser tab</span>
              <ExternalLink size={13} className="text-stone-400" />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
