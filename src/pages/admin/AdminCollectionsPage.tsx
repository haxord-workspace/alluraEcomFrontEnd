import React, { useState } from 'react';
import { Plus, Edit3, Eye } from 'lucide-react';
import { collectionsData } from '../../data/collections';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Link } from 'react-router-dom';

export const AdminCollectionsPage: React.FC = () => {
  const [collections] = useState(collectionsData);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            EDITORIAL CURATION
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Store Collections ({collections.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Seasonal edits, festive campaigns, and curated atelier capsule stories.
          </p>
        </div>

        <button className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm">
          <Plus size={14} />
          <span>New Collection</span>
        </button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map(col => (
          <div
            key={col.id}
            className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="h-44 overflow-hidden relative group">
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status="Active" size="sm" />
                </div>
              </div>

              <div className="p-5 space-y-2 text-xs font-sans">
                <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark">
                  {col.tagline}
                </span>
                <h3 className="font-serif text-xl font-normal text-stone-900">{col.title}</h3>
                <p className="text-stone-500 line-clamp-2 leading-relaxed">{col.description}</p>
                <p className="text-[11px] text-stone-400 font-mono pt-1">
                  /{col.slug} • {col.itemCount} Curated Pieces
                </p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <Link
                to={`/collections/${col.slug}`}
                target="_blank"
                className="text-xs font-sans font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1"
              >
                <Eye size={13} />
                <span>Storefront</span>
              </Link>
              <button className="text-xs font-sans font-bold text-allura-goldDark hover:underline flex items-center gap-1">
                <Edit3 size={13} />
                <span>Edit Rules</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
