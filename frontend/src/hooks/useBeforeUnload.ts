import { useEffect } from 'react';

export function useBeforeUnload(shouldBlock: boolean, message = '有稿件尚未同步，确定要离开吗？') {
  useEffect(() => {
    if (!shouldBlock) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldBlock, message]);
}
