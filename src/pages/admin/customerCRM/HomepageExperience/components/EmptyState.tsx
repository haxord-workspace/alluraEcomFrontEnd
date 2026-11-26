import React from 'react';
import { Sparkles, Plus, Loader2, ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  onCreate: () => void;
  isCreating: boolean;
  canCreate: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreate, isCreating, canCreate }) => {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-10 lg:p-16 text-center max-w-2xl mx-auto shadow-xs space-y-6 animate-fade-in my-10">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
        <Sparkles size={32} />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-bold text-stone-900 tracking-wide uppercase">
          Homepage Experience
        </h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
          No Homepage Experience section has been created yet. Initialize the section to showcase your boutique's story, handcrafted features, and curated media on the storefront.
        </p>
      </div>

      <div className="pt-2">
        {canCreate ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={isCreating}
            className="inline-flex items-center gap-2 bg-[#561C08] hover:bg-[#3D1406] text-white text-xs font-heading font-bold tracking-[0.2em] uppercase py-3.5 px-7 rounded-xl transition-all duration-200 shadow-md disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Initializing Section...</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Create Section</span>
              </>
            )}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-sans">
            <ShieldAlert size={15} />
            <span>You do not have permission to create this section (cms_store_content:create required).</span>
          </div>
        )}
      </div>
    </div>
  );
};
