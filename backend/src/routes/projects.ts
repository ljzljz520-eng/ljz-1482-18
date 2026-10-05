import { Router } from "express";
import { prisma } from "../prisma.js";
import { authenticate, projectLoader } from "../auth.js";
import { asyncHandler, forbidden, notFound } from "../errors.js";

export const projectsRouter = Router();

projectsRouter.use(authenticate);

/** 当前用户可见的项目列表（含角色与版本）。 */
projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: req.user!.sub },
      include: {
        project: {
          select: { id: true, name: true, description: true, status: true, version: true, updatedAt: true }
        }
      },
      orderBy: { project: { updatedAt: "desc" } }
    });
    res.json({
      projects: memberships.map((m) => ({
        ...m.project,
        myRole: m.role
      }))
    });
  })
);

projectsRouter.get(
  "/:projectId",
  projectLoader,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        version: true,
        updatedAt: true,
        members: {
          select: {
            role: true,
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    if (!project) throw notFound();
    res.json({ project: { ...project, myRole: req.ctx!.role } });
  })
);

/** 项目工作台引导数据：版本、成员权限、场次、素材（软删除不返回）。 */
projectsRouter.get(
  "/:projectId/bootstrap",
  projectLoader,
  asyncHandler(async (req, res) => {
    const [project, sessions, materials] = await Promise.all([
      prisma.project.findUnique({
        where: { id: req.params.projectId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          version: true,
          updatedAt: true,
          members: {
            select: { role: true, user: { select: { id: true, name: true, email: true } } }
          }
        }
      }),
      prisma.sessionNode.findMany({
        where: { projectId: req.params.projectId },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }]
      }),
      prisma.material.findMany({
        where: { projectId: req.params.projectId, deleteState: "ACTIVE" },
        orderBy: { createdAt: "desc" }
      })
    ]);
    if (!project) throw notFound();
    res.json({
      project: { ...project, myRole: req.ctx!.role },
      sessions,
      materials
    });
  })
);

/** 演示用：项目退役（仅 OWNER）。 */
projectsRouter.post(
  "/:projectId/retire",
  projectLoader,
  asyncHandler(async (req, res) => {
    const ctx = req.ctx!;
    if (ctx.role !== "OWNER") throw forbidden("仅项目所有者可以退役项目");
    const project = await prisma.project.update({
      where: { id: ctx.projectId },
      data: { status: "RETIRED", version: { increment: 1 } }
    });
    res.json({ project: { id: project.id, status: project.status, version: project.version } });
  })
);

/** 演示用：恢复已退役项目（仅 OWNER）。 */
projectsRouter.post(
  "/:projectId/reactivate",
  projectLoader,
  asyncHandler(async (req, res) => {
    const ctx = req.ctx!;
    if (ctx.role !== "OWNER") throw forbidden("仅项目所有者可以恢复项目");
    const project = await prisma.project.update({
      where: { id: ctx.projectId },
      data: { status: "ACTIVE", version: { increment: 1 } }
    });
    res.json({ project: { id: project.id, status: project.status, version: project.version } });
  })
);
