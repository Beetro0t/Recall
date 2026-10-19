import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PlayerPreferences } from '../game/types';

export interface SettingsModalProps {
  isOpen: boolean;
  preferences: PlayerPreferences;
  shouldReduceMotion: boolean;
  onClose: () => void;
  onToggleSymbols: (enabled: boolean) => void;
  onToggleSound: (enabled: boolean) => void;
  onToggleReducedMotion: (override: boolean | null) => void;
  onOpenTutorial: () => void;
}

export function SettingsModal({
  isOpen,
  preferences,
  shouldReduceMotion,
  onClose,
  onToggleSymbols,
  onToggleSound,
  onToggleReducedMotion,
  onOpenTutorial,
}: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal"
    >
      <div className="w-full max-w-[400px] rounded-[24px] bg-[#0B0C10] border border-white/[0.12] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h2
            id="settings-modal-title"
            className="text-lg font-semibold tracking-[-0.02em] text-white"
          >
            Settings & Accessibility
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="close-settings-button"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] cursor-pointer focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Sound effects toggle (ON by default) */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="toggle-sound"
                className="text-sm font-medium text-white block cursor-pointer"
              >
                Sound & Tactile Feedback
              </label>
              <span className="text-xs text-white/55">
                Tactile audio tones for tile selection, placement, and completion
              </span>
            </div>
            <button
              id="toggle-sound"
              type="button"
              role="switch"
              aria-checked={preferences.soundEnabled}
              data-testid="toggle-sound"
              onClick={() => onToggleSound(!preferences.soundEnabled)}
              className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 focus-ring ${
                preferences.soundEnabled ? 'bg-[#55EFC4]' : 'bg-white/[0.12]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#050507] transition-transform ${
                  preferences.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Symbol Overlay toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="toggle-symbols"
                className="text-sm font-medium text-white block cursor-pointer"
              >
                Tile Symbols Overlay
              </label>
              <span className="text-xs text-white/55">
                Display geometric icons on tiles for colour-independent play
              </span>
            </div>
            <button
              id="toggle-symbols"
              type="button"
              role="switch"
              aria-checked={preferences.symbolsEnabled}
              data-testid="toggle-symbols"
              onClick={() => onToggleSymbols(!preferences.symbolsEnabled)}
              className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 focus-ring ${
                preferences.symbolsEnabled ? 'bg-[#55EFC4]' : 'bg-white/[0.12]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#050507] transition-transform ${
                  preferences.symbolsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <label
                htmlFor="toggle-reduced-motion"
                className="text-sm font-medium text-white block cursor-pointer"
              >
                Reduced Motion
              </label>
              <span className="text-xs text-white/55">
                Minimise tile movement and transition animations
              </span>
            </div>
            <button
              id="toggle-reduced-motion"
              type="button"
              role="switch"
              aria-checked={shouldReduceMotion}
              data-testid="toggle-reduced-motion"
              onClick={() => onToggleReducedMotion(!shouldReduceMotion)}
              className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 focus-ring ${
                shouldReduceMotion ? 'bg-[#55EFC4]' : 'bg-white/[0.12]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#050507] transition-transform ${
                  shouldReduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTutorial();
            }}
            data-testid="settings-how-to-play"
            className="text-xs font-medium text-[#55EFC4] hover:underline cursor-pointer focus-ring rounded px-1 py-1"
          >
            How to play & practice
          </button>
          <span className="text-[11px] text-white/45">Daily rollover: 00:00 UTC</span>
        </div>
      </div>
    </div>
  );
}
