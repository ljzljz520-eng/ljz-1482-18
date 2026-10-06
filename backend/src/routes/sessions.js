const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requireAuth, loadProject, requireProjectRole, requireActiveProject } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../lib/errors');
const { sessionSerializer, versionSerializer } = require('../lib/serializers');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const projectParam = z.object({ projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/) });
const sessionParam = z.object({
  projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/),
  sessionSlug: z.string().regex(/^ses-[a-z0-9-]{4,40}$/)
});

async function findLiveSession(projectId, slug) {
  const session = await prisma.session.findUnique({
    where: { slug },
    include: { project: true }
  });
  if (!session || session.projectId !== projectId) throw notFound('场次不存在');
  if (session.deletedAt) throw notFound('场次已删除');
  return session;
}

router.get(
  '/',
  validate(projectParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { projectId: req.project.id, deletedAt: null },
      include: { project: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ sessions: sessions.map(sessionSerializer) });
  })
);

router.get(
  '/:sessionSlug',
  validate(sessionParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const session = await findLiveSession(req.project.id, req.params.sessionSlug);
    res.json({ session: sessionSerializer(session) });
  })
);

const createSchema = z.object({
  id: z.string().regex(/^ses-[a-z0-9-]{4,40}$/).optional(),
  title: z.string().trim().min(1).max(80),
  step: z.enum(['outline', 'script', 'review']).default('outline'),
  scriptText: z.string().max(50000).default('')
});

router.post(
  '/',
  validate(projectParam, 'params'),
  validate(createSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('EDITOR'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const slug = req.body.id || `ses-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          slug,
          projectId: req.project.id,
          title: req.body.title,
          step: req.body.step,
          scriptText: req.body.scriptText,
          baseVersion: 1,
          createdById: req.user.id
        },
        include: { project: true }
      });
      await tx.scriptVersion.create({
        data: {
          projectId: req.project.id,
          sessionId: created.id,
          version: 1,
          content: created.scriptText,
          authorId: req.user.id
        }
      });
      return created;
    });
    res.status(201).json({ session: sessionSerializer(session) });
  })
);

const saveSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  step: z.enum(['outline', 'script', 'review']).optional(),
  scriptText: z.string().max(50000),
  expectedVersion: z.number().int().positive()
});

router.put(
  '/:sessionSlug',
  validate(sessionParam, 'params'),
  validate(saveSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('EDITOR'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const session = await findLiveSession(req.project.id, req.params.sessionSlug);

    if (session.baseVersion !== req.body.expectedVersion) {
      const latest = await prisma.scriptVersion.findFirst({
        where: { sessionId: session.id },
        orderBy: { version: 'desc' },
        include: { author: true, session: true }
      });
      return res.status(409).json({
        code: 'SCRIPT_VERSION_CONFLICT',
        message: '服务器已有更新的稿件，请选择合并后再保存',
        conflict: {
          currentVersion: session.baseVersion,
          serverVersion: latest?.version ?? session.baseVersion,
          serverContent: latest?.content ?? session.scriptText,
          serverAuthor: latest?.author ? { id: latest.author.id, displayName: latest.author.displayName } : null
        }
      });
    }

    const nextVersion = session.baseVersion + 1;
    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`SELECT id, "baseVersion" FROM "Session" WHERE id = ${session.id} FOR UPDATE`;
      const lockedSession = Array.isArray(locked) ? locked[0] : undefined;
      if (!lockedSession) throw notFound('场次不存在');
      const current = await tx.session.findUniqueOrThrow({ where: { id: session.id }, include: { project: true } });
      if (current.deletedAt) throw notFound('场次已删除');
      if (Number(lockedSession.baseVersion) !== req.body.expectedVersion) {
        const latest = await tx.scriptVersion.findFirst({
          where: { sessionId: current.id },
          orderBy: { version: 'desc' },
          include: { author: true, session: true }
        });
        const err = new Error('VERSION_CONFLICT');
        err.status = 409;
        err.payload = {
          code: 'SCRIPT_VERSION_CONFLICT',
          message: '服务器已有更新的稿件，请选择合并后再保存',
          conflict: {
            currentVersion: Number(lockedSession.baseVersion),
            serverVersion: latest?.version ?? Number(lockedSession.baseVersion),
            serverContent: latest?.content ?? current.scriptText,
            serverAuthor: latest?.author ? { id: latest.author.id, displayName: latest.author.displayName } : null
          }
        };
        throw err;
      }

      const saved = await tx.session.update({
        where: { id: session.id },
        data: {
          title: req.body.title ?? current.title,
          step: req.body.step ?? current.step,
          scriptText: req.body.scriptText,
          baseVersion: nextVersion
        },
        include: { project: true }
      });
      await tx.scriptVersion.create({
        data: {
          projectId: req.project.id,
          sessionId: session.id,
          version: nextVersion,
          content: req.body.scriptText,
          authorId: req.user.id
        }
      });
      return saved;
    }, { isolationLevel: 'Serializable' }).catch((error) => {
      if (error.message === 'VERSION_CONFLICT') return res.status(409).json(error.payload);
      throw error;
    });

    if (updated) res.json({ session: sessionSerializer(updated), committedVersion: nextVersion });
  })
);

router.delete(
  '/:sessionSlug',
  validate(sessionParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('ADMIN'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const session = await findLiveSession(req.project.id, req.params.sessionSlug);
    await prisma.session.update({ where: { id: session.id }, data: { deletedAt: new Date() } });
    res.status(202).json({ id: session.slug, deleted: true });
  })
);

router.get(
  '/:sessionSlug/versions',
  validate(sessionParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const session = await findLiveSession(req.project.id, req.params.sessionSlug);
    const versions = await prisma.scriptVersion.findMany({
      where: { sessionId: session.id },
      include: { author: true, session: true },
      orderBy: { version: 'desc' }
    });
    res.json({ versions: versions.map(versionSerializer) });
  })
);

module.exports = router;
