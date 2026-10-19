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
    <header className="w-full flex items-center justify-between py-2.5 border-b border-white/[0.06] mb-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={showHomeButton && onNavigateHome ? onNavigateHome : undefined}
          disabled={!showHomeButton || !onNavigateHome}
          aria-label={showHomeButton ? 'Return to Home screen' : 'Recall'}
          data-testid="brand-home-button"
          className={`flex items-center gap-2.5 rounded-[10px] py-1 px-1.5 -ml-1.5 transition-colors focus-ring ${
            showHomeButton && onNavigateHome
              ? 'cursor-pointer hover:bg-[#1B1D22]'
              : 'cursor-default'
          }`}
        >
          <div
            aria-hidden="true"
            className="grid grid-cols-2 gap-0.5 w-5 h-5 p-0.5 rounded-[6px] bg-[#1B1D22] border border-[#30333B] shadow-inner"
          >
            <span className="rounded-[1.5px] bg-[#5A82E6]" />
            <span className="rounded-[1.5px] bg-[#DC9648]" />
            <span className="rounded-[1.5px] bg-[#52B69A]" />
            <span className="rounded-[1.5px] bg-[#9574CD]" />
          </div>
          <span className="font-semibold tracking-tight text-lg text-[#F5F5F7]">
            Recall
          </span>
        </button>
      </div>

      {roundId !== undefined && (
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#181A20] border border-[#2D313B] text-xs font-medium text-[#9297A3] shadow-xs"
          data-testid="round-indicator"
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            {ROUND_CONFIGS.map((r) => (
              <span
                key={r.roundId}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  r.roundId === roundId
                    ? 'bg-[#91ADFF]'
                    : r.roundId < roundId
                      ? 'bg-[#73C8AC]'
                      : 'bg-[#30333B]'
                }`}
              />
            ))}
          </div>
          <span className="text-[#F5F5F7] font-semibold">
            R{roundId}/{ROUND_CONFIGS.length}
          </span>
          {tileCount !== undefined && (
            <>
              <span aria-hidden="true" className="text-[#30333B]">
                |
              </span>
              <span>{tileCount} tiles</span>
            </>
          )}
        </div>
      )}

      {roundId === undefined && subtitle && (
        <span className="text-xs font-medium text-[#9297A3] tabular-nums">
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
            className={`h-8 px-2 rounded-[9px] inline-flex items-center justify-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer focus-ring border ${
              devModeEnabled
                ? 'bg-[#91ADFF]/20 text-[#91ADFF] border-[#91ADFF]/45'
                : 'bg-transparent text-[#9297A3] border-transparent hover:text-[#F5F5F7] hover:bg-[#1B1D22]'
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
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#1B1D22] transition-colors cursor-pointer focus-ring"
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
            className="h-9 px-2.5 rounded-[10px] inline-flex items-center justify-center gap-1.5 text-xs font-medium text-[#91ADFF] bg-[#91ADFF]/10 border border-[#91ADFF]/25 hover:bg-[#91ADFF]/20 transition-colors cursor-pointer focus-ring"
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
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#1B1D22] transition-colors cursor-pointer focus-ring"
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
          className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#1B1D22] transition-colors cursor-pointer focus-ring"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
