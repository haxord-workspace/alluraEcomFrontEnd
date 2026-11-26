import { useEffect, useState } from 'react';
import { getCachedActiveCollections, type StoreCollection } from '../service/store';

/**
 * Live ACTIVE collections from GET /store/collections (shared 60s cache, so the header,
 * mobile menu and pages make a single request between them).
 */
export const useStoreCollections = () => {
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getCachedActiveCollections()
      .then(list => {
        if (!active) return;
        setCollections(list);
        setStatus('ready');
      })
      .catch(err => {
        if (!active) return;
        console.warn('Failed to load collections:', err);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return { collections, status, retry: () => setAttempt(a => a + 1) };
};

/** Image URL of a collection, whichever shape the API used */
export const collectionImageUrl = (col: StoreCollection): string | undefined =>
  typeof col.image === 'string' ? col.image : col.image?.url || col.image?.thumbnailUrl;
