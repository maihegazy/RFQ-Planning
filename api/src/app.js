const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const auditMiddleware = require('./middleware/audit');

// Import routers
const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const rfqRouter = require('./modules/rfq/rfq.router');
const featuresRouter = require('./modules/features/features.router');
const profilesRouter = require('./modules/profiles/profiles.router');
const allocationsRouter = require('./modules/allocations/allocations.router');
const ratesRouter = require('./modules/rates/rates.router');
const scenariosRouter = require('./modules/scenarios/scenarios.router');
const decisionPackagesRouter = require('./modules/decision-packages/decision-packages.router');
const approvalsRouter = require('./modules/approvals/approvals.router');
const commentsRouter = require('./modules/comments/comments.router');
const attachmentsRouter = require('./modules/attachments/attachments.router');
const importsRouter = require('./modules/imports/imports.router');
const exportsRouter = require('./modules/exports/exports.router');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/rfqs', rfqRouter);
app.use('/api/features', featuresRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/decision-packages', decisionPackagesRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/exports', exportsRouter);

// Audit middleware (after routes)
app.use(auditMiddleware);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;