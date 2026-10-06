const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { unauthorized, forbidden, notFound } = require('../lib/errors');

const PROJECT_ROLE_RANK = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized('缺少登录令牌');

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthorized('账号不存在或登录已失效');

    req.user = { id: user.id, email: user.email, displayName: user.displayName };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      next(unauthorized('登录会话已过期，请重新登录'));
      return;
    }
    next(error);
  }
}

async function loadProject(req, _res, next) {
  try {
    const { projectSlug } = req.params;
    const project = await prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) throw notFound('项目不存在');

    const membership = await prisma.membership.findUnique({
      where: { userId_projectId: { userId: req.user.id, projectId: project.id } }
    });
    if (!membership) {
      // 对猜到 ID 的请求保持与不存在一致，不暴露项目元数据。
      throw notFound('项目不存在或您没有访问权限');
    }

    req.project = project;
    req.membership = membership;
    req.role = membership.role;
    next();
  } catch (error) {
    next(error);
  }
}

const requireProjectRole = (minimumRole) => (req, _res, next) => {
  if (!req.membership) return next(forbidden());
  if (PROJECT_ROLE_RANK[req.membership.role] < PROJECT_ROLE_RANK[minimumRole]) {
    return next(forbidden('当前成员权限不足'));
  }
  next();
};

const requireActiveProject = (_req, _res, next) => {
  // 深链接可以看到退役项目中的只读快照，但普通工作台写入必须拒绝。
  if (_req.project.status !== 'ACTIVE') {
    return next(forbidden('项目已退役，不能执行写入操作'));
  }
  next();
};

module.exports = { requireAuth, loadProject, requireProjectRole, requireActiveProject, PROJECT_ROLE_RANK };
