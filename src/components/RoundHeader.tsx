import { Eye, HelpCircle, Home, Settings, Terminal } from 'lucide-react';
import { ROUND_CONFIGS } from '../game/config';

export interface RoundHeaderProps {
  roundId?: number;
  tileCount?: number;
  subtitle?: string;
  showHomeButton?: boolean;
  showReviewButton?: boolean;
  devModeEnabled?: boolean;
  onToggleDevMode?: () => void;
  onNavigateHome?: () => void;
  onOpenReview?: () => void;
  onOpenSettings: () => void;
  onOpenTutorial?: () => void;
}

export function RoundHeader({
  roundId,
  tileCount,
  subtitle,
  showHomeButton = false,
  showReviewButton = false,
  devModeEnabled = false,
  onToggleDevMode,
  onNavigateHome,
  onOpenReview,
  onOpenSettings,
  onOpenTutorial,
}: RoundHeaderProps) {
  return (
    <header className="w-full flex items-center justify-between py-2.5 border-b border-white/[0.07] mb-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={showHomeButton && onNavigateHome ? onNavigateHome : undefined}
          disabled={!showHomeButton || !onNavigateHome}
          aria-label={showHomeButton ? 'Return to Home screen' : 'Recall'}
          data-testid="brand-home-button"
          className={`flex items-center gap-2.5 rounded-full py-1 px-2 -ml-1.5 transition-colors focus-ring ${
            showHomeButton && onNavigateHome
              ? 'cursor-pointer hover:bg-white/[0.06]'
              : 'cursor-default'
          }`}
        >
          <div
            aria-hidden="true"
            className="grid grid-cols-2 gap-0.5 w-5 h-5 p-0.5 rounded-[6px] bg-white/[0.06] border border-white/15 shadow-inner"
          >
            <span className="rounded-[1.5px] bg-[#FF6B6B]" />
            <span className="rounded-[1.5px] bg-[#FDCB6E]" />
            <span className="rounded-[1.5px] bg-[#55EFC4]" />
            <span className="rounded-[1.5px] bg-[#6C5CE7]" />
          </div>
          <span className="font-semibold tracking-[-0.04em] text-lg text-white">
            recall
          </span>
        </button>
      </div>

      {roundId !== undefined && (
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-white/60"
          data-testid="round-indicator"
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            {ROUND_CONFIGS.map((r) => (
              <span
                key={r.roundId}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  r.roundId === roundId
                    ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.85)]'
                    : r.roundId < roundId
                      ? 'bg-[#55EFC4]'
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <span className="text-white font-semibold tabular-nums">
            R{roundId}/{ROUND_CONFIGS.length}
          </span>
          {tileCount !== undefined && (
            <>
              <span aria-hidden="true" className="text-white/20">
                ·
              </span>
              <span className="tabular-nums">{tileCount} tiles</span>
            </>
          )}
        </div>
      )}

      {roundId === undefined && subtitle && (
        <span className="text-xs font-medium text-white/55 tabular-nums">
          {subtitle}
        </span>
      )}

      <div className="flex items-center gap-1">
        {onToggleDevMode && (
          <button
            type="button"
            onClick={onToggleDevMode}
            aria-label="Toggle Dev Mode"
            aria-pressed={devModeEnabled}
            title="Toggle Dev Mode"
            data-testid="header-dev-mode-button"
            className={`h-8 px-2.5 rounded-full inline-flex items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer focus-ring border ${
              devModeEnabled
                ? 'bg-white text-[#050507] border-white'
                : 'bg-transparent text-white/55 border-transparent hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>DEV</span>
          </button>
        )}

        {showHomeButton && onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Home"
            title="Home"
            data-testid="header-home-button"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-ring"
          >
            <Home className="w-4 h-4" />
          </button>
        )}
        {showReviewButton && onOpenReview && (
          <button
            type="button"
            onClick={onOpenReview}
            aria-label="Review your boards and solutions"
            title="Review Solutions"
            data-testid="header-review-button"
            className="h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-white/[0.08] border border-white/15 hover:bg-white/[0.14] transition-colors cursor-pointer focus-ring"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Review</span>
          </button>
        )}
        {onOpenTutorial && (
          <button
            type="button"
            onClick={onOpenTutorial}
            aria-label="How to play"
            title="How to play"
            data-testid="open-tutorial-button"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-ring"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          data-testid="open-settings-button"
          className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-ring"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
