import { useState } from 'react';
import toast from 'react-hot-toast';
import { projectApi, getApiErrorMessage } from '../api';
import type { ProjectInfo } from '../types';
import StateView from '../components/StateView';

export default function MigrationRequired({ project, onMigrated }: { project: ProjectInfo; onMigrated: () => void }) {
  const [running, setRunning] = useState(false);
  const canMigrate = project.role === 'ADMIN';

  async function migrate() {
    setRunning(true);
    try {
      await projectApi.migrate(project.id);
      toast.success('旧节点迁移完成，已写入模块迁移记录');
      onMigrated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, '迁移失败'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <StateView
      tone="warning"
      title="检测到旧节点，需要先完成模块迁移"
      description={`项目当前运行在 ${project.currentModule} / Schema v${project.schemaVersion}，工作台要求 ${project.requiredModule} / Schema v2。迁移完成前不会把旧节点脚本装配进新编辑器，避免新旧结构互相覆盖。`}
      action={<></>}
    >
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <p>迁移将在数据库事务中更新项目模块版本，并持久化一条 ModuleMigration 审计记录。</p>
      </div>
      {canMigrate ? (
        <button disabled={running} onClick={migrate} className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white transition hover:bg-amber-400 disabled:opacity-60">
          {running ? '正在迁移旧节点…' : '我是管理员，执行迁移'}
        </button>
      ) : (
        <p className="mt-5 text-sm text-slate-600">你当前是 {project.role}，请等待项目管理员完成迁移。页面不会提供绕过入口。</p>
      )}
    </StateView>
  );
}
