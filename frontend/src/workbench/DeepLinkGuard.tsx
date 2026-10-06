import { ReactNode } from 'react';
import StateView from '../components/StateView';
import { useDeepLinkTarget, type DeepLinkKind } from './useDeepLinkTarget';

interface DeepLinkGuardProps {
  expected: DeepLinkKind;
  children: ReactNode;
}

export default function DeepLinkGuard({ expected, children }: DeepLinkGuardProps) {
  const target = useDeepLinkTarget();
  if (target.kind !== expected) {
    return <StateView tone="error" title="深链接类型不匹配" description="地址栏目标与当前页面资源类型不一致。" />;
  }
  if (target.invalid) {
    return <StateView tone="error" title={target.invalid.title} description={target.invalid.detail} />;
  }
  return <>{children}</>;
}
