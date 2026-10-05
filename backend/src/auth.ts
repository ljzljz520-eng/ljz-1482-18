import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";
import { forbidden, notFound, retired, unauthorized } from "./errors.js";
import { prisma } from "./prisma.js";
import type { Role } from "@prisma/client";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized());
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = jwt.verify(token, env.jwtSecret) as JwtPayload;
    return next();
  } catch {
    return next(unauthorized());
  }
}

export interface ProjectContext {
  projectId: string;
  role: Role;
  projectStatus: "ACTIVE" | "RETIRED";
}

/**
 * 加载项目并校验当前用户是否为项目成员。
 * 非成员一律返回 404（避免猜到 projectId 后通过 403 枚举项目是否存在）。
 */
export async function loadProjectContext(projectId: string, userId: string): Promise<ProjectContext> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { project: { select: { status: true } } }
  });
  if (!membership) {
    const exists = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    throw exists
      ? forbidden("你不是该项目成员，无权访问")
      : notFound();
  }
  return {
    projectId,
    role: membership.role,
    projectStatus: membership.project.status
  };
}

/** 要求写权限；项目退役后所有写操作一律 410。 */
export function requireWritable(ctx: ProjectContext) {
  if (ctx.projectStatus === "RETIRED") {
    throw retired();
  }
  if (ctx.role === "VIEWER") {
    throw forbidden("只读成员不能执行该操作");
  }
}

/** 从路由参数 :projectId 解析上下文，挂载到 req.ctx。 */
export async function projectLoader(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) throw unauthorized();
    const projectId = req.params.projectId as string;
    req.ctx = await loadProjectContext(projectId, req.user.sub);
    next();
  } catch (err) {
    next(err);
  }
}

declare module "express-serve-static-core" {
  interface Request {
    ctx?: ProjectContext;
  }
}
