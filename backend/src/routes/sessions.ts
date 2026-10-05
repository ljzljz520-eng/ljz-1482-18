import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authenticate, projectLoader, requireWritable } from "../auth.js";
import { asyncHandler, badRequest, notFound } from "../errors.js";

export const sessionsRouter = Router();

sessionsRouter.use(authenticate);

sessionsRouter.get(
  "/:projectId/sessions",
  projectLoader,
  asyncHandler(async (req, res) => {
    const sessions = await prisma.sessionNode.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }]
    });
    res.json({ sessions });
  })
);

const createSessionSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().max(500).optional()
});

sessionsRouter.post(
  "/:projectId/sessions",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("参数不合法", parsed.error.flatten());
    const count = await prisma.sessionNode.count({ where: { projectId: req.params.projectId } });
    const session = await prisma.sessionNode.create({
      data: {
        projectId: req.params.projectId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        orderIndex: count
      }
    });
    await prisma.project.update({
      where: { id: req.params.projectId },
      data: { version: { increment: 1 } }
    });
    res.status(201).json({ session });
  })
);

/** 场次详情（含脚本与最新版本）。属于其他项目的 sessionId 一律 404。 */
sessionsRouter.get(
  "/:projectId/sessions/:sessionId",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, sessionId } = req.params;
    const session = await prisma.sessionNode.findFirst({
      where: { id: sessionId, projectId }
    });
    if (!session) throw notFound("场次不存在或不属于该项目");
    const script = await prisma.scriptDoc.findUnique({
      where: { sessionId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 }
      }
    });
    res.json({
      session,
      script: script
        ? {
            id: script.id,
            currentVersion: script.currentVersion,
            updatedAt: script.updatedAt,
            latest: script.versions[0]
              ? {
                  version: script.versions[0].version,
                  title: script.versions[0].title,
                  steps: script.versions[0].steps,
                  authorId: script.versions[0].authorId,
                  note: script.versions[0].note,
                  createdAt: script.versions[0].createdAt
                }
              : null
          }
        : null
    });
  })
);

sessionsRouter.delete(
  "/:projectId/sessions/:sessionId",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const { projectId, sessionId } = req.params;
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");
    await prisma.$transaction([
      prisma.sessionNode.delete({ where: { id: sessionId } }),
      prisma.deleteRecord.create({
        data: { projectId, resourceType: "SESSION", resourceId: sessionId, name: session.title, state: "DELETED" }
      }),
      prisma.project.update({ where: { id: projectId }, data: { version: { increment: 1 } } })
    ]);
    res.status(204).end();
  })
);

/**
 * 演示用：把旧节点迁移到新场次（模拟「旧节点迁移」）。
 * 写入 module migration 记录，项目版本 +1。
 */
sessionsRouter.post(
  "/:projectId/migrate",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const schema = z.object({
      legacyNodeId: z.string().min(1),
      newSessionId: z.string().min(1),
      note: z.string().max(200).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest("参数不合法", parsed.error.flatten());
    const { projectId } = req.params;
    const target = await prisma.sessionNode.findFirst({
      where: { id: parsed.data.newSessionId, projectId }
    });
    if (!target) throw notFound("目标场次不存在或不属于该项目");
    const migration = await prisma.nodeMigration.upsert({
      where: { projectId_legacyNodeId: { projectId, legacyNodeId: parsed.data.legacyNodeId } },
      create: {
        projectId,
        legacyNodeId: parsed.data.legacyNodeId,
        nodeKind: "SESSION",
        newNodeId: target.id,
        status: "RESOLVED",
        note: parsed.data.note
      },
      update: { newNodeId: target.id, status: "RESOLVED", note: parsed.data.note, migratedAt: new Date() }
    });
    await prisma.project.update({ where: { id: projectId }, data: { version: { increment: 1 } } });
    res.status(201).json({ migration });
  })
);
