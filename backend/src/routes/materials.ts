import { Router } from "express";
import { z } from "zod";
import { MaterialKind } from "@prisma/client";
import { prisma } from "../prisma.js";
import { authenticate, projectLoader, requireWritable } from "../auth.js";
import { asyncHandler, badRequest, notFound } from "../errors.js";

export const materialsRouter = Router();

materialsRouter.use(authenticate);

materialsRouter.get(
  "/:projectId/materials",
  projectLoader,
  asyncHandler(async (req, res) => {
    const materials = await prisma.material.findMany({
      where: { projectId: req.params.projectId, deleteState: "ACTIVE" },
      orderBy: { createdAt: "desc" }
    });
    res.json({ materials });
  })
);

const createMaterialSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.nativeEnum(MaterialKind),
  url: z.string().url("素材地址必须是合法 URL")
});

materialsRouter.post(
  "/:projectId/materials",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const parsed = createMaterialSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("参数不合法", parsed.error.flatten());
    const material = await prisma.material.create({
      data: { projectId: req.params.projectId, ...parsed.data }
    });
    await prisma.project.update({
      where: { id: req.params.projectId },
      data: { version: { increment: 1 } }
    });
    res.status(201).json({ material });
  })
);

/** 素材详情：必须属于当前项目，且未被软删除。 */
materialsRouter.get(
  "/:projectId/materials/:materialId",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, materialId } = req.params;
    const material = await prisma.material.findFirst({
      where: { id: materialId, projectId, deleteState: "ACTIVE" }
    });
    if (!material) throw notFound("素材不存在、已删除或不属于该项目");
    res.json({ material });
  })
);

/** 软删除：持久库保存删除状态，而不是物理删除。 */
materialsRouter.delete(
  "/:projectId/materials/:materialId",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const { projectId, materialId } = req.params;
    const material = await prisma.material.findFirst({
      where: { id: materialId, projectId },
      select: { id: true, name: true, deleteState: true }
    });
    if (!material) throw notFound("素材不存在或不属于该项目");
    if (material.deleteState === "DELETED") {
      return res.status(204).end();
    }
    await prisma.$transaction([
      prisma.material.update({
        where: { id: materialId },
        data: { deleteState: "DELETED", deletedAt: new Date() }
      }),
      prisma.deleteRecord.create({
        data: { projectId, resourceType: "MATERIAL", resourceId: materialId, name: material.name, state: "DELETED" }
      }),
      prisma.project.update({ where: { id: projectId }, data: { version: { increment: 1 } } })
    ]);
    res.status(204).end();
  })
);
