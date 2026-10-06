const { validation } = require('../lib/errors');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    next(validation('请求参数不合法', result.error.flatten()));
    return;
  }
  req[source] = result.data;
  next();
};

module.exports = validate;
