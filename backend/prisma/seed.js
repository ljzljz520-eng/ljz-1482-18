const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const logger = require('../src/lib/logger');

async function seed() {
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { displayName: '平台管理员' },
    create: { email: 'admin@example.com', displayName: '平台管理员', passwordHash }
  });
  const lin = await prisma.user.upsert({
    where: { email: 'lin@example.com' },
    update: { displayName: '林编剧' },
    create: { email: 'lin@example.com', displayName: '林编剧', passwordHash }
  });
  const wang = await prisma.user.upsert({
    where: { email: 'wang@example.com' },
    update: { displayName: '王审阅' },
    create: { email: 'wang@example.com', displayName: '王审阅', passwordHash }
  });

  const lantern = await prisma.project.upsert({
    where: { slug: 'prj-lantern-festival' },
    update: {},
    create: {
      slug: 'prj-lantern-festival',
      name: '灯会夜游季',
      status: 'ACTIVE',
      currentModule: 'workbench-v2',
      requiredModule: 'workbench-v2',
      schemaVersion: 2
    }
  });
  const cityMusic = await prisma.project.upsert({
    where: { slug: 'prj-city-music' },
    update: {},
    create: {
      slug: 'prj-city-music',
      name: '城市音乐现场',
      status: 'ACTIVE',
      currentModule: 'workbench-v2',
      requiredModule: 'workbench-v2',
      schemaVersion: 2
    }
  });
  const retired = await prisma.project.upsert({
    where: { slug: 'prj-retired-archive' },
    update: {},
    create: {
      slug: 'prj-retired-archive',
      name: '2023 云溪光影档案馆',
      status: 'RETIRED',
      currentModule: 'workbench-v2',
      requiredModule: 'workbench-v2',
      schemaVersion: 2
    }
  });
  const legacy = await prisma.project.upsert({
    where: { slug: 'prj-legacy-node' },
    update: {},
    create: {
      slug: 'prj-legacy-node',
      name: '旧节点迁移项目',
      status: 'ACTIVE',
      currentModule: 'legacy-node-v1',
      requiredModule: 'workbench-v2',
      schemaVersion: 1
    }
  });

  const memberships = [
    [admin.id, lantern.id, 'ADMIN'], [lin.id, lantern.id, 'EDITOR'], [wang.id, lantern.id, 'VIEWER'],
    [admin.id, cityMusic.id, 'EDITOR'], [lin.id, cityMusic.id, 'ADMIN'], [wang.id, cityMusic.id, 'VIEWER'],
    [admin.id, retired.id, 'VIEWER'], [lin.id, retired.id, 'VIEWER'],
    [admin.id, legacy.id, 'ADMIN'], [lin.id, legacy.id, 'EDITOR'], [wang.id, legacy.id, 'VIEWER']
  ];

  for (const [userId, projectId, role] of memberships) {
    await prisma.membership.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: { role },
      create: { userId, projectId, role }
    });
  }

  const lanternOpeningV1 = '【开场】镜头沿河岸升起，花灯依次点亮，旁白介绍云溪灯会的历史。';
  const lanternOpeningV2 = '【开场】镜头沿河岸升起，孩童提灯跑过石桥，花灯依次点亮；旁白介绍云溪灯会三十年的传承。';
  const lanternOpeningV3 = '【开场】夜幕低垂，镜头掠过石桥与河面，孩童提灯奔向灯阵；旁白以“三十年灯影”引入。';

  const opening = await prisma.session.upsert({
    where: { slug: 'ses-opening-river' },
    update: { title: '河岸开场', step: 'script', scriptText: lanternOpeningV3, baseVersion: 3, deletedAt: null },
    create: {
      slug: 'ses-opening-river', projectId: lantern.id, title: '河岸开场', step: 'script',
      scriptText: lanternOpeningV3, baseVersion: 3, createdById: lin.id
    }
  });
  const parade = await prisma.session.upsert({
    where: { slug: 'ses-lantern-parade' },
    update: { title: '巡游互动', step: 'outline', scriptText: '巡游队伍与游客互动，设置三次镜头反转和一次无人机拉远。', baseVersion: 1, deletedAt: null },
    create: {
      slug: 'ses-lantern-parade', projectId: lantern.id, title: '巡游互动', step: 'outline',
      scriptText: '巡游队伍与游客互动，设置三次镜头反转和一次无人机拉远。', baseVersion: 1, createdById: lin.id
    }
  });
  await prisma.session.upsert({
    where: { slug: 'ses-old-draft' },
    update: { deletedAt: new Date('2026-09-01T08:00:00Z') },
    create: {
      slug: 'ses-old-draft', projectId: lantern.id, title: '已废弃草稿', step: 'outline',
      scriptText: '该草稿已被持久库标记删除。', baseVersion: 1, deletedAt: new Date('2026-09-01T08:00:00Z'), createdById: admin.id
    }
  });

  const musicOpening = await prisma.session.upsert({
    where: { slug: 'ses-main-stage' },
    update: { title: '主舞台导播', step: 'review', scriptText: '主舞台使用 1 号机全景、3 号机歌手特写，结尾切入观众烟花全景。', baseVersion: 2, deletedAt: null },
    create: {
      slug: 'ses-main-stage', projectId: cityMusic.id, title: '主舞台导播', step: 'review',
      scriptText: '主舞台使用 1 号机全景、3 号机歌手特写，结尾切入观众烟花全景。', baseVersion: 2, createdById: admin.id
    }
  });
  await prisma.session.upsert({
    where: { slug: 'ses-legacy-script' },
    update: { title: '旧节点开场', step: 'outline', scriptText: '来自旧节点的数据，迁移前仅可查看迁移提示。', baseVersion: 1, deletedAt: null },
    create: {
      slug: 'ses-legacy-script', projectId: legacy.id, title: '旧节点开场', step: 'outline',
      scriptText: '来自旧节点的数据，迁移前仅可查看迁移提示。', baseVersion: 1, createdById: lin.id
    }
  });
  await prisma.session.upsert({
    where: { slug: 'ses-retired-show' },
    update: { title: '退役项目最终场次', step: 'review', scriptText: '最终冻结版本：灯影与河岸烟花同时亮起。', baseVersion: 1, deletedAt: null },
    create: {
      slug: 'ses-retired-show', projectId: retired.id, title: '退役项目最终场次', step: 'review',
      scriptText: '最终冻结版本：灯影与河岸烟花同时亮起。', baseVersion: 1, createdById: lin.id
    }
  });

  const versionContents = [
    [opening.id, lantern.id, 1, lanternOpeningV1, admin.id],
    [opening.id, lantern.id, 2, lanternOpeningV2, lin.id],
    [opening.id, lantern.id, 3, lanternOpeningV3, lin.id],
    [parade.id, lantern.id, 1, parade.scriptText, lin.id],
    [musicOpening.id, cityMusic.id, 1, '初版：主舞台以固定全景开场。', admin.id],
    [musicOpening.id, cityMusic.id, 2, musicOpening.scriptText, admin.id]
  ];
  for (const [sessionId, projectId, version, content, authorId] of versionContents) {
    await prisma.scriptVersion.upsert({
      where: { sessionId_version: { sessionId, version } },
      update: { content, projectId, authorId },
      create: { sessionId, projectId, version, content, authorId }
    });
  }

  const assets = [
    ['ast-river-keyvisual', lantern.id, '河岸主视觉', 'IMAGE', 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200', '用于开场和导出封面'],
    ['ast-crowd-foley', lantern.id, '人群环境声', 'AUDIO', 'https://example.com/audio/crowd-foley.mp3', '巡游段落底噪'],
    ['ast-drone-shot', lantern.id, '无人机灯阵', 'VIDEO', 'https://example.com/video/drone-lanterns.mp4', '结尾大景'],
    ['ast-stage-light', cityMusic.id, '舞台灯光', 'IMAGE', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200', '导播机位参考'],
    ['ast-legacy-logo', legacy.id, '旧节点标志', 'IMAGE', 'https://example.com/images/legacy-logo.png', '等待模块迁移']
  ];
  for (const [slug, projectId, name, type, url, notes] of assets) {
    await prisma.asset.upsert({
      where: { slug },
      update: { name, type, url, notes, deletedAt: null },
      create: { slug, projectId, name, type, url, notes }
    });
  }
  await prisma.asset.upsert({
    where: { slug: 'ast-removed-audio' },
    update: { deletedAt: new Date('2026-09-02T08:00:00Z') },
    create: {
      slug: 'ast-removed-audio', projectId: lantern.id, name: '已移除音效', type: 'AUDIO',
      url: 'https://example.com/audio/removed.mp3', notes: '删除状态持久化', deletedAt: new Date('2026-09-02T08:00:00Z')
    }
  });

  const snapshot1 = await prisma.exportSnapshot.upsert({
    where: { slug: 'exp-lantern-v2-review' },
    update: {},
    create: {
      slug: 'exp-lantern-v2-review', projectId: lantern.id, sessionId: opening.id,
      label: '评审版 V2', scriptText: lanternOpeningV2, scriptVersion: 2, step: 'script', exportedById: admin.id
    }
  });
  await prisma.exportSnapshot.upsert({
    where: { slug: 'exp-retired-final' },
    update: {},
    create: {
      slug: 'exp-retired-final', projectId: retired.id,
      sessionId: (await prisma.session.findUniqueOrThrow({ where: { slug: 'ses-retired-show' } })).id,
      label: '退役最终归档', scriptText: '最终冻结版本：灯影与河岸烟花同时亮起。', scriptVersion: 1,
      step: 'review', exportedById: lin.id
    }
  });
  await prisma.exportSnapshot.upsert({
    where: { slug: 'exp-music-demo' },
    update: {},
    create: {
      slug: 'exp-music-demo', projectId: cityMusic.id, sessionId: musicOpening.id,
      label: '内部试听导播版', scriptText: musicOpening.scriptText, scriptVersion: 2,
      step: 'review', exportedById: admin.id
    }
  });

  // 保留一条已完成迁移记录，便于查看审计；旧节点项目本身仍保持待迁移状态用于验收。
  await prisma.moduleMigration.upsert({
    where: { id: 'seed-migration-lantern' },
    update: { projectId: lantern.id },
    create: {
      id: 'seed-migration-lantern', projectId: lantern.id, fromModule: 'legacy-node-v1',
      toModule: 'workbench-v2', fromSchema: 1, toSchema: 2, status: 'COMPLETED',
      note: '演示：历史模块升级审计记录', migratedById: admin.id, migratedAt: new Date('2026-08-15T10:00:00Z')
    }
  });

  logger.info('Seed completed: admin@example.com / lin@example.com / wang@example.com, password 123456');
}

seed()
  .catch((error) => {
    logger.error({ err: error }, 'seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
