import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for synchronizing state with URL query parameters.
 *
 * Hydration-safe: the first (server + hydrating) render uses `defaultValue`
 * and the URL is adopted in a mount effect, so server HTML and client HTML
 * always match. Back/forward navigation (popstate) re-reads the parameter so
 * the URL remains the source of truth.
 *
 * @param key - The query parameter key to sync with
 * @param defaultValue - The default value when the query param is absent
 * @returns [state, setState] tuple similar to useState
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T
): [T, (newValue: T) => void] {
  const [state, setState] = useState<T>(defaultValue);

  // Adopt the URL on mount (and on back/forward navigation). Objects and
  // arrays round-trip through JSON; primitives use their raw string form so
  // `?q=5` stays the string "5" instead of being JSON.parse'd into a number.
  const readParam = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue;
    const paramValue = new URLSearchParams(window.location.search).get(key);
    if (paramValue === null) return defaultValue;
    if (
      defaultValue !== null &&
      typeof defaultValue === 'object'
    ) {
      try {
        return JSON.parse(paramValue) as T;
      } catch {
        return defaultValue;
      }
    }
    return paramValue as unknown as T;
  }, [key, defaultValue]);

  useEffect(() => {
    const adopt = () => setState(readParam());
    adopt();
    window.addEventListener('popstate', adopt);
    return () => window.removeEventListener('popstate', adopt);
  }, [readParam]);

  const updateState = useCallback(
    (newValue: T) => {
      setState(newValue);

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);

        if (newValue == null || newValue === '' || newValue === defaultValue) {
          urlParams.delete(key);
        } else {
          urlParams.set(
            key,
            typeof newValue === 'string' ? newValue : JSON.stringify(newValue)
          );
        }

        // Update URL without page refresh and without polluting history —
        // filter/view churn stays replaceState; the back button keeps working.
        const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
        window.history.replaceState({}, '', newUrl);
      }
    },
    [key, defaultValue]
  );

  return [state, updateState];
}
