const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { requireAuth, loadProject, requireProjectRole, requireActiveProject } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../lib/errors');
const { assetSerializer } = require('../lib/serializers');

const router = express.Router({ mergeParams: true });
router.use(requireAuth);

const projectParam = z.object({ projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/) });
const assetParam = z.object({
  projectSlug: z.string().regex(/^prj-[a-z0-9-]{4,40}$/),
  assetSlug: z.string().regex(/^ast-[a-z0-9-]{4,40}$/)
});

async function findLiveAsset(projectId, slug) {
  const asset = await prisma.asset.findUnique({ where: { slug } });
  if (!asset || asset.projectId !== projectId) throw notFound('素材不存在');
  if (asset.deletedAt) throw notFound('素材已删除');
  return asset;
}

router.get(
  '/',
  validate(projectParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const assets = await prisma.asset.findMany({
      where: { projectId: req.project.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ assets: assets.map(assetSerializer) });
  })
);

router.get(
  '/:assetSlug',
  validate(assetParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  asyncHandler(async (req, res) => {
    const asset = await findLiveAsset(req.project.id, req.params.assetSlug);
    res.json({ asset: assetSerializer(asset) });
  })
);

const createSchema = z.object({
  id: z.string().regex(/^ast-[a-z0-9-]{4,40}$/).optional(),
  name: z.string().trim().min(1).max(80),
  type: z.enum(['IMAGE', 'AUDIO', 'VIDEO', 'TEXT']),
  url: z.string().trim().url().max(1000),
  notes: z.string().max(5000).default('')
});

router.post(
  '/',
  validate(projectParam, 'params'),
  validate(createSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('EDITOR'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const slug = req.body.id || `ast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const asset = await prisma.asset.create({
      data: {
        slug,
        projectId: req.project.id,
        name: req.body.name,
        type: req.body.type,
        url: req.body.url,
        notes: req.body.notes
      }
    });
    res.status(201).json({ asset: assetSerializer(asset) });
  })
);

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().url().max(1000).optional(),
  notes: z.string().max(5000).optional()
});

router.put(
  '/:assetSlug',
  validate(assetParam, 'params'),
  validate(updateSchema),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('EDITOR'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const asset = await findLiveAsset(req.project.id, req.params.assetSlug);
    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        name: req.body.name ?? asset.name,
        url: req.body.url ?? asset.url,
        notes: req.body.notes ?? asset.notes
      }
    });
    res.json({ asset: assetSerializer(updated) });
  })
);

router.delete(
  '/:assetSlug',
  validate(assetParam, 'params'),
  asyncHandler(async (req, res, next) => loadProject(req, res, next)),
  requireProjectRole('ADMIN'),
  requireActiveProject,
  asyncHandler(async (req, res) => {
    const asset = await findLiveAsset(req.project.id, req.params.assetSlug);
    await prisma.asset.update({ where: { id: asset.id }, data: { deletedAt: new Date() } });
    res.status(202).json({ id: asset.slug, deleted: true });
  })
);

module.exports = router;
