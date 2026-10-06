const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const sessionRoutes = require('./routes/sessions');
const assetRoutes = require('./routes/assets');
const exportRoutes = require('./routes/exports');
const { errorHandler, notFoundHandler } = require('./middleware/error');

const app = express();
const logger = pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
    err: (err) => ({ type: err.type, message: err.message, stack: err.stack })
  }
});

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(logger);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'creative-workbench-api' }));
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/projects/:projectSlug/sessions', sessionRoutes);
app.use('/projects/:projectSlug/assets', assetRoutes);
app.use('/projects/:projectSlug/exports', exportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => {
  logger.logger.info({ port }, 'creative workbench api listening');
});
