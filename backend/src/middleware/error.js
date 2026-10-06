const { Prisma } = require('@prisma/client');
const { ApiError } = require('../lib/errors');
const logger = require('../lib/logger');

function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ code: 'NOT_FOUND', message: '资源不存在' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ code: 'CONFLICT', message: '资源标识冲突' });
    }
  }

  logger.error({ err: error }, 'unhandled api error');
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: '服务暂时不可用' });
}


function notFoundHandler(_req, res) {
  res.status(404).json({ code: 'NOT_FOUND', message: '接口不存在' });
}

module.exports = { errorHandler, notFoundHandler };
