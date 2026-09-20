import { useOutletContext } from 'react-router-dom';

export interface AppShellContextType {
  openQuickAction: () => void;
  closeQuickAction: () => void;
}

export function useAppShellContext() {
  return useOutletContext<AppShellContextType>();
}
