import { useCallback, useEffect, useState } from 'react';
import type { PlayerPreferences } from '../game/types';
import { loadPreferences, savePreferences } from '../services/storage';

export interface UsePreferencesReturn {
  preferences: PlayerPreferences;
  shouldReduceMotion: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setSymbolsEnabled: (enabled: boolean) => void;
  setReducedMotionOverride: (override: boolean | null) => void;
  setDevModeEnabled: (enabled: boolean) => void;
  markOnboardingComplete: () => void;
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<PlayerPreferences>(() =>
    loadPreferences(),
  );
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemReducedMotion(e.matches);
    };
    mq.addEventListener?.('change', handler);
    return () => {
      mq.removeEventListener?.('change', handler);
    };
  }, []);

  const updatePreferences = useCallback(
    (updater: (prev: PlayerPreferences) => PlayerPreferences) => {
      setPreferences((prev) => {
        const next = updater(prev);
        savePreferences(next);
        return next;
      });
    },
    [],
  );

  const setSoundEnabled = useCallback(
    (enabled: boolean) => {
      updatePreferences((prev) => ({ ...prev, soundEnabled: enabled }));
    },
    [updatePreferences],
  );

  const setSymbolsEnabled = useCallback(
    (enabled: boolean) => {
      updatePreferences((prev) => ({ ...prev, symbolsEnabled: enabled }));
    },
    [updatePreferences],
  );

  const setReducedMotionOverride = useCallback(
    (override: boolean | null) => {
      updatePreferences((prev) => ({
        ...prev,
        reducedMotionOverride: override,
      }));
    },
    [updatePreferences],
  );

  const setDevModeEnabled = useCallback(
    (enabled: boolean) => {
      updatePreferences((prev) => ({
        ...prev,
        devModeEnabled: enabled,
      }));
    },
    [updatePreferences],
  );

  const markOnboardingComplete = useCallback(() => {
    updatePreferences((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
    }));
  }, [updatePreferences]);

  const shouldReduceMotion =
    preferences.reducedMotionOverride !== null
      ? preferences.reducedMotionOverride
      : systemReducedMotion;

  return {
    preferences,
    shouldReduceMotion,
    setSoundEnabled,
    setSymbolsEnabled,
    setReducedMotionOverride,
    setDevModeEnabled,
    markOnboardingComplete,
  };
}
