const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);                     // needed behind Render's proxy
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./openapi')));

// Rate limiting is only switched on in production (RATE_LIMIT=on),
// so your local load tests and concurrency test are not blocked.
if (process.env.RATE_LIMIT === 'on') {
  const common = { windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false };
  app.use('/api', rateLimit({ ...common, limit: 300 }));
  app.use('/api/auth', rateLimit({ ...common, limit: 30 }));
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/admin', require('./routes/admin'));

// Serve the built website (only when frontend/dist exists, e.g. in Docker or after a build)
const webDir = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(webDir, 'index.html'))) {
  app.use('/assets', express.static(path.join(webDir, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(webDir, { index: false }));
  // Unknown API paths get a JSON 404, not the website
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  // Any other page address (for example /doctors/5) loads the website, which handles it itself
  app.get(/^\/(?!docs|health).*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(webDir, 'index.html'));
  });
}

module.exports = app;