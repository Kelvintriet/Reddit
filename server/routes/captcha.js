import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';

// Initialize Firebase (reuse existing app if available)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// IP verification expiry (24 hours)
const IP_VERIFY_EXPIRY = 24 * 60 * 60 * 1000;

/**
 * Get client IP address from request (Koa style)
 */
export const getClientIP = (ctx) => {
  const ip = ctx.headers['x-forwarded-for'] || ctx.socket?.remoteAddress;

  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  if (ip && ip.includes(',')) {
    return ip.split(',')[0].trim();
  }

  return ip || 'unknown';
};

/**
 * GET /api/ip - Return client IP address
 */
export const getIPAddress = async (ctx) => {
  const ip = getClientIP(ctx);
  ctx.body = { ip };
};

/**
 * Bot detection algorithm based on click timing
 * Returns: { isBot: boolean, reason?: string }
 */
const detectBot = (clickTimes) => {
  if (!clickTimes || clickTimes.length < 3) {
    return { isBot: true, reason: 'Not enough clicks' };
  }

  // Filter out the first click (time since page load, not relevant)
  const intervals = clickTimes.slice(1);

  // Check 1: Any click too fast (<100ms) = bot
  const tooFast = intervals.some(t => t < 100);
  if (tooFast) {
    return { isBot: true, reason: 'Clicks too fast' };
  }

  // Check 2: All clicks suspiciously consistent (variance < 30ms) = bot
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev < 30 && intervals.length >= 4) {
    return { isBot: true, reason: 'Timing too consistent' };
  }

  // Check 3: All clicks exactly the same = bot
  const allSame = intervals.every(t => t === intervals[0]);
  if (allSame) {
    return { isBot: true, reason: 'Identical timing' };
  }

  // Check 4: Average speed too fast (<150ms average) = bot
  if (avg < 150) {
    return { isBot: true, reason: 'Average speed too fast' };
  }

  return { isBot: false };
};

/**
 * GET /api/captcha/check
 * Check if IP + UID combination is verified
 * If same IP with different UID, flag and require re-verification
 */
export const checkIPVerification = async (ctx) => {
  try {
    const ip = getClientIP(ctx);
    const uid = ctx.query.uid || ctx.headers['x-device-uid'] || null;

    if (!uid) {
      // No UID provided - require verification
      ctx.body = { verified: false, ip, reason: 'no_uid' };
      return;
    }

    // Check if this specific IP+UID is verified
    const ipUidRef = doc(db, 'verifiedIPs', `${ip.replace(/\./g, '_')}_${uid}`);
    const ipUidSnap = await getDoc(ipUidRef);

    if (ipUidSnap.exists()) {
      const data = ipUidSnap.data();

      // Check if not expired
      if (data.expiresAt.toDate() > new Date()) {
        ctx.body = { verified: true, ip, uid };
        return;
      } else {
        // Expired - delete it
        await deleteDoc(ipUidRef);
      }
    }

    // Check if this IP has been used with other UIDs (flagging check)
    const verifiedIPsRef = collection(db, 'verifiedIPs');
    const q = query(verifiedIPsRef, where('ip', '==', ip));
    const existingDocs = await getDocs(q);

    let flagged = false;
    let existingUIDs = [];

    existingDocs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.uid && data.uid !== uid && data.expiresAt.toDate() > new Date()) {
        existingUIDs.push(data.uid);
        flagged = true;
      }
    });

    if (flagged) {
      console.log(`🚩 Flagged: IP ${ip} used with new UID ${uid}. Known UIDs: ${existingUIDs.join(', ')}`);
    }

    ctx.body = {
      verified: false,
      ip,
      uid,
      flagged,
      reason: flagged ? 'new_device' : 'not_verified'
    };
  } catch (error) {
    console.error('Error checking IP:', error);
    ctx.body = { verified: false, ip: getClientIP(ctx), error: error.message };
  }
};

/**
 * POST /api/captcha/verify
 * Verify click timing and save IP+UID as verified
 */
export const verifyCaptcha = async (ctx) => {
  try {
    const ip = getClientIP(ctx);
    const { clickTimes, uid } = ctx.request.body || {};

    if (!uid) {
      ctx.status = 400;
      ctx.body = { error: 'Device UID required', code: 'NO_UID' };
      return;
    }

    // Run bot detection
    const detection = detectBot(clickTimes);

    if (detection.isBot) {
      console.log(`🤖 Bot detected from IP: ${ip}, UID: ${uid} - ${detection.reason}`);
      ctx.status = 400;
      ctx.body = {
        error: detection.reason || 'Bot detected',
        code: 'BOT_DETECTED'
      };
      return;
    }

    // Human verified - save IP+UID to Firestore
    const expiresAt = new Date(Date.now() + IP_VERIFY_EXPIRY);
    const ipUidRef = doc(db, 'verifiedIPs', `${ip.replace(/\./g, '_')}_${uid}`);

    await setDoc(ipUidRef, {
      ip,
      uid,
      verifiedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      clickTimes,
      userAgent: ctx.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ Human verified: IP ${ip}, UID ${uid}`);

    ctx.body = {
      success: true,
      ip,
      uid,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('Error verifying:', error);
    ctx.status = 500;
    ctx.body = { error: 'Verification failed' };
  }
};

/**
 * GET /api/captcha/status - Alias for check
 */
export const getCaptchaStatus = async (ctx) => {
  return checkIPVerification(ctx);
};

/**
 * GET /api/captcha/challenge - Not needed for dot-click, but keep for compatibility
 */
export const getCaptchaChallenge = async (ctx) => {
  ctx.body = { type: 'dot-click', dots: 5 };
};
