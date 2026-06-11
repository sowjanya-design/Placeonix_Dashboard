const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const path = require('path');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

app.set('trust proxy', 1);

// ─── Security ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, cb) => {
      const whitelist = (process.env.CLIENT_URL || '*').split(',');
      if (!origin || whitelist.includes('*') || whitelist.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static — uploaded files
const uploadDir = process.env.FILE_UPLOAD_PATH || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// ─── Friendly Landing Page at / ───
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Placeonix API</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1b3e;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;line-height:1.6}
  .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:3rem;max-width:720px;width:100%;backdrop-filter:blur(12px)}
  .badge{display:inline-block;background:rgba(34,197,94,.15);color:#4ade80;font-size:.72rem;font-weight:700;padding:.3rem .9rem;border-radius:100px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:1.2rem}
  h1{font-size:2.4rem;font-weight:800;margin-bottom:.5rem;letter-spacing:-1px}
  h1 span{color:#98c1d9}
  .sub{color:rgba(255,255,255,.55);font-size:1rem;margin-bottom:2.2rem}
  .endpoints{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1.8rem}
  .endpoint{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:.95rem 1.1rem;text-decoration:none;color:#fff;transition:all .15s;display:block}
  .endpoint:hover{background:rgba(152,193,217,.1);border-color:rgba(152,193,217,.3);transform:translateY(-2px)}
  .ep-method{font-size:.65rem;font-weight:700;letter-spacing:1px;color:#4ade80;margin-bottom:.2rem}
  .ep-path{font-family:ui-monospace,Menlo,monospace;font-size:.85rem;color:#98c1d9}
  .ep-desc{font-size:.75rem;color:rgba(255,255,255,.5);margin-top:.3rem}
  .info{background:rgba(255,255,255,.03);border-radius:10px;padding:1rem 1.2rem;font-size:.85rem;color:rgba(255,255,255,.6);margin-top:1.5rem}
  .info code{background:rgba(0,0,0,.3);padding:.15rem .4rem;border-radius:4px;font-size:.8rem;color:#fbbf24}
  .creds{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-top:1rem}
  .cred{background:rgba(255,255,255,.04);padding:.7rem;border-radius:8px;font-size:.78rem;text-align:center}
  .cred strong{color:#98c1d9;display:block;margin-bottom:.2rem}
  .cred code{font-size:.7rem;color:rgba(255,255,255,.5)}
  .footer{text-align:center;font-size:.78rem;color:rgba(255,255,255,.3);margin-top:2rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.05)}
  @media(max-width:600px){.endpoints{grid-template-columns:1fr}.creds{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="card">
  <span class="badge">● API Online</span>
  <h1>Placeonix <span>API</span></h1>
  <p class="sub">REST API for the Placeonix IT Training & Placement platform.</p>

  <div class="endpoints">
    <a href="/health" class="endpoint">
      <div class="ep-method">GET</div>
      <div class="ep-path">/health</div>
      <div class="ep-desc">Server health & uptime</div>
    </a>
    <a href="/api/v1" class="endpoint">
      <div class="ep-method">GET</div>
      <div class="ep-path">/api/v1</div>
      <div class="ep-desc">List all API endpoints</div>
    </a>
    <a href="/api/v1/courses" class="endpoint">
      <div class="ep-method">GET</div>
      <div class="ep-path">/api/v1/courses</div>
      <div class="ep-desc">Public course catalog</div>
    </a>
    <a href="/api/v1/auth/login" class="endpoint" onclick="event.preventDefault();alert('POST request only. Use Postman or curl.');">
      <div class="ep-method">POST</div>
      <div class="ep-path">/api/v1/auth/login</div>
      <div class="ep-desc">Authenticate user</div>
    </a>
  </div>

  <div class="info">
    <strong style="color:#fff">Quick Login</strong>
    <p style="margin-top:.4rem">Use <code>POST /api/v1/auth/login</code> with one of these demo accounts (password: <code>Password123</code>):</p>
    <div class="creds">
      <div class="cred"><strong>Admin</strong><code>admin@placeonix.in</code></div>
      <div class="cred"><strong>Mentor</strong><code>mentor@placeonix.in</code></div>
      <div class="cred"><strong>Student</strong><code>student@placeonix.in</code></div>
    </div>
  </div>

  <div class="info">
    <strong style="color:#fff">Try it with curl:</strong>
    <pre style="margin-top:.6rem;padding:.8rem;background:rgba(0,0,0,.3);border-radius:6px;font-size:.78rem;overflow-x:auto;color:#98c1d9">curl -X POST http://localhost:5000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@placeonix.in","password":"Password123"}'</pre>
  </div>

  <div class="footer">
    Placeonix Backend v1.0 &nbsp;·&nbsp; Environment: ${process.env.NODE_ENV || 'development'}
  </div>
</div>
</body>
</html>
  `);
});

// Health
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  });
});

// API
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}`, routes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
