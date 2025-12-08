import 'dotenv/config';
import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import http from 'http';
import { verifyAttachmentAccess } from './middleware/verifyAttachment.js';
import { verifyAuth } from './middleware/verifyAuth.js';
import { checkBlockedUser } from './middleware/checkBlockedUser.js';
import { verifyCaptchaToken, checkCaptchaOptional } from './middleware/verifyCaptcha.js';
import { proxyAttachment } from './routes/attachments.js';
import { cleanupOrphanedFiles } from './routes/cleanup.js';
import { getCaptchaChallenge, verifyCaptcha, getCaptchaStatus, getIPAddress, checkIPVerification } from './routes/captcha.js';
import { checkChangelogAuth, verifyChangelogPassword, updateChangelogPassword } from './routes/changelog.js';
import { initializeFileCleanupWebSocket } from './websocket/fileCleanup.js';

const app = new Koa();
const router = new Router();
const server = http.createServer(app.callback());

// Body parser for JSON requests
app.use(bodyParser());

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
  'https://reddit.koolname.asia'
].filter(Boolean);

// CORS configuration
app.use(cors({
  origin: (ctx) => {
    const origin = ctx.request.header.origin;
    // Allow any localhost/127.0.0.1 origin for development
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return origin;
    }
    // Check if origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
      return origin;
    }
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Captcha-Token']
}));

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      error: err.message || 'Internal server error'
    };
    ctx.app.emit('error', err, ctx);
  }
});

// Health check
router.get('/health', async (ctx) => {
  ctx.body = { status: 'ok' };
});

// ============================================
// CAPTCHA Routes (No auth required)
// ============================================

// Get client IP address
router.get('/api/ip', getIPAddress);

// Check if IP is verified
router.get('/api/captcha/check', checkIPVerification);

// Get CAPTCHA challenge (math problem)
router.get('/api/captcha/challenge', getCaptchaChallenge);

// Verify CAPTCHA answer and get token
router.post('/api/captcha/verify', verifyCaptcha);

// Check CAPTCHA verification status
router.get('/api/captcha/status', getCaptchaStatus);

// ============================================
// Protected Routes (Require CAPTCHA + Auth)
// ============================================

// Cleanup orphaned files (can be called by cron job)
router.post('/api/cleanup/orphaned-files', cleanupOrphanedFiles);

// ============================================
// Changelog Routes (Optional CAPTCHA check)
// ============================================

// Check if user is authorized to create changelogs
router.get('/api/changelog/check-auth', checkCaptchaOptional, verifyAuth, checkChangelogAuth);

// Verify changelog password
router.post('/api/changelog/verify-password', checkCaptchaOptional, verifyAuth, verifyChangelogPassword);

// Update changelog password (admin only)
router.post('/api/changelog/update-password', checkCaptchaOptional, verifyAuth, updateChangelogPassword);

// Secure attachment proxy route (requires CAPTCHA + Auth)
// Format: /api/attachments/:fileId?postId=xxx
router.get(
  '/api/attachments/:fileId',
  verifyCaptchaToken,
  verifyAuth,
  checkBlockedUser,
  verifyAttachmentAccess,
  proxyAttachment
);

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 5000;

// Initialize WebSocket server BEFORE listening
try {
  initializeFileCleanupWebSocket(server);
  console.log('✅ WebSocket server initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize WebSocket server:', error);
}

server.on('upgrade', (request, socket, head) => {
  console.log('🔌 WebSocket upgrade request:', request.url);
});

server.listen(PORT, () => {
  console.log(`🚀 Secure attachment server running on port ${PORT}`);
  console.log(`🔌 WebSocket server available at ws://localhost:${PORT}/ws/file-cleanup`);
  console.log(`📡 HTTP server listening on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
  }
});

export default app;

