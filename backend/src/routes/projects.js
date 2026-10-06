const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requireAuth, loadProject, requireProjectRole, requireActiveProject } = require('../middleware/auth');
const { asyncHandler, notFound, forbidden, validation } = require('../lib/errors');
const { projectSummary, projectDetail, sessionSerializer, assetSerializer, exportSerializer } = require('../lib/serializers');

const router = express.Router();
router.use(requireAuth);

const projectIdSchema = z.object({ projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/, '项目 ID 格式非法') });
const sessionTargetSchema = z.string().regex(/^ses-[a-z0-9-]{4,40}$/, '场次 ID 格式非法');
const assetTargetSchema = z.string().regex(/^ast-[a-z0-9-]{4,40}$/, '素材 ID 格式非法');

router.get('/', asyncHandler(async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id },
    include: { project: true },
    orderBy: { project: { updatedAt: 'desc' } }
  });
  res.json({ projects: memberships.map((m) => projectSummary(m.project, m.role)) });
}));

router.get(
  '/:projectSlug/access',
  validate(projectIdSchema, 'params'),
  asyncHandler(async (req, res, next) => {
    // 单独完成“先验证访问”的轻量入口；loadProject 已校验成员身份。
    return loadProject(req, res, next);
  }),
  asyncHandler(async (req, res) => {
    const project = req.project;
    const latestVersion = await prisma.scriptVersion.aggregate({
      where: { projectId: project.id },
      _max: { version: true }
    });

    const result = projectDetail(project, req.role, latestVersion._max.version ?? 1);
    res.json({ access: result });
  })
);

router.get(
  '/:projectSlug/workbench',
  validate(projectIdSchema, 'params'),
  validate(z.object({
    session: sessionTargetSchema.optional(),
    asset: assetTargetSchema.optional()
  }), 'query'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const project = req.project;
    const { session: sessionSlug, asset: assetSlug } = req.query;

    const [sessions, assets, latestAgg] = await Promise.all([
      prisma.session.findMany({
        where: { projectId: project.id, deletedAt: null },
        include: { project: true },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.asset.findMany({
        where: { projectId: project.id, deletedAt: null },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.scriptVersion.aggregate({
        where: { projectId: project.id },
        _max: { version: true }
      })
    ]);

    let target = { kind: 'project', step: 'overview' };
    if (sessionSlug) {
      const session = await prisma.session.findUnique({ where: { slug: sessionSlug }, include: { project: true } });
      if (!session || session.projectId !== project.id) throw notFound('深链接指向的场次不存在于该项目');
      if (session.deletedAt) throw notFound('深链接指向的场次已删除');
      target = { kind: 'session', step: session.step, session: sessionSerializer(session) };
    } else if (assetSlug) {
      const asset = await prisma.asset.findUnique({ where: { slug: assetSlug } });
      if (!asset || asset.projectId !== project.id) throw notFound('深链接指向的素材不存在于该项目');
      if (asset.deletedAt) throw notFound('深链接指向的素材已删除');
      target = { kind: 'asset', step: 'asset', asset: assetSerializer(asset) };
    }

    if (project.status === 'RETIRED') {
      const snapshots = await prisma.exportSnapshot.findMany({
        where: { projectId: project.id },
        include: { project: true, session: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json({
        project: projectDetail(project, req.role, latestAgg._max.version ?? 1),
        retired: true,
        target,
        snapshots: snapshots.map(exportSerializer)
      });
    }

    res.json({
      project: projectDetail(project, req.role, latestAgg._max.version ?? 1),
      retired: false,
      requiresMigration: project.currentModule !== project.requiredModule,
      target,
      sessions: sessions.map(sessionSerializer),
      assets: assets.map(assetSerializer)
    });
  })
);

const migrateSchema = z.object({
  confirm: z.literal(true, { message: '请确认执行模块迁移' })
});

router.post(
  '/:projectSlug/migrate',
  validate(projectIdSchema, 'params'),
  validate(migrateSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('ADMIN'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const project = req.project;
    if (project.currentModule === project.requiredModule && project.schemaVersion >= 2) {
      return res.json({ project: projectDetail(project, req.role, project.schemaVersion), migration: { skipped: true } });
    }

    const fromModule = project.currentModule;
    const fromSchema = project.schemaVersion;
    const migrated = await prisma.$transaction(async (tx) => {
      const current = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
      if (current.currentModule === current.requiredModule && current.schemaVersion >= 2) {
        return { project: current, skipped: true };
      }

      const updated = await tx.project.update({
        where: { id: project.id },
        data: { currentModule: project.requiredModule, schemaVersion: 2 }
      });
      await tx.moduleMigration.create({
        data: {
          projectId: project.id,
          fromModule,
          toModule: project.requiredModule,
          fromSchema,
          toSchema: 2,
          status: 'COMPLETED',
          note: '旧节点数据升级到创作工作台 v2',
          migratedById: req.user.id
        }
      });
      return { project: updated, skipped: false };
    });

    res.json({
      project: projectDetail(migrated.project, req.role, migrated.project.schemaVersion),
      migration: { skipped: migrated.skipped, fromModule, toModule: project.requiredModule }
    });
  })
);

router.get(
  '/:projectSlug/migrations',
  validate(projectIdSchema, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const records = await prisma.moduleMigration.findMany({
      where: { projectId: req.project.id },
      orderBy: { migratedAt: 'desc' }
    });
    res.json({ migrations: records });
  })
);

module.exports = router;
