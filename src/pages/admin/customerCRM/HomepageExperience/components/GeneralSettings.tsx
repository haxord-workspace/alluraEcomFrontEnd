import React from 'react';
import { FileText } from 'lucide-react';

interface GeneralSettingsProps {
  sectionName: string;
  subtitle: string;
  title: string;
  description: string;
  onChange: (field: string, value: string) => void;
  canEdit: boolean;
  errors?: Record<string, string>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  sectionName,
  subtitle,
  title,
  description,
  onChange,
  canEdit,
  errors = {},
}) => {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
        <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-stone-900">
            General Content
          </h3>
          <p className="text-xs text-stone-500 font-sans">
            Configure the internal section name and customer-facing headings and story narrative.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Section Name <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[11px] font-mono ${sectionName.length > 120 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {sectionName.length}/120
            </span>
          </div>
          <input
            type="text"
            value={sectionName}
            maxLength={120}
            disabled={!canEdit}
            onChange={(e) => onChange('sectionName', e.target.value)}
            placeholder="e.g. The Allura Experience"
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] ${
              errors.sectionName ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed`}
          />
          {errors.sectionName && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.sectionName}</p>
          )}
        </div>

        {/* Subtitle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Storefront Subtitle
            </label>
            <span className={`text-[11px] font-mono ${subtitle.length > 120 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {subtitle.length}/120
            </span>
          </div>
          <input
            type="text"
            value={subtitle}
            maxLength={120}
            disabled={!canEdit}
            onChange={(e) => onChange('subtitle', e.target.value)}
            placeholder="e.g. WEAR YOUR STORY WITH ALLURA"
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] ${
              errors.subtitle ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed`}
          />
          {errors.subtitle && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.subtitle}</p>
          )}
        </div>

        {/* Title */}
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Main Heading Title <span className="text-rose-500">*</span>
            </label>
            <span className={`text-[11px] font-mono ${title.length > 120 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {title.length}/120
            </span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={120}
            disabled={!canEdit}
            onChange={(e) => onChange('title', e.target.value)}
            placeholder="e.g. THE ALLURA EXPERIENCE"
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] ${
              errors.title ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed font-medium`}
          />
          {errors.title && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-sans font-semibold uppercase tracking-wider text-stone-700">
              Narrative Description
            </label>
            <span className={`text-[11px] font-mono ${description.length > 1000 ? 'text-rose-500 font-bold' : 'text-stone-400'}`}>
              {description.length}/1000
            </span>
          </div>
          <textarea
            rows={4}
            value={description}
            maxLength={1000}
            disabled={!canEdit}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Describe your boutique collection and unique craft..."
            className={`w-full px-3.5 py-2.5 text-xs font-sans bg-stone-50/50 border rounded-xl transition-colors focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#561C08] leading-relaxed resize-none ${
              errors.description ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200'
            } disabled:bg-stone-100 disabled:cursor-not-allowed`}
          />
          {errors.description && (
            <p className="text-[11px] text-rose-500 font-sans">{errors.description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
