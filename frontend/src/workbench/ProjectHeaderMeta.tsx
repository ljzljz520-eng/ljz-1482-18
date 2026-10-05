import { useWorkbenchStore } from "@/stores/workbenchStore";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export function ProjectHeaderMeta() {
  const data = useWorkbenchStore((s) => s.data);
  if (!data) return null;
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <Badge>v{data.project.version}</Badge>
      <span>更新于 {formatDateTime(data.project.updatedAt)}</span>
      <span className="hidden sm:inline">· {data.project.members.length} 名成员</span>
    </div>
  );
}
