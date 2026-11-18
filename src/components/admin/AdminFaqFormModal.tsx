import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  getAdminFaq,
  createAdminFaq,
  updateAdminFaq,
  faqErrorMessage,
  type AdminFaq,
  type AdminFaqStatus,
  type FaqPayload,
} from '../../service/adminFaqs';
import { getBackendFieldErrors } from '../../utils/apiResponse';
import { useShop } from '../../context/ShopContext';

interface AdminFaqFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The row clicked (for edit), or null when creating */
  faq: AdminFaq | null;
  categories: string[];
  onSaved: (faq: AdminFaq, isNew: boolean) => void;
}

interface FormState {
  question: string;
  answer: string;
  category: string;
  sortOrder: string;
  status: AdminFaqStatus;
}

const EMPTY_FORM: FormState = { question: '', answer: '', category: '', sortOrder: '1', status: 'DRAFT' };

type FormErrors = Partial<Record<keyof FormState, string>>;

export const AdminFaqFormModal: React.FC<AdminFaqFormModalProps> = ({ isOpen, onClose, faq, categories, onSaved }) => {
  const { showToast } = useShop();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setLoadError(null);
    setIsNewCategory(false);
    setNewCategory('');

    if (!faq) {
      setForm(EMPTY_FORM);
      return;
    }
    // Edit loads the full record via GET /{id} rather than trusting the list row
    setIsLoading(true);
    getAdminFaq(faq.id)
      .then(full => {
        setForm({
          question: full.question,
          answer: full.answer,
          category: full.category,
          sortOrder: String(full.sortOrder ?? 0),
          status: full.status,
        });
      })
      .catch(err => setLoadError(faqErrorMessage(err, 'Could not load this FAQ')))
      .finally(() => setIsLoading(false));
  }, [isOpen, faq]);

  if (!isOpen) return null;

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.question.trim()) next.question = 'Question is required.';
    else if (form.question.trim().length < 5) next.question = 'Must be at least 5 characters.';
    if (!form.answer.trim()) next.answer = 'Answer is required.';
    const category = isNewCategory ? newCategory : form.category;
    if (!category.trim()) next.category = 'Category is required.';
    if (form.sortOrder.trim() && Number.isNaN(Number(form.sortOrder))) next.sortOrder = 'Must be a number.';
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: FaqPayload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      category: (isNewCategory ? newCategory : form.category).trim(),
      sortOrder: form.sortOrder.trim() ? Number(form.sortOrder) : 1,
      status: form.status,
    };

    setIsSaving(true);
    try {
      const saved = faq ? await updateAdminFaq(faq.id, payload) : await createAdminFaq(payload);
      showToast(faq ? 'FAQ updated' : 'FAQ created', 'success');
      onSaved(saved, !faq);
      onClose();
    } catch (err: any) {
      const fieldErrors = getBackendFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...(fieldErrors as FormErrors) }));
      }
      showToast(faqErrorMessage(err, `Could not ${faq ? 'update' : 'create'} this FAQ`), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-form-title"
        onClick={e => e.stopPropagation()}
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-xs font-sans"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 id="faq-form-title" className="font-serif text-xl text-stone-900">
            {faq ? 'Edit FAQ' : 'Create FAQ'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700 p-1">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading FAQ…</span>
          </div>
        ) : loadError ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">{loadError}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="faq-question" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Question
              </label>
              <input
                id="faq-question"
                type="text"
                value={form.question}
                onChange={e => setForm({ ...form, question: e.target.value })}
                disabled={isSaving}
                aria-invalid={!!errors.question}
                aria-describedby={errors.question ? 'faq-question-error' : undefined}
                className={`w-full p-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none ${errors.question ? 'border-rose-400' : 'border-stone-200'
                  }`}
              />
              {errors.question && (
                <p id="faq-question-error" role="alert" className="text-[11px] text-rose-600 mt-1">
                  {errors.question}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="faq-answer" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Answer
              </label>
              <textarea
                id="faq-answer"
                rows={5}
                value={form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
                disabled={isSaving}
                aria-invalid={!!errors.answer}
                aria-describedby={errors.answer ? 'faq-answer-error' : undefined}
                className={`w-full p-2.5 bg-stone-50 border rounded-xl text-stone-800 leading-relaxed resize-none focus:outline-none ${errors.answer ? 'border-rose-400' : 'border-stone-200'
                  }`}
              />
              {errors.answer && (
                <p id="faq-answer-error" role="alert" className="text-[11px] text-rose-600 mt-1">
                  {errors.answer}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="faq-category" className="block text-[10px] font-bold uppercase text-stone-400">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(v => !v)}
                    className="text-[10px] text-allura-goldDark underline"
                  >
                    {isNewCategory ? 'Choose existing' : '+ New category'}
                  </button>
                </div>
                {isNewCategory ? (
                  <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    disabled={isSaving}
                    aria-invalid={!!errors.category}
                    className={`w-full p-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none ${errors.category ? 'border-rose-400' : 'border-stone-200'
                      }`}
                  />
                ) : (
                  <select
                    id="faq-category"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    disabled={isSaving}
                    aria-invalid={!!errors.category}
                    className={`w-full p-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none ${errors.category ? 'border-rose-400' : 'border-stone-200'
                      }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                )}
                {errors.category && (
                  <p role="alert" className="text-[11px] text-rose-600 mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label htmlFor="faq-sort" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                  Sort Order
                </label>
                <input
                  id="faq-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={e => setForm({ ...form, sortOrder: e.target.value })}
                  disabled={isSaving}
                  aria-invalid={!!errors.sortOrder}
                  className={`w-full p-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none ${errors.sortOrder ? 'border-rose-400' : 'border-stone-200'
                    }`}
                />
                {errors.sortOrder && (
                  <p role="alert" className="text-[11px] text-rose-600 mt-1">{errors.sortOrder}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="faq-status" className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Status
              </label>
              <select
                id="faq-status"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as AdminFaqStatus })}
                disabled={isSaving}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none"
              >
                <option value="DRAFT">Draft (not yet published)</option>
                <option value="SCHEDULED">Scheduled (publishes automatically later)</option>
                <option value="PUBLISHED">Published (visible on the storefront)</option>
                <option value="UNPUBLISHED">Unpublished (hidden)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isSaving && <Loader2 size={13} className="animate-spin" />}
                <span>{isSaving ? 'Saving…' : faq ? 'Save Changes' : 'Create FAQ'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
