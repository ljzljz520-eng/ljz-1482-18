class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const notFound = (message = '资源不存在') => new ApiError(404, 'NOT_FOUND', message);
const forbidden = (message = '无权访问该项目') => new ApiError(403, 'FORBIDDEN', message);
const unauthorized = (message = '登录会话已过期，请重新登录') => new ApiError(401, 'UNAUTHORIZED', message);
const validation = (message = '请求参数不合法', details) => new ApiError(400, 'VALIDATION_ERROR', message, details);

const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

module.exports = { ApiError, notFound, forbidden, unauthorized, validation, asyncHandler };
