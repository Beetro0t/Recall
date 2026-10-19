import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Database,
  FastForward,
  KeyRound,
  Lock,
  Play,
  RotateCcw,
  Shuffle,
  Sliders,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { ROUND_CONFIGS } from '../game/config';
import { getUtcChallengeId } from '../game/dailyChallenge';
import { hashStringTo128Bits } from '../game/seededRandom';
import type { DailyChallenge, GamePhase, PlayerStats } from '../game/types';
import {
  clearCommunityStorageForTesting,
  getAdminCommunitySnapshot,
} from '../services/communityStats';

const ADMIN_AUTH_SESSION_KEY = 'recall_admin_unlocked_v1';
const ADMIN_CUSTOM_HASH_KEY = 'recall_admin_passhash_v1';

function computePasscodeSignature(passcode: string): string {
  const [a, b, c, d] = hashStringTo128Bits(`recall-owner-salt|${passcode.trim()}`);
  return `${a.toString(16)}-${b.toString(16)}-${c.toString(16)}-${d.toString(16)}`;
}

// Default owner passcode is "recall-admin"
const DEFAULT_PASSCODE_SIGNATURE = computePasscodeSignature('recall-admin');

function isUrlRequestingAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    hash === '#admin' ||
    hash === '#dev' ||
    hash === '#console' ||
    search.includes('admin=1') ||
    search.includes('dev=1')
  );
}

export interface AdminPortalModalProps {
  challenge: DailyChallenge;
  customSeed: string | null;
  currentRoundId: number;
  phase: GamePhase;
  stats: PlayerStats;
  onResetAndReplay: () => void;
  onStepDailyDate: (deltaDays: number) => void;
  onSetChallengeDate: (dateStr: string) => boolean;
  onSetCustomSeed: (seedStr: string | null) => void;
  onJumpToRound: (roundId: number) => void;
  onSkipMemoriseTimer: () => void;
  onAutoFillCurrentBoard: () => void;
}

export function AdminPortalModal({
  challenge,
  customSeed,
  currentRoundId,
  phase,
  stats,
  onResetAndReplay,
  onStepDailyDate,
  onSetChallengeDate,
  onSetCustomSeed,
  onJumpToRound,
  onSkipMemoriseTimer,
  onAutoFillCurrentBoard,
}: AdminPortalModalProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return (
        typeof window !== 'undefined' &&
        window.sessionStorage?.getItem(ADMIN_AUTH_SESSION_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(() => isUrlRequestingAdmin());
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [dateInput, setDateInput] = useState<string>(challenge.challengeId);
  const [seedInput, setSeedInput] = useState<string>(customSeed ?? '');
  const [newPasscodeInput, setNewPasscodeInput] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    setDateInput(challenge.challengeId);
  }, [challenge.challengeId]);

  useEffect(() => {
    setSeedInput(customSeed ?? '');
  }, [customSeed]);

  // Listen for #admin / #dev URL hash changes or Ctrl+Shift+D shortcut
  useEffect(() => {
    const handleHashChange = () => {
      if (isUrlRequestingAdmin()) {
        setIsModalOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const clearAdminUrlHash = useCallback(() => {
    if (typeof window !== 'undefined' && isUrlRequestingAdmin()) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname +
          window.location.search.replace(/[?&](admin|dev)=1/g, ''),
      );
    }
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAuthError(null);
    clearAdminUrlHash();
  };

  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    let expectedSig = DEFAULT_PASSCODE_SIGNATURE;
    try {
      const customSig = window.localStorage?.getItem(ADMIN_CUSTOM_HASH_KEY);
      if (customSig) {
        expectedSig = customSig;
      }
    } catch {
      // Ignore storage errors
    }

    if (
      computePasscodeSignature(passcodeInput) === expectedSig ||
      computePasscodeSignature(passcodeInput) === DEFAULT_PASSCODE_SIGNATURE
    ) {
      setIsUnlocked(true);
      setPasscodeInput('');
      setAuthError(null);
      try {
        window.sessionStorage?.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    } else {
      setAuthError('Invalid owner passcode.');
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    setIsModalOpen(false);
    try {
      window.sessionStorage?.removeItem(ADMIN_AUTH_SESSION_KEY);
    } catch {
      // Ignore
    }
    clearAdminUrlHash();
  };

  const showTransientMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2600);
  };

  // If neither unlocked nor requested via #admin / Ctrl+Shift+D, render NOTHING in public DOM
  if (!isUnlocked && !isModalOpen) {
    return null;
  }

  const communitySnapshot = getAdminCommunitySnapshot(challenge.challengeId);
  void refreshTick;

  const r1Logs = communitySnapshot.activeChallengeData.roundSubmissions[1] ?? [];
  const r2Logs = communitySnapshot.activeChallengeData.roundSubmissions[2] ?? [];
  const r3Logs = communitySnapshot.activeChallengeData.roundSubmissions[3] ?? [];
  const dailyLogs = communitySnapshot.activeChallengeData.dailySubmissions ?? [];

  return (
    <>
      {/* Compact Floating Owner Toolbar when unlocked */}
      {isUnlocked && (
        <div
          className="w-full mb-2 px-2.5 py-2 rounded-[16px] bg-[#11131A] border border-[#55EFC4]/35 text-xs flex flex-wrap items-center justify-between gap-1.5 shadow-lg"
          data-testid="admin-floating-bar"
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#55EFC4]/15 text-[#55EFC4] text-[10px] font-bold uppercase tracking-wider">
              <Unlock className="w-3 h-3" aria-hidden="true" />
              <span>Owner</span>
            </span>
            <span className="font-mono text-[11px] text-white/80">
              {challenge.challengeId}
              {customSeed ? ` (${customSeed})` : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={onResetAndReplay}
              data-testid="admin-quick-replay"
              className="h-6 px-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
              title="Reset & Replay"
            >
              <RotateCcw className="w-3 h-3 text-[#55EFC4]" />
              <span>Replay</span>
            </button>

            <button
              type="button"
              onClick={() => onStepDailyDate(1)}
              data-testid="admin-quick-next-day"
              className="h-6 px-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-medium cursor-pointer"
              title="Next Day Puzzle"
            >
              +1d
            </button>

            {ROUND_CONFIGS.map((r) => (
              <button
                key={r.roundId}
                type="button"
                onClick={() => onJumpToRound(r.roundId)}
                className={`h-6 px-2 rounded-full text-[11px] font-semibold cursor-pointer ${
                  currentRoundId === r.roundId
                    ? 'bg-white text-black'
                    : 'bg-white/[0.06] text-white/70 hover:text-white'
                }`}
              >
                R{r.roundId}
              </button>
            ))}

            {(phase === 'memorising' || phase === 'concealing') && (
              <button
                type="button"
                onClick={onSkipMemoriseTimer}
                data-testid="admin-quick-skip-timer"
                className="h-6 px-2 rounded-full bg-[#FDCB6E]/20 text-[#FDCB6E] border border-[#FDCB6E]/40 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <FastForward className="w-3 h-3" />
                <span>Skip</span>
              </button>
            )}

            {phase === 'recreating' && (
              <button
                type="button"
                onClick={onAutoFillCurrentBoard}
                data-testid="admin-quick-autofill"
                className="h-6 px-2 rounded-full bg-[#55EFC4]/20 text-[#55EFC4] border border-[#55EFC4]/40 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              data-testid="admin-open-console-button"
              className="h-6 px-2.5 rounded-full bg-white text-black text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Console</span>
            </button>
          </div>
        </div>
      )}

      {/* Full Modal (Passcode Login Gate OR Full Owner Dev & Telemetry Console) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Owner Admin & Dev Console"
          data-testid="admin-portal-modal"
        >
          {!isUnlocked ? (
            /* Passcode Login Gate */
            <div className="w-full max-w-[380px] rounded-[24px] bg-[#0B0C10] border border-white/[0.12] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#55EFC4]" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-white">
                    Owner Dev Console Login
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close login"
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div>
                  <label
                    htmlFor="admin-passcode-input"
                    className="block text-xs font-medium text-white/65 mb-1.5"
                  >
                    Enter Owner Passcode
                  </label>
                  <input
                    id="admin-passcode-input"
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Passcode…"
                    autoFocus
                    data-testid="admin-passcode-input"
                    className="w-full h-11 px-3.5 rounded-[14px] bg-black border border-white/15 text-sm text-white focus:outline-none focus:border-white"
                  />
                </div>

                {authError && (
                  <p
                    className="text-xs text-[#FF6B6B] font-medium"
                    data-testid="admin-auth-error"
                  >
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  data-testid="admin-login-submit"
                  className="w-full h-11 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors cursor-pointer"
                >
                  Unlock Dev Console
                </button>
              </form>
            </div>
          ) : (
            /* Unlocked Owner Console */
            <div className="w-full max-w-[460px] max-h-[90dvh] overflow-y-auto rounded-[24px] bg-[#0B0C10] border border-white/[0.14] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#55EFC4]" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-white">
                    Owner Seed & Telemetry Console
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    data-testid="admin-logout-button"
                    className="h-8 px-3 rounded-full bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30 text-xs font-semibold cursor-pointer hover:bg-[#FF6B6B]/25"
                  >
                    Lock & Hide
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    aria-label="Close console"
                    data-testid="admin-close-console"
                    className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {statusMessage && (
                <div className="px-3 py-2 rounded-[12px] bg-[#55EFC4]/15 border border-[#55EFC4]/35 text-xs font-medium text-[#55EFC4]">
                  {statusMessage}
                </div>
              )}

              {/* 1. Seed & Date Switcher */}
              <div className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-white/80 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#55EFC4]" />
                    <span>Challenge Date & Custom Seed</span>
                  </span>
                  <span className="font-mono text-[11px] text-white/50">
                    Daily #{String(challenge.challengeNumber).padStart(3, '0')}
                  </span>
                </div>

                {/* Date input + -1d / Today / +1d */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    data-testid="admin-date-input"
                    className="flex-1 h-9 px-3 rounded-[10px] bg-black border border-white/15 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const ok = onSetChallengeDate(dateInput);
                      showTransientMessage(
                        ok ? `Loaded date ${dateInput}` : 'Invalid YYYY-MM-DD date',
                      );
                    }}
                    data-testid="admin-apply-date"
                    className="h-9 px-3 rounded-[10px] bg-white text-black text-xs font-semibold cursor-pointer"
                  >
                    Load Date
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onStepDailyDate(-1)}
                    className="h-8 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white cursor-pointer"
                  >
                    ← Prev Day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = getUtcChallengeId();
                      onSetChallengeDate(today);
                      onSetCustomSeed(null);
                      showTransientMessage(`Reset to Today (${today})`);
                    }}
                    className="h-8 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white cursor-pointer"
                  >
                    Today (UTC)
                  </button>
                  <button
                    type="button"
                    onClick={() => onStepDailyDate(1)}
                    className="h-8 rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white cursor-pointer"
                  >
                    Next Day →
                  </button>
                </div>

                {/* Custom Seed input */}
                <div className="pt-1 border-t border-white/[0.06] space-y-1.5">
                  <label
                    htmlFor="admin-seed-input"
                    className="block text-[11px] text-white/55"
                  >
                    Custom Seed Override (leave blank for official daily seed)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      id="admin-seed-input"
                      type="text"
                      value={seedInput}
                      onChange={(e) => setSeedInput(e.target.value)}
                      placeholder="e.g. test-snake-77"
                      data-testid="admin-seed-input"
                      className="flex-1 h-9 px-3 rounded-[10px] bg-black border border-white/15 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onSetCustomSeed(seedInput || null);
                        showTransientMessage(
                          seedInput
                            ? `Loaded custom seed "${seedInput}"`
                            : 'Restored official daily seed',
                        );
                      }}
                      data-testid="admin-apply-seed"
                      className="h-9 px-3 rounded-[10px] bg-white text-black text-xs font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rand = `seed-${Math.random().toString(36).slice(2, 8)}`;
                        setSeedInput(rand);
                        onSetCustomSeed(rand);
                        showTransientMessage(`Generated random seed "${rand}"`);
                      }}
                      title="Generate random seed"
                      data-testid="admin-random-seed"
                      className="h-9 px-2.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs inline-flex items-center justify-center cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Gameplay Actions & Solution Preview */}
              <div className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.08] space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80 inline-flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-[#55EFC4]" />
                  <span>Round Controls & Solution Key</span>
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onResetAndReplay();
                      handleCloseModal();
                    }}
                    className="h-9 rounded-[10px] bg-[#55EFC4]/15 border border-[#55EFC4]/35 text-[#55EFC4] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset & Replay Seed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onAutoFillCurrentBoard();
                      handleCloseModal();
                    }}
                    className="h-9 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#55EFC4]" />
                    <span>Auto-Fill Board</span>
                  </button>
                </div>

                {/* Target solution swatches for all 3 rounds */}
                <div className="space-y-1.5 pt-1">
                  {challenge.rounds.map((r) => (
                    <div
                      key={r.roundId}
                      className="p-2 rounded-[12px] bg-black/50 border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">
                          R{r.roundId}: {r.pattern.patternName}
                        </span>
                        <span className="block text-[10px] text-white/45 font-mono">
                          opt swaps: {r.optimalSwaps}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {r.targetOrder.map((tileId, idx) => {
                          const tile = r.tiles[tileId];
                          return (
                            <span
                              key={tileId}
                              title={`Square ${idx + 1}: ${tile?.colorName ?? tileId}`}
                              className="w-4 h-4 rounded-[4px] border border-white/25 inline-block"
                              style={{ backgroundColor: tile?.hex ?? '#333' }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Recorded Player Choice & Telemetry Data Inspector */}
              <div
                className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.08] space-y-3"
                data-testid="admin-telemetry-section"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-white/80 inline-flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#55EFC4]" />
                    <span>Recorded Telemetry & Choices</span>
                  </span>
                  <span className="text-[11px] text-white/50 tabular-nums">
                    Streak: {stats.currentStreak} (best {stats.bestStreak})
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center tabular-nums">
                  <div className="p-2 rounded-[10px] bg-black/50 border border-white/[0.05]">
                    <span className="block text-[10px] text-white/45">R1 Plays</span>
                    <strong className="text-sm text-white">{r1Logs.length}</strong>
                  </div>
                  <div className="p-2 rounded-[10px] bg-black/50 border border-white/[0.05]">
                    <span className="block text-[10px] text-white/45">R2 Plays</span>
                    <strong className="text-sm text-white">{r2Logs.length}</strong>
                  </div>
                  <div className="p-2 rounded-[10px] bg-black/50 border border-white/[0.05]">
                    <span className="block text-[10px] text-white/45">R3 Plays</span>
                    <strong className="text-sm text-white">{r3Logs.length}</strong>
                  </div>
                  <div className="p-2 rounded-[10px] bg-black/50 border border-white/[0.05]">
                    <span className="block text-[10px] text-white/45">Daily Done</span>
                    <strong className="text-sm text-[#55EFC4]">
                      {dailyLogs.length}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const payload = JSON.stringify(
                        {
                          challengeId: challenge.challengeId,
                          playerStats: stats,
                          communitySnapshot,
                        },
                        null,
                        2,
                      );
                      try {
                        await navigator.clipboard.writeText(payload);
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2500);
                      } catch {
                        showTransientMessage('Could not access clipboard');
                      }
                    }}
                    data-testid="admin-copy-json"
                    className="flex-1 h-8 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#55EFC4]" />
                        <span>Copied Telemetry JSON</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Telemetry JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearCommunityStorageForTesting();
                      setRefreshTick((t) => t + 1);
                      showTransientMessage('Cleared recorded community choice logs');
                    }}
                    data-testid="admin-clear-telemetry"
                    className="h-8 px-3 rounded-[10px] bg-[#FF6B6B]/15 hover:bg-[#FF6B6B]/25 text-[#FF6B6B] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                </div>
              </div>

              {/* 4. Update Owner Passcode */}
              <div className="p-3.5 rounded-[18px] bg-white/[0.03] border border-white/[0.08] space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80 inline-flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#55EFC4]" />
                  <span>Change Owner Passcode</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="password"
                    value={newPasscodeInput}
                    onChange={(e) => setNewPasscodeInput(e.target.value)}
                    placeholder="New passcode…"
                    className="flex-1 h-8 px-3 rounded-[10px] bg-black border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPasscodeInput.trim().length < 4) {
                        showTransientMessage('Passcode must be at least 4 characters');
                        return;
                      }
                      try {
                        window.localStorage?.setItem(
                          ADMIN_CUSTOM_HASH_KEY,
                          computePasscodeSignature(newPasscodeInput),
                        );
                        setNewPasscodeInput('');
                        showTransientMessage('Updated custom owner passcode');
                      } catch {
                        showTransientMessage('Failed to save passcode');
                      }
                    }}
                    className="h-8 px-3 rounded-[10px] bg-white/[0.1] hover:bg-white/[0.18] text-xs font-semibold text-white cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
