import React, { useState } from 'react';
import { Plus, Edit3 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImageUploadDropzone } from '../../components/admin/ImageUploadDropzone';

export const AdminCategoriesPage: React.FC = () => {
  const { products } = useAdmin();

  const [categories, setCategories] = useState([
    { id: 'cat-1', name: 'Ethnic Wear', slug: 'ethnic-wear', order: 1, status: 'Active', image: '/images/best-sellers/classic-cream-anarkali.jpeg' },
    { id: 'cat-2', name: 'Modest Wear', slug: 'modest-wear', order: 2, status: 'Active', image: '/images/best-sellers/aura-cream-embroidered.jpeg' },
    { id: 'cat-3', name: 'Party Wear', slug: 'party-wear', order: 3, status: 'Active', image: '/images/best-sellers/blush-modest-elegance.jpeg' },
    { id: 'cat-4', name: 'Curated Sets', slug: 'curated-sets', order: 4, status: 'Active', image: '/images/best-sellers/emerald-festive-silk.jpeg' },
    { id: 'cat-5', name: 'Bridal Edit', slug: 'bridal-edit', order: 5, status: 'Active', image: '/images/about/atelier-story.jpg' },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatImage, setNewCatImage] = useState('/images/best-sellers/classic-cream-anarkali.jpeg');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    const added = {
      id: `cat-${Date.now()}`,
      name: newCatName,
      slug: newCatSlug || newCatName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      order: categories.length + 1,
      status: 'Active',
      image: newCatImage || '/images/best-sellers/classic-cream-anarkali.jpeg',
    };
    setCategories([...categories, added]);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatImage('/images/best-sellers/classic-cream-anarkali.jpeg');
    setIsCreateOpen(false);
  };

  const getProductCount = (catName: string) => {
    return products.filter(p => p.category === catName).length;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            CATALOG ARCHITECTURE
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Store Categories ({categories.length})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Configure hierarchy, display order, and banner imagery for boutique navigation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4 w-12 text-center">Order</th>
                <th className="p-4">Category Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Linked Products</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-stone-50/70 transition-colors">
                  <td className="p-4 text-center font-mono text-stone-400 font-bold">
                    0{idx + 1}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-10 h-12 object-cover rounded-lg bg-stone-100"
                      />
                      <span className="font-serif text-sm font-medium text-stone-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-stone-500">/{cat.slug}</td>
                  <td className="p-4 font-semibold text-stone-800">
                    {getProductCount(cat.name)} active designs
                  </td>
                  <td className="p-4">
                    <StatusBadge status={cat.status} size="sm" />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg">
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Category Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">Add New Category</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => {
                    setNewCatName(e.target.value);
                    setNewCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={e => setNewCatSlug(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
              <div className="pt-2">
                <ImageUploadDropzone
                  label="Category Cover & Banner Image"
                  value={newCatImage}
                  onChange={setNewCatImage}
                  aspectRatioLabel="Recommended: 400×500px"
                  presets={[
                    { label: 'Ethnic Anarkali', url: '/images/best-sellers/classic-cream-anarkali.jpeg' },
                    { label: 'Modest Embroidered', url: '/images/best-sellers/aura-cream-embroidered.jpeg' },
                    { label: 'Blush Elegance', url: '/images/best-sellers/blush-modest-elegance.jpeg' },
                    { label: 'Emerald Festive Silk', url: '/images/best-sellers/emerald-festive-silk.jpeg' },
                  ]}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 text-white rounded-xl font-bold uppercase tracking-wider"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
