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
  onToggleDevMode: (enabled: boolean) => void;
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
  onToggleDevMode,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      data-testid="settings-modal"
    >
      <div className="w-full max-w-[400px] rounded-[18px] bg-[#1B1D22] border border-[#30333B] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#30333B]">
          <h2
            id="settings-modal-title"
            className="text-lg font-semibold text-[#F5F5F7]"
          >
            Settings & Accessibility
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="close-settings-button"
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#24262D] cursor-pointer focus-ring"
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
                className="text-sm font-medium text-[#F5F5F7] block cursor-pointer"
              >
                Sound & Tactile Feedback
              </label>
              <span className="text-xs text-[#9297A3]">
                Tactile audio tones for tile selection, swaps, and completion
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
                preferences.soundEnabled ? 'bg-[#91ADFF]' : 'bg-[#24262D]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#101114] transition-transform ${
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
                className="text-sm font-medium text-[#F5F5F7] block cursor-pointer"
              >
                Tile Symbols Overlay
              </label>
              <span className="text-xs text-[#9297A3]">
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
                preferences.symbolsEnabled ? 'bg-[#91ADFF]' : 'bg-[#24262D]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#101114] transition-transform ${
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
                className="text-sm font-medium text-[#F5F5F7] block cursor-pointer"
              >
                Reduced Motion
              </label>
              <span className="text-xs text-[#9297A3]">
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
                shouldReduceMotion ? 'bg-[#91ADFF]' : 'bg-[#24262D]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#101114] transition-transform ${
                  shouldReduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Developer Mode toggle */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#30333B]/70">
            <div>
              <label
                htmlFor="toggle-dev-mode"
                className="text-sm font-medium text-[#F5F5F7] block cursor-pointer"
              >
                Developer Testing Mode
              </label>
              <span className="text-xs text-[#9297A3]">
                Unlimited replays, new puzzle seeds, round jumps, and timer skip
              </span>
            </div>
            <button
              id="toggle-dev-mode"
              type="button"
              role="switch"
              aria-checked={preferences.devModeEnabled}
              data-testid="toggle-dev-mode"
              onClick={() => onToggleDevMode(!preferences.devModeEnabled)}
              className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 focus-ring ${
                preferences.devModeEnabled ? 'bg-[#91ADFF]' : 'bg-[#24262D]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-[#101114] transition-transform ${
                  preferences.devModeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-[#30333B] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTutorial();
            }}
            data-testid="settings-how-to-play"
            className="text-xs font-medium text-[#91ADFF] hover:underline cursor-pointer focus-ring rounded px-1 py-1"
          >
            How to play & practice
          </button>
          <span className="text-[11px] text-[#9297A3]">Daily rollover: 00:00 UTC</span>
        </div>
      </div>
    </div>
  );
}
