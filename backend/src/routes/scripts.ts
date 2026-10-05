import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authenticate, projectLoader, requireWritable } from "../auth.js";
import { asyncHandler, badRequest, conflict, notFound } from "../errors.js";

export const scriptsRouter = Router();

scriptsRouter.use(authenticate);

const stepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  content: z.string().max(10_000)
});

const saveScriptSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  steps: z.array(stepSchema).min(1, "至少保留一个步骤").max(100),
  baseVersion: z.number().int().nonnegative(),
  note: z.string().max(300).optional(),
  mode: z.enum(["MERGE", "OVERWRITE"]).default("MERGE")
});

/**
 * 保存场次脚本（乐观锁）。
 * baseVersion = 0 表示新建；>0 时必须等于服务端当前版本，否则 409。
 * mode=OVERWRITE 仅允许用户在前端显式确认冲突后传入，导航守卫不会自动覆盖。
 */
scriptsRouter.put(
  "/:projectId/sessions/:sessionId/script",
  projectLoader,
  asyncHandler(async (req, res) => {
    requireWritable(req.ctx!);
    const { projectId, sessionId } = req.params;
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");

    const parsed = saveScriptSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("脚本数据不合法", parsed.error.flatten());
    const { title, steps, baseVersion, note, mode } = parsed.data;

    // 幂等确保 ScriptDoc 存在：并发首登时只有一个 create 成功，其余转更新分支
    let doc = await prisma.scriptDoc.findUnique({ where: { sessionId } });
    if (!doc) {
      try {
        doc = await prisma.scriptDoc.create({ data: { sessionId, currentVersion: 1 } });
      } catch (createErr) {
        if ((createErr as { code?: string }).code !== "P2002") throw createErr;
        doc = await prisma.scriptDoc.findUniqueOrThrow({ where: { sessionId } });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 事务内重新读取并加行锁，串行化版本递增，避免双花版本号
      const locked = await tx.$queryRaw<{ currentVersion: number }[]>`
        SELECT "currentVersion" FROM "ScriptDoc" WHERE id = ${doc!.id} FOR UPDATE
      `;
      const currentVersion = Number(locked[0]?.currentVersion ?? 0);

      // 首次保存：必须 baseVersion=0，且尚无任何版本
      const versionCount = await tx.scriptVersion.count({ where: { scriptId: doc!.id } });
      if (versionCount === 0) {
        if (baseVersion !== 0) throw conflict("脚本已由他人创建", { serverVersion: 1 });
        const created = await tx.scriptVersion.create({
          data: {
            scriptId: doc!.id,
            version: 1,
            title,
            steps: steps as unknown as object,
            authorId: req.user!.sub,
            baseVersion: 0,
            note
          }
        });
        const fresh = await tx.scriptDoc.update({
          where: { id: doc!.id },
          data: { currentVersion: 1 },
          include: { versions: { where: { version: 1 } } }
        });
        return { doc: fresh, version: created };
      }

      if (baseVersion !== currentVersion) {
        const serverLatest = await tx.scriptVersion.findUnique({
          where: { scriptId_version: { scriptId: doc!.id, version: currentVersion } }
        });
        throw conflict("服务器已有更新的稿件，已为你保留本地修改", {
          serverVersion: currentVersion,
          serverTitle: serverLatest?.title ?? null,
          serverSteps: serverLatest?.steps ?? null,
          serverUpdatedAt: serverLatest?.createdAt ?? null
        });
      }

      const nextVersion = currentVersion + 1;
      const created = await tx.scriptVersion.create({
        data: {
          scriptId: doc!.id,
          version: nextVersion,
          title,
          steps: steps as unknown as object,
          authorId: req.user!.sub,
          baseVersion,
          note: mode === "OVERWRITE" ? (note ? `${note} [强制覆盖]` : "[强制覆盖]") : note
        }
      });
      const updated = await tx.scriptDoc.update({
        where: { id: doc!.id },
        data: { currentVersion: nextVersion },
        include: { versions: { where: { version: nextVersion } } }
      });
      return { doc: updated, version: created };
    }, { isolationLevel: "ReadCommitted" });

    await prisma.project.update({ where: { id: projectId }, data: { version: { increment: 1 } } });

    res.json({
      saved: true,
      version: result.version.version,
      title: result.version.title,
      steps: result.version.steps,
      note: result.version.note,
      authorId: result.version.authorId,
      updatedAt: result.doc.updatedAt
    });
  })
);

/** 版本历史（导出快照与历史回溯用）。 */
scriptsRouter.get(
  "/:projectId/sessions/:sessionId/script/versions",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, sessionId } = req.params;
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");
    const doc = await prisma.scriptDoc.findUnique({
      where: { sessionId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            version: true,
            title: true,
            note: true,
            createdAt: true,
            authorId: true,
            author: { select: { name: true } }
          }
        }
      }
    });
    res.json({ currentVersion: doc?.currentVersion ?? 0, versions: doc?.versions ?? [] });
  })
);

/** 读取指定版本内容（历史快照访问，绝不返回最新稿）。 */
scriptsRouter.get(
  "/:projectId/sessions/:sessionId/script/versions/:version",
  projectLoader,
  asyncHandler(async (req, res) => {
    const { projectId, sessionId } = req.params;
    const version = Number(req.params.version);
    if (!Number.isInteger(version) || version < 1) throw badRequest("版本号不合法");
    const session = await prisma.sessionNode.findFirst({ where: { id: sessionId, projectId } });
    if (!session) throw notFound("场次不存在或不属于该项目");
    const doc = await prisma.scriptDoc.findUnique({ where: { sessionId } });
    if (!doc) throw notFound("该场次没有脚本历史");
    const item = await prisma.scriptVersion.findUnique({
      where: { scriptId_version: { scriptId: doc.id, version } },
      include: { author: { select: { name: true } } }
    });
    if (!item) throw notFound("历史版本不存在");
    res.json({
      version: item.version,
      title: item.title,
      steps: item.steps,
      note: item.note,
      createdAt: item.createdAt,
      authorName: item.author.name
    });
  })
);
