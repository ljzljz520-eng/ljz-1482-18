import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { StepKey } from '../types';
import { exportsPath, projectPath, sessionPath } from '../utils/links';

interface StepNavProps {
  projectId: string;
  currentStep: StepKey;
  sessionId?: string;
  disabled?: boolean;
}

const sessionSteps: Array<{ key: StepKey; label: string; lockedWhenBlocked?: boolean }> = [
  { key: 'overview', label: '项目概览' },
  { key: 'outline', label: '场次大纲', lockedWhenBlocked: true },
  { key: 'script', label: '脚本编辑', lockedWhenBlocked: true },
  { key: 'review', label: '审阅版本', lockedWhenBlocked: true },
  { key: 'exports', label: '历史导出' }
];

export default function StepNav({ projectId, currentStep, sessionId, disabled }: StepNavProps) {
  const stepHref = (step: StepKey) => {
    if (step === 'overview') return projectPath(projectId);
    if (step === 'exports') return exportsPath(projectId);
    return sessionId ? sessionPath(projectId, sessionId, step === 'outline' ? 'outline' : step === 'review' ? 'review' : 'script') : projectPath(projectId);
  };

  return (
    <nav aria-label="工作台步骤" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {sessionSteps.map((step) => {
        const blocked = disabled && step.lockedWhenBlocked;
        const className = clsx(
          'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition',
          currentStep === step.key ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
          blocked && 'cursor-not-allowed opacity-50 hover:bg-transparent'
        );
        return blocked ? (
          <span key={step.key} aria-disabled className={className}>{step.label}</span>
        ) : (
          <Link key={step.key} className={className} to={stepHref(step.key)}>{step.label}</Link>
        );
      })}
    </nav>
  );
}
