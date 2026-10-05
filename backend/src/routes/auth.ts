import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { signToken } from "../auth.js";
import { asyncHandler, badRequest, unauthorized } from "../errors.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "密码不能为空")
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest("请求参数不合法", parsed.error.flatten());
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthorized("邮箱或密码错误");
    }
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  })
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next(unauthorized());
    try {
      const { default: jwt } = await import("jsonwebtoken");
      const { env } = await import("../env.js");
      const payload = jwt.verify(header.slice(7).trim(), env.jwtSecret) as {
        sub: string;
        email: string;
        name: string;
      };
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true }
      });
      if (!user) return next(unauthorized());
      res.json({ user });
    } catch {
      next(unauthorized());
    }
  })
);
