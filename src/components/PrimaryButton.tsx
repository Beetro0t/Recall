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
      ? 'bg-[#91ADFF] text-[#101114] hover:bg-[#A3BCFF] active:scale-[0.985] font-semibold'
      : variant === 'secondary'
        ? 'bg-[#24262D] text-[#F5F5F7] border border-[#30333B] hover:bg-[#2C2F38] active:scale-[0.985] font-medium'
        : 'bg-transparent text-[#9297A3] hover:text-[#F5F5F7] hover:bg-[#1B1D22] font-medium';

  return (
    <button
      type="button"
      className={`
        min-h-[52px] px-5 rounded-[12px] text-[15px]
        inline-flex items-center justify-center gap-2
        transition-all duration-100 cursor-pointer no-select focus-ring
        disabled:opacity-50 disabled:pointer-events-none
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
