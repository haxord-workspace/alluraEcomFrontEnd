import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit3, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getAdminCollections,
  createAdminCollection,
  updateAdminCollection,
  deleteAdminCollection,
} from '../../service/collection';
import type { AdminCollection } from '../../types';

const EMPTY_FORM = {
  name: '',
  status: 'ACTIVE',
};

export const AdminCollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminCollection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCollections = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCollections();
      setCollections(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: AdminCollection) => {
    setEditingId(col.id);
    setFormData({
      name: col.name,
      status: col.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (col: AdminCollection) => {
    setDeleteTarget(col);
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAdminCollection(deleteTarget.id);
      setCollections(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget]);

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSaving(true);

    const payload = {
      name: formData.name,
      status: formData.status,
    };

    try {
      if (editingId) {
        const updated = await updateAdminCollection(editingId, payload);
        setCollections(collections.map(c => (c.id === editingId ? updated : c)));
      } else {
        const created = await createAdminCollection(payload);
        setCollections([...collections, created]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save collection:', error);
    } finally {
      setIsSaving(false);
    }
  };

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

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCollections}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>New Collection</span>
          </button>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-sans text-stone-500">Loading collections...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-xs font-sans text-rose-600 font-semibold">{error}</p>
              <button
                onClick={fetchCollections}
                className="mt-3 text-xs font-sans text-stone-500 hover:text-stone-900 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Collection Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {collections.map(col => (
                  <tr key={col.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-4">
                      <span className="font-serif text-sm font-medium text-stone-900">{col.name}</span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={col.status} size="sm" />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(col)}
                          className="p-1.5 text-stone-400 hover:text-stone-800 rounded-lg"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(col)}
                          className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {collections.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-stone-500">
                      No collections found. Click 'New Collection' to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl text-stone-900">
              {editingId ? 'Edit Collection' : 'New Collection'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-800"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
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
                  disabled={isSaving}
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Collection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-stone-900">
                  Delete Collection
                </h3>
                <p className="text-xs font-sans text-stone-500 mt-1">
                  Are you sure you want to delete{' '}
                  <span className="font-semibold text-stone-700">"{deleteTarget.name}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-sans text-stone-500 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
