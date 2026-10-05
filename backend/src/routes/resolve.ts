import { Router } from "express";
import { authenticate, projectLoader } from "../auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler, notFound } from "../errors.js";

export const resolveRouter = Router();

/**
 * 旧节点深链接解析：/api/projects/:projectId/resolve/:legacyNodeId
 * 返回迁移目标；旧节点已删除/被清理时返回 410 语义，由前端展示。
 */
resolveRouter.get(
  "/:projectId/resolve/:legacyNodeId",
  authenticate,
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, legacyNodeId } = req.params;
    const migration = await prisma.nodeMigration.findUnique({
      where: { projectId_legacyNodeId: { projectId, legacyNodeId } }
    });
    if (!migration) throw notFound("未找到该链接对应的内容，可能链接已失效");
    if (migration.status !== "RESOLVED" || !migration.newNodeId) {
      return res.status(200).json({
        resolved: false,
        status: migration.status,
        legacyNodeId,
        nodeKind: migration.nodeKind,
        note: migration.note
      });
    }
    res.json({
      resolved: true,
      status: "RESOLVED",
      legacyNodeId,
      nodeKind: migration.nodeKind,
      newNodeId: migration.newNodeId,
      note: migration.note
    });
  })
);
