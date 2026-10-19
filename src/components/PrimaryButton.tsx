import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  children: ReactNode;
}

export function PrimaryButton({
  variant = 'primary',
  fullWidth = true,
  className = '',
  children,
  ...rest
}: PrimaryButtonProps) {
  const variantClasses =
    variant === 'primary'
      ? 'bg-white text-[#050507] hover:bg-[#F2F4F8] hover:scale-[1.012] active:scale-[0.975] font-semibold tracking-[-0.02em] shadow-[0_10px_28px_rgba(255,255,255,0.14)]'
      : variant === 'secondary'
        ? 'bg-white/[0.06] text-white border border-white/[0.12] hover:bg-white/[0.1] hover:border-white/[0.2] active:scale-[0.98] font-medium tracking-[-0.01em]'
        : 'bg-transparent text-white/55 hover:text-white hover:bg-white/[0.05] font-medium tracking-[-0.01em]';

  return (
    <button
      type="button"
      className={`
        min-h-[50px] px-6 rounded-full text-[15px]
        inline-flex items-center justify-center gap-2
        transition-all duration-150 cursor-pointer no-select focus-ring
        disabled:opacity-45 disabled:pointer-events-none
        ${fullWidth ? 'w-full' : ''}
        ${variantClasses}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
