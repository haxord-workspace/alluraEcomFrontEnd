import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCategories } from '../service/category';
import { getAdminCollections } from '../service/collection';
import { useAdminProductOptions } from './useAdminProductOptions';
import type { Category } from '../types';

// -----------------------------------------------------------------------------
// Options for the promotion form's Applies to / Exclusions pickers, from the
// EXISTING services (unchanged):
//  - products:    useAdminProductOptions (whole catalogue once per session; the
//                 /admin/products endpoint has no search or pagination params)
//  - categories:  getCategories()       — cached once per session
//  - collections: getAdminCollections() — cached once per session
// A failed load is not cached, so Retry fetches again.
// -----------------------------------------------------------------------------

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
  image?: string;
}

export type PickerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PickerOptionsResult {
  options: PickerOption[];
  status: PickerStatus;
  retry: () => void;
}

const cache = new Map<string, Promise<PickerOption[]>>();

const loadCached = (key: string, loader: () => Promise<PickerOption[]>): Promise<PickerOption[]> => {
  let promise = cache.get(key);
  if (!promise) {
    promise = loader().catch(error => {
      cache.delete(key); // allow a retry
      throw error;
    });
    cache.set(key, promise);
  }
  return promise;
};

const useCachedOptions = (key: string, loader: () => Promise<PickerOption[]>, enabled: boolean): PickerOptionsResult => {
  const [options, setOptions] = useState<PickerOption[] | null>(null);
  const [failedAttempt, setFailedAttempt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadCached(key, loader)
      .then(list => {
        if (active) setOptions(list);
      })
      .catch(() => {
        if (active) setFailedAttempt(attempt);
      });
    return () => {
      active = false;
    };
  }, [key, loader, enabled, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  const status: PickerStatus = options
    ? 'ready'
    : !enabled
      ? 'idle'
      : failedAttempt === attempt
        ? 'error'
        : 'loading';

  return { options: options ?? [], status, retry };
};

// Categories may be nested; the parent field name is not in the Category type, so a few are tried
const parentIdOf = (category: any): string => {
  const parent = category?.parent ?? category?.parentId ?? category?.parentCategory;
  if (!parent) return '';
  return String(typeof parent === 'string' ? parent : parent._id || parent.id || '');
};

const loadCategoryOptions = async (): Promise<PickerOption[]> => {
  const list = await getCategories();
  const byId = new Map<string, Category>(list.filter(c => c?.id).map(c => [String(c.id), c]));
  const pathOf = (category: Category) => {
    const names = [category.name];
    const seen = new Set([String(category.id)]);
    let parentId = parentIdOf(category);
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      const parent = byId.get(parentId)!;
      names.unshift(parent.name);
      parentId = parentIdOf(parent);
    }
    return names.join(' > ');
  };
  return [...byId.values()]
    .map(c => ({
      id: String(c.id),
      label: pathOf(c) || 'Untitled category',
      sublabel: c.status && String(c.status).toUpperCase() !== 'ACTIVE' ? String(c.status) : undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const loadCollectionOptions = async (): Promise<PickerOption[]> => {
  const list = await getAdminCollections();
  return list
    .filter(c => c?.id)
    .map(c => ({
      id: String(c.id),
      label: c.name || 'Untitled collection',
      sublabel: c.status && String(c.status).toUpperCase() !== 'ACTIVE' ? String(c.status) : undefined,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const useCategoryPickerOptions = (enabled: boolean) =>
  useCachedOptions('categories', loadCategoryOptions, enabled);

export const useCollectionPickerOptions = (enabled: boolean) =>
  useCachedOptions('collections', loadCollectionOptions, enabled);

export const useProductPickerOptions = (enabled: boolean): PickerOptionsResult => {
  const { options, status, retry } = useAdminProductOptions(enabled);
  const mapped = useMemo(
    () => options.map(p => ({ id: p.id, label: p.name, sublabel: p.sku, image: p.image })),
    [options]
  );
  return { options: mapped, status, retry };
};
