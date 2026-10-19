import type { TileSymbolId } from '../game/types';

interface TileSymbolProps {
  symbolId: TileSymbolId;
  className?: string;
}

export function TileSymbol({ symbolId, className = 'w-7 h-7' }: TileSymbolProps) {
  const strokeProps = {
    stroke: '#101114',
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'rgba(255, 255, 255, 0.88)',
  };

  switch (symbolId) {
    case 'circle':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="9" {...strokeProps} />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="16,6 26,24 6,24" {...strokeProps} />
        </svg>
      );
    case 'diamond':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="16,5 27,16 16,27 5,16" {...strokeProps} />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <rect x="8" y="8" width="16" height="16" rx="2.5" {...strokeProps} />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" {...strokeProps} />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon
            points="16,5 19.1,11.6 26.4,12.5 21,17.6 22.4,24.8 16,21.3 9.6,24.8 11,17.6 5.6,12.5 12.9,11.6"
            {...strokeProps}
          />
        </svg>
      );
    case 'hexagon':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon
            points="16,5 25.5,10.5 25.5,21.5 16,27 6.5,21.5 6.5,10.5"
            {...strokeProps}
          />
        </svg>
      );
    case 'ring':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="9.5"
            stroke="#101114"
            strokeWidth="5.5"
            fill="none"
          />
          <circle
            cx="16"
            cy="16"
            r="9.5"
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      );
    case 'chevron':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="16,7 26,19 21,24 16,17 11,24 6,19" {...strokeProps} />
        </svg>
      );
    case 'pentagon':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="16,5 26.5,12.6 22.5,25 9.5,25 5.5,12.6" {...strokeProps} />
        </svg>
      );
    case 'octagon':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon
            points="12,5 20,5 27,12 27,20 20,27 12,27 5,20 5,12"
            {...strokeProps}
          />
        </svg>
      );
    case 'spark':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon
            points="16,4 19,13 28,16 19,19 16,28 13,19 4,16 13,13"
            {...strokeProps}
          />
        </svg>
      );
    case 'hourglass':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="7,6 25,6 16,16 25,26 7,26 16,16" {...strokeProps} />
        </svg>
      );
    case 'shield':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <path
            d="M16 5L25 9V16C25 21.5 21 25.5 16 27C11 25.5 7 21.5 7 16V9L16 5Z"
            {...strokeProps}
          />
        </svg>
      );
    case 'bolt':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <polygon points="18,4 8,17 15,17 13,28 24,14 17,14" {...strokeProps} />
        </svg>
      );
    case 'target':
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
          <circle cx="16" cy="16" r="10" {...strokeProps} />
          <circle cx="16" cy="16" r="4" fill="#101114" />
        </svg>
      );
  }
}
