require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./models');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const prayerRoutes = require('./routes/prayerRoutes');
const dhikrRoutes = require('./routes/dhikrRoutes');
const duaRoutes = require('./routes/duaRoutes');
const fastingRoutes = require('./routes/fastingRoutes');
const quranRoutes = require('./routes/quranRoutes');
const periodRoutes = require('./routes/periodRoutes');
const streakRoutes = require('./routes/streakRoutes');
const goalsRoutes = require('./routes/goalsRoutes');
const groupRoutes = require('./routes/groupRoutes');
const groupActivityRoutes = require('./routes/groupActivityRoutes');
const contentRoutes = require('./routes/contentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & Parsing ──────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'unpkg.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Request logging ─────────────────────────────────────────────────

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Swagger docs ─────────────────────────────────────────────────────

let swaggerDoc;
try {
  const { mergeSwaggerFiles } = require('./utils/swaggerUtils');
  swaggerDoc = mergeSwaggerFiles();
} catch (e) {
  swaggerDoc = { openapi: '3.0.0', info: { title: 'Hisabi API', version: '2.0.0' }, paths: {} };
}

const swaggerUi = require('swagger-ui-express');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, { explorer: true }));

// ── API Routes ───────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/prayers', prayerRoutes);
app.use('/api/dhikr', dhikrRoutes);
app.use('/api/duas', duaRoutes);
app.use('/api/fasting', fastingRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/group-activities', groupActivityRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);

// ── Public Live Links (no auth required) ──────────────────────────────────────
const publicLiveLinksRouter = require('./routes/publicLiveLinksRoutes');
app.use('/api/live-links', publicLiveLinksRouter);

// ── Health check ─────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (_req, res) => res.json({ message: 'Hisabi API v2', docs: '/api-docs' }));

// ── 404 ──────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ────────────────────────────────────────────────────

app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────

const server = app.listen(PORT, async () => {
  console.log(`🚀 Hisabi API running on port ${PORT}`);
  console.log(`📖 Docs: http://localhost:${PORT}/api-docs`);
  await connectDB();
});

module.exports = { app, server };
