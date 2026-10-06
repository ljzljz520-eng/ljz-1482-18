const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requireAuth, loadProject, requireProjectRole, requireActiveProject } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../lib/errors');
const { exportSerializer } = require('../lib/serializers');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const projectParam = z.object({ projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/) });
const exportParam = z.object({
  projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/),
  exportSlug: z.string().regex(/^exp-[a-z0-9-]{4,40}$/)
});

router.get(
  '/',
  validate(projectParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const snapshots = await prisma.exportSnapshot.findMany({
      where: { projectId: req.project.id },
      include: { project: true, session: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ exports: snapshots.map(exportSerializer) });
  })
);

router.get(
  '/:exportSlug',
  validate(exportParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const snapshot = await prisma.exportSnapshot.findUnique({
      where: { slug: req.params.exportSlug },
      include: { project: true, session: true }
    });
    if (!snapshot || snapshot.projectId !== req.project.id) throw notFound('导出快照不存在');
    // 即使项目退役或场次删除，成员仍可通过其链接读取冻结快照。
    res.json({ export: exportSerializer(snapshot) });
  })
);

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
  sessionId: z.string().regex(/^ses-[a-z0-9-]{4,40}$/).optional()
});

router.post(
  '/',
  validate(projectParam, 'params'),
  validate(createSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('EDITOR'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    let session = null;
    if (req.body.sessionId) {
      session = await prisma.session.findFirst({
        where: { slug: req.body.sessionId, projectId: req.project.id, deletedAt: null }
      });
      if (!session) throw notFound('不能导出不存在或已删除的场次');
    }

    const slug = `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const snapshot = await prisma.exportSnapshot.create({
      data: {
        slug,
        projectId: req.project.id,
        sessionId: session?.id ?? null,
        label: req.body.label,
        scriptText: session?.scriptText ?? '',
        scriptVersion: session?.baseVersion ?? 0,
        step: session?.step ?? 'overview',
        exportedById: req.user.id
      },
      include: { project: true, session: true }
    });
    res.status(201).json({ export: exportSerializer(snapshot) });
  })
);

module.exports = router;
