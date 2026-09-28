import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for synchronizing state with URL query parameters
 * @param key - The query parameter key to sync with
 * @param defaultValue - The default value when query param is absent
 * @returns [state, setState] tuple similar to useState
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T
): [T, (newValue: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paramValue = urlParams.get(key);
      
      if (paramValue !== null) {
        try {
          // Try to parse as JSON first (for objects/arrays)
          return JSON.parse(paramValue);
        } catch {
          // If not valid JSON, return as string
          return paramValue as T;
        }
      }
    }
    return defaultValue;
  });

  const updateState = useCallback((newValue: T) => {
    setState(newValue);
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (newValue == null || newValue === '' || newValue === defaultValue) {
        urlParams.delete(key);
      } else {
        urlParams.set(key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
      }
      
      // Update URL without page refresh
      const newUrl = `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [key, defaultValue]);

  // Sync state to URL when it changes
  useEffect(() => {
    updateState(state);
  }, [state, updateState]);

  return [state, updateState];
}