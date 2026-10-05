import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Step = { id: string; title: string; content: string };

const v = (n: number, title: string, steps: Step[], base: number | null, note?: string) => ({
  version: n,
  title,
  steps: steps as unknown as object,
  baseVersion: base,
  note
});

async function ensureUser(id: string, email: string, name: string) {
  const passwordHash = await bcrypt.hash("123456", 10);
  return prisma.user.upsert({
    where: { id },
    create: { id, email, name, passwordHash },
    // 不覆盖已有密码，避免重启容器后修改过的密码被重置
    update: { name }
  });
}

async function main() {
  const admin = await ensureUser("u_admin", "admin@yunxi.test", "林知秋（负责人）");
  const editor = await ensureUser("u_editor", "editor@yunxi.test", "沈砚（编导）");
  const viewer = await ensureUser("u_viewer", "viewer@yunxi.test", "顾南（审阅）");
  const outsider = await ensureUser("u_outsider", "outsider@yunxi.test", "江离（其他项目）");

  // ---------- 项目 A：云溪夜游季（现役） ----------
  await prisma.project.upsert({
    where: { id: "p_yunxi" },
    create: {
      id: "p_yunxi",
      name: "云溪夜游季 · 开闭幕直播",
      description: "夜游季开幕大秀的脚本、场次与素材协作工作台",
      status: "ACTIVE",
      version: 3
    },
    update: {}
  });

  // ---------- 项目 B：樱洲春会（已退役，只读） ----------
  await prisma.project.upsert({
    where: { id: "p_archived" },
    create: {
      id: "p_archived",
      name: "樱洲春会 2025（历史项目）",
      description: "已结束并退役的历史活动，内容仅供只读回溯",
      status: "RETIRED",
      version: 5
    },
    update: {}
  });

  await membership("p_yunxi", admin.id, "OWNER");
  await membership("p_yunxi", editor.id, "EDITOR");
  await membership("p_yunxi", viewer.id, "VIEWER");
  await membership("p_archived", admin.id, "OWNER");
  await membership("p_archived", editor.id, "VIEWER");
  await membership("p_archived", outsider.id, "EDITOR");

  // ---------- 场次（项目 A） ----------
  const sessionsA: { id: string; title: string; summary: string; status: "ACTIVE" | "DRAFT"; orderIndex: number }[] = [
    { id: "s_opening", title: "开幕大秀 · 第一幕《溪山入画》", summary: "主舞台灯光秀 + 无人机开场", status: "ACTIVE", orderIndex: 0 },
    { id: "s_firefly", title: "萤火虫巡游 · 互动桥段", summary: "夜游动线与观众互动", status: "ACTIVE", orderIndex: 1 },
    { id: "s_closing", title: "闭幕烟火 · 主持串词", summary: "收尾烟花与致谢环节", status: "DRAFT", orderIndex: 2 }
  ];
  for (const s of sessionsA) {
    await prisma.sessionNode.upsert({ where: { id: s.id }, create: { ...s, projectId: "p_yunxi" }, update: {} });
  }

  // ---------- 场次（项目 B，退役） ----------
  await prisma.sessionNode.upsert({
    where: { id: "s_spring_old" },
    create: {
      id: "s_spring_old",
      projectId: "p_archived",
      title: "樱洲春会 · 花神祭典",
      summary: "历史场次，只读",
      status: "ARCHIVED",
      orderIndex: 0
    },
    update: {}
  });

  // ---------- 素材（项目 A） ----------
  const materials = [
    { id: "m_drone", name: "无人机编队航拍 4K.mp4", kind: "VIDEO" as const, url: "https://example.com/assets/drone-4k.mp4" },
    { id: "m_ost", name: "主题曲《溪山行》母带.wav", kind: "AUDIO" as const, url: "https://example.com/assets/ost.wav" },
    { id: "m_poster", name: "主视觉海报终稿.png", kind: "IMAGE" as const, url: "https://example.com/assets/poster.png" },
    { id: "m_deleted", name: "被废弃的旧版片头.mov", kind: "VIDEO" as const, url: "https://example.com/assets/old-intro.mov" }
  ];
  for (const m of materials) {
    const deleted = m.id === "m_deleted";
    await prisma.material.upsert({
      where: { id: m.id },
      create: {
        ...m,
        projectId: "p_yunxi",
        deleteState: deleted ? "DELETED" : "ACTIVE",
        deletedAt: deleted ? new Date("2026-09-20T10:00:00Z") : null
      },
      update: {}
    });
  }

  await ensureDeleteRecord("p_yunxi", "MATERIAL", "m_deleted", "被废弃的旧版片头.mov", "旧片头被新版替换");

  // ---------- 脚本与版本（s_opening，含历史版本 + 导出快照） ----------
  await seedScript("s_opening", editor.id, [
    v(
      1,
      "《溪山入画》脚本 v1",
      [
        { id: "st1", title: "开场定场", content: "全场暗灯 10 秒，竖笛声起，主屏幕从水墨长卷展开。" },
        { id: "st2", title: "无人机升空", content: "200 架无人机组成「云溪」二字，主持人画外音入场。" }
      ],
      null,
      "初稿"
    ),
    v(
      2,
      "《溪山入画》脚本 v2",
      [
        { id: "st1", title: "开场定场", content: "全场暗灯 8 秒，竖笛声起，主屏幕从水墨长卷展开并叠加粒子效果。" },
        { id: "st2", title: "无人机升空", content: "200 架无人机组成「云溪」二字，随后化作锦鲤游过天际，主持人画外音入场。" },
        { id: "st3", title: "主舞台亮相", content: "灯光打向主舞台，演员从水幕中走出，合唱第一段。" }
      ],
      1,
      "增加粒子效果与第三幕"
    )
  ]);

  await seedScript("s_firefly", editor.id, [
    v(
      1,
      "萤火虫巡游脚本 v1",
      [
        { id: "st1", title: "发放萤火灯", content: "工作人员在入口发放可调节亮度的萤火灯，提示安全须知。" },
        { id: "st2", title: "游线启动", content: "沿溪栈道缓行，每 50 米设置一名引导员。" }
      ],
      null
    )
  ]);

  await seedScript("s_closing", admin.id, [
    v(
      1,
      "闭幕串词 v1",
      [{ id: "st1", title: "致谢与烟火", content: "主持人致辞 90 秒，随后三轮烟火，最后一轮打出「明年再见」。" }],
      null
    )
  ]);

  await seedScript("s_spring_old", admin.id, [
    v(
      1,
      "花神祭典脚本（归档）",
      [{ id: "st1", title: "十二花神登场", content: "花神队伍自樱花大道缓步入场，民乐伴奏。" }],
      null
    )
  ]);

  // ---------- 导出快照：绑定 v1，历史导出链接永远停在 v1 ----------
  await prisma.snapshot.upsert({
    where: { id: "snap_v1_export" },
    create: {
      id: "snap_v1_export",
      projectId: "p_yunxi",
      sessionId: "s_opening",
      versionId: "ver_s_opening_1",
      label: "开幕式送审版（v1 导出）"
    },
    update: {}
  });

  // ---------- 旧节点迁移记录（旧深链接 -> 新场次/已删除） ----------
  await migration("p_yunxi", "ses_old_101", "SESSION", "s_firefly", "RESOLVED", "场次合并：萤火虫桥段并入巡游线");
  await migration("p_yunxi", "ses_old_102", "SESSION", "s_opening", "RESOLVED", "旧第二幕并入开幕大秀");
  await migration("p_yunxi", "ses_old_404", "SESSION", null, "DELETED", "该场次在 2026 版改版中被整体删除");
  await migration("p_yunxi", "mat_old_05", "MATERIAL", null, "REVOKED", "旧素材授权到期，已下架");

  console.log("seed completed:");
  console.log("  admin@yunxi.test / editor@yunxi.test / viewer@yunxi.test / outsider@yunxi.test  (password: 123456)");
}

async function membership(projectId: string, userId: string, role: "OWNER" | "EDITOR" | "VIEWER") {
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: {}
  });
}

async function ensureDeleteRecord(
  projectId: string,
  resourceType: string,
  resourceId: string,
  name: string,
  reason: string
) {
  const exists = await prisma.deleteRecord.findFirst({ where: { projectId, resourceId } });
  if (!exists) {
    await prisma.deleteRecord.create({ data: { projectId, resourceType, resourceId, name, reason, state: "DELETED" } });
  }
}

async function migration(
  projectId: string,
  legacyNodeId: string,
  nodeKind: "SESSION" | "MATERIAL",
  newNodeId: string | null,
  status: "RESOLVED" | "DELETED" | "REVOKED",
  note: string
) {
  await prisma.nodeMigration.upsert({
    where: { projectId_legacyNodeId: { projectId, legacyNodeId } },
    create: { projectId, legacyNodeId, nodeKind, newNodeId, status, note },
    update: {}
  });
}

async function seedScript(
  sessionId: string,
  authorId: string,
  versions: ReturnType<typeof v>[]
) {
  const current = versions[versions.length - 1].version;
  await prisma.scriptDoc.upsert({
    where: { sessionId },
    create: { id: `doc_${sessionId}`, sessionId, currentVersion: current },
    update: {}
  });
  for (const ver of versions) {
    const id = `ver_${sessionId}_${ver.version}`;
    await prisma.scriptVersion.upsert({
      where: { id },
      create: {
        id,
        scriptId: `doc_${sessionId}`,
        version: ver.version,
        title: ver.title,
        steps: ver.steps,
        baseVersion: ver.baseVersion,
        note: ver.note,
        authorId
      },
      update: {}
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
