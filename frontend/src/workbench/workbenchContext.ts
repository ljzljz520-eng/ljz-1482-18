import { createContext, useContext } from 'react';
import type { WorkbenchBootstrap } from '../types';

interface WorkbenchContextValue {
  bootstrap: WorkbenchBootstrap;
  reload: () => Promise<void>;
  generation: number;
}

export const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

export function useWorkbench() {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error('Workbench context is only available under /w/:projectId');
  return context;
}
