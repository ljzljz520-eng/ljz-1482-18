const pino = require('pino');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    err: (err) => ({ type: err.type, message: err.message, stack: err.stack })
  }
});
