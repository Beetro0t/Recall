import type { ReactNode } from 'react';

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <>{children}</>;
}
