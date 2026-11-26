import { useState, useEffect } from 'react';
import type { HomepageExperience } from '../types/homepageExperience';
import { getPublicHomepageExperience } from '../service/homepageExperience';

export interface UseHomepageExperienceResult {
  data: HomepageExperience | null;
  isLoading: boolean;
  error: Error | null;
}

export const useHomepageExperience = (): UseHomepageExperienceResult => {
  const [data, setData] = useState<HomepageExperience | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSection = async () => {
      try {
        setIsLoading(true);
        const result = await getPublicHomepageExperience();
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setData(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSection();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
};
