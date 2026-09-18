import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { CMSPage } from '../../types';

export const AdminContentPage: React.FC = () => {
  const { cmsPages, updateCMSPage } = useAdmin();
  const [selectedPage, setSelectedPage] = useState<CMSPage>(cmsPages[0]);
  const [editedTitle, setEditedTitle] = useState(cmsPages[0]?.title || '');
  const [editedContent, setEditedContent] = useState(cmsPages[0]?.content || '');

  const handleSelectPage = (page: CMSPage) => {
    setSelectedPage(page);
    setEditedTitle(page.title);
    setEditedContent(page.content);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMSPage(selectedPage.id, {
      title: editedTitle,
      content: editedContent,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CMS & STORE POLICIES
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Content Management ({cmsPages.length} Pages)
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Publish brand story narratives, sustainability manifestos, and legal shipping/return policies.
          </p>
        </div>
      </div>

      {/* Grid: Pages list & Rich Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pages List (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs font-sans">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">STORE PAGES</span>
          <div className="space-y-2">
            {cmsPages.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelectPage(p)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPage.id === p.id
                    ? 'border-stone-900 bg-stone-50 shadow-xs'
                    : 'border-stone-100 hover:border-stone-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="font-serif text-sm font-bold text-stone-900">{p.title}</p>
                  <StatusBadge status={p.status} size="sm" />
                </div>
                <p className="text-[11px] text-stone-400 font-mono mt-1">/{p.slug} • Updated {p.updatedAt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Content Editor (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5 text-xs font-sans">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Page Content Editor</h3>
              <p className="text-stone-400 font-mono text-[11px]">/{selectedPage.slug}</p>
            </div>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save size={13} />
              <span>Save Page</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Page Title</label>
              <input
                type="text"
                value={editedTitle}
                onChange={e => setEditedTitle(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-serif text-base font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Editorial Content</label>
              <textarea
                rows={10}
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans leading-relaxed text-stone-800"
              />
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
