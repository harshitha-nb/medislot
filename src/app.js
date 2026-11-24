const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

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

module.exports = app;