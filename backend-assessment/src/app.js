const express = require('express');
const helmet = require('helmet');

const config = require('./config');
const tasksRouter = require('./modules/tasks/routes/tasks.routes');
const activityRouter = require('./modules/activity/routes/activity.routes');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const writeRateLimiter = require('./middleware/writeRateLimiter');
const errorHandler = require('./middleware/errorHandler');
const HttpError = require('./utils/httpError');

const app = express();

if (config.TRUST_PROXY !== undefined) {
  app.set('trust proxy', config.TRUST_PROXY);
}

// Security headers (nosniff, frame-ancestors, etc.); also drops X-Powered-By.
app.use(helmet());
app.use(writeRateLimiter(config.WRITE_RATE_LIMIT_PER_MINUTE));
// Authenticate before parsing, so unauthenticated bodies are never processed.
app.use(apiKeyAuth(config.API_KEY));
app.use(express.json({ limit: config.JSON_BODY_LIMIT }));

app.use('/tasks', tasksRouter);
app.use('/activity', activityRouter);

app.use((req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

module.exports = app;
