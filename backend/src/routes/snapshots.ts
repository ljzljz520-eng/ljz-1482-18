import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authenticate, projectLoader, requireWritable } from "../auth.js";
import { asyncHandler, badRequest, notFound } from "../errors.js";

export const snapshotsRouter = Router();

snapshotsRouter.use(authenticate);

/** 场次的导出快照列表（每个快照绑定一个不可变版本）。 */
snapshotsRouter.get(
  "/:projectId/sessions/:sessionId/snapshots",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, sessionId } = req.params;
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");
    const snapshots = await prisma.snapshot.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      include: { version: { select: { version: true, title: true } } }
    });
    res.json({ snapshots });
  })
);

const createSnapshotSchema = z.object({
  label: z.string().min(1).max(120)
});

/** 为当前最新版本打导出快照；快照一旦创建不可变。 */
snapshotsRouter.post(
  "/:projectId/sessions/:sessionId/snapshots",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const { projectId, sessionId } = req.params;
    const parsed = createSnapshotSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("参数不合法", parsed.error.flatten());
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");
    const doc = await prisma.scriptDoc.findUnique({ where: { sessionId } });
    if (!doc) throw badRequest("该场次还没有可导出的脚本");
    const currentVersionRow = await prisma.scriptVersion.findUnique({
      where: { scriptId_version: { scriptId: doc.id, version: doc.currentVersion } }
    });
    if (!currentVersionRow) throw notFound("当前版本不存在");
    const snapshot = await prisma.snapshot.create({
      data: {
        projectId,
        sessionId,
        versionId: currentVersionRow.id,
        label: parsed.data.label
      },
      include: { version: { select: { version: true, title: true } } }
    });
    res.status(201).json({ snapshot });
  })
);

/**
 * 读取快照内容 —— 永远返回快照绑定的历史版本，
 * 即使脚本后来更新也不会错误导向最新草稿。
 */
snapshotsRouter.get(
  "/:projectId/snapshots/:snapshotId",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, snapshotId } = req.params;
    const snapshot = await prisma.snapshot.findFirst({
      where: { id: snapshotId, projectId },
      include: {
        session: { select: { id: true, title: true } },
        version: { include: { author: { select: { name: true } } } }
      }
    });
    if (!snapshot) throw notFound("快照不存在或不属于该项目");
    res.json({
      snapshot: {
        id: snapshot.id,
        label: snapshot.label,
        createdAt: snapshot.createdAt,
        sessionId: snapshot.sessionId,
        sessionTitle: snapshot.session.title,
        version: snapshot.version.version,
        title: snapshot.version.title,
        steps: snapshot.version.steps,
        note: snapshot.version.note,
        authorName: snapshot.version.author.name,
        projectStatus: req.ctx!.projectStatus
      }
    });
  })
);
