import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ImageUploadDropzone } from '../../components/admin/ImageUploadDropzone';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../service/category';
import type { Category } from '../../types';

export const AdminCategoriesPage: React.FC = () => {
  const { products } = useAdmin();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    status: 'ACTIVE',
    image: { url: '/images/best-sellers/classic-cream-anarkali.jpeg' },
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      slug: '',
      status: 'ACTIVE',
      image: { url: '/images/best-sellers/classic-cream-anarkali.jpeg' },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      status: cat.status || 'ACTIVE',
      image: typeof cat.image === 'string'
        ? { url: cat.image }
        : cat.image || { url: '/images/best-sellers/classic-cream-anarkali.jpeg' },
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(id);
        setCategories(categories.filter(c => c.id !== id));
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    // Build payload — send only fields the backend accepts
    const payload = {
      name: formData.name,
      slug: formData.slug,
      status: formData.status,
      image: formData.image,
    };

    try {
      if (editingCategoryId) {
        const updated = await updateCategory(editingCategoryId, payload);
        setCategories(categories.map(c => (c.id === editingCategoryId ? updated : c)));
      } else {
        const added = await createCategory(payload);
        setCategories([...categories, added]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    }
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
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-8 text-center text-stone-500 text-xs">Loading categories...</div>
          ) : (
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
                          src={
                            (typeof cat.image === 'object' ? (cat.image as any)?.url : cat.image)
                            || '/images/best-sellers/classic-cream-anarkali.jpeg'
                          }
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
                        <button 
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-500">
                      No categories found. Click 'Add Category' to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">
              {editingCategoryId ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                    });
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div className="pt-2">
                <ImageUploadDropzone
                  label="Category Cover & Banner Image"
                  value={typeof formData.image === 'object' ? (formData.image as any).url : formData.image}
                  onChange={(url) => setFormData({ ...formData, image: { url } })}
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider"
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
