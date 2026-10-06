const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const validate = require('../middleware/validate');
const { asyncHandler, unauthorized } = require('../lib/errors');
const { requireAuth } = require('../middleware/auth');
const { userPublic } = require('../lib/serializers');

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  const passwordValid = user ? await bcrypt.compare(req.body.password, user.passwordHash) : false;
  if (!user || !passwordValid) throw unauthorized('邮箱或密码错误');

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

  res.json({ token, user: userPublic(user), expiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 7200) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;
