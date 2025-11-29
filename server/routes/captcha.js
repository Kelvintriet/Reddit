import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import crypto from 'crypto';

// Initialize Firebase (reuse existing app if available)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAq91-kUVQlXW3MhwpfRPmGP7e0nWAqGT0',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'xredread.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'xredread',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'xredread.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '822628499479',
  appId: process.env.FIREBASE_APP_ID || '1:822628499479:web:873b4caca6b644e6289c52'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// CAPTCHA token expiration time (24 hours in milliseconds)
const CAPTCHA_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

// Minimum hold time (in milliseconds) - will be randomized
const MIN_HOLD_TIME = 1000; // 1 second minimum
const MAX_HOLD_TIME = 4000; // 4 seconds maximum

// Allowed variance on release (tolerance for early/late release)
const RELEASE_TOLERANCE = 100; // 100ms tolerance

/**
 * Generate random hold time between 1-4 seconds
 */
const generateRandomHoldTime = () => {
  return Math.floor(Math.random() * (MAX_HOLD_TIME - MIN_HOLD_TIME + 1)) + MIN_HOLD_TIME;
};

/**
 * Generate random speed profile for the progress bar
 * Returns segments with different speeds (fast, slow, variable)
 */
const generateSpeedProfile = (totalTime) => {
  const profiles = [];
  let currentTime = 0;

  // Randomly decide number of segments (1-3)
  const numSegments = Math.floor(Math.random() * 3) + 1;
  const segmentDuration = totalTime / numSegments;

  for (let i = 0; i < numSegments; i++) {
    const speedOptions = ['slow', 'fast', 'variable'];
    const speed = speedOptions[Math.floor(Math.random() * speedOptions.length)];

    let speedMultiplier = 1;
    if (speed === 'slow') {
      speedMultiplier = 0.3 + Math.random() * 0.3; // 30-60% speed
    } else if (speed === 'fast') {
      speedMultiplier = 1.7 + Math.random() * 0.3; // 170-200% speed
    } else {
      speedMultiplier = 0.8 + Math.random() * 0.4; // 80-120% speed
    }

    profiles.push({
      startTime: currentTime,
      endTime: currentTime + segmentDuration,
      speed,
      speedMultiplier
    });

    currentTime += segmentDuration;
  }

  return profiles;
};

/**
 * Get client IP address from request (Koa style)
 */
export const getClientIP = (ctx) => {
  // Use x-forwarded-for header or socket remote address (like Express style)
  const ip = ctx.headers['x-forwarded-for'] || ctx.socket?.remoteAddress;

  // Clean up IPv6 localhost format
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }

  // Handle comma-separated list (first IP is the client)
  if (ip && ip.includes(',')) {
    return ip.split(',')[0].trim();
  }

  return ip || 'unknown';
};

/**
 * GET /api/ip - Return client IP address
 */
export const getIPAddress = async (ctx) => {
  const ip = ctx.headers['x-forwarded-for'] || ctx.socket?.remoteAddress;

  // Clean up IPv6 localhost format
  let cleanIP = ip;
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    cleanIP = '127.0.0.1';
  } else if (ip && ip.includes(',')) {
    cleanIP = ip.split(',')[0].trim();
  }

  ctx.body = {
    ip: cleanIP || 'unknown',
    message: `Your IP is ${cleanIP || 'unknown'}`
  };
};

/**
 * Generate a verification token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * POST /api/captcha/verify
 * Verify slider hold time and release timing
 */
export const verifyCaptcha = async (ctx) => {
  try {
    const clientIP = getClientIP(ctx);
    const { holdTime, requiredHoldTime, releaseError } = ctx.request.body || {};

    // Validate required hold time was provided
    if (!requiredHoldTime || requiredHoldTime < MIN_HOLD_TIME || requiredHoldTime > MAX_HOLD_TIME) {
      ctx.status = 400;
      ctx.body = {
        error: 'Invalid challenge configuration',
        code: 'INVALID_CHALLENGE'
      };
      return;
    }

    // Check if user held long enough and released at right time
    if (!holdTime) {
      ctx.status = 400;
      ctx.body = {
        error: 'Failed to verify hold time',
        code: 'NO_HOLD_TIME'
      };
      return;
    }

    // Calculate how close the release was to the required time
    const timingError = Math.abs(holdTime - requiredHoldTime);

    // Allow 100ms tolerance
    if (timingError > RELEASE_TOLERANCE) {
      ctx.status = 400;
      ctx.body = {
        error: `Release timing off by ${timingError}ms. Try again.`,
        code: 'TIMING_ERROR',
        required: requiredHoldTime,
        actual: holdTime,
        tolerance: RELEASE_TOLERANCE,
        error_ms: timingError
      };
      return;
    }

    // Verification successful!
    const verificationToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + CAPTCHA_TOKEN_EXPIRY);

    // Store verification token in Firestore
    const tokenRef = doc(db, 'captchaVerifications', verificationToken);
    await setDoc(tokenRef, {
      ip: clientIP,
      verifiedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      holdTime: holdTime,
      requiredHoldTime: requiredHoldTime,
      timingError: timingError,
      userAgent: ctx.headers['user-agent'] || 'unknown'
    });

    console.log(`✅ CAPTCHA verified for IP: ${clientIP}, Hold: ${holdTime}ms (required: ${requiredHoldTime}ms, error: ${timingError}ms)`);

    ctx.body = {
      success: true,
      token: verificationToken,
      expiresAt: expiresAt.toISOString(),
      message: 'Verification successful',
      stats: {
        holdTime,
        requiredHoldTime,
        timingError
      }
    };
  } catch (error) {
    console.error('Error verifying CAPTCHA:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to verify CAPTCHA' };
  }
};

/**
 * GET /api/captcha/status
 * Check if current session has valid CAPTCHA verification
 * Validates both token AND IP match
 */
export const getCaptchaStatus = async (ctx) => {
  try {
    const clientIP = getClientIP(ctx);
    const token = ctx.headers['x-captcha-token'];

    if (!token) {
      ctx.body = {
        verified: false,
        ipMatch: false,
        ip: clientIP,
        message: 'No verification token provided'
      };
      return;
    }

    // Check token in Firestore
    const tokenRef = doc(db, 'captchaVerifications', token);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists()) {
      ctx.body = {
        verified: false,
        ipMatch: false,
        ip: clientIP,
        message: 'Invalid verification token'
      };
      return;
    }

    const tokenData = tokenSnap.data();

    // Check if token is expired
    if (tokenData.expiresAt.toDate() < new Date()) {
      await deleteDoc(tokenRef);
      ctx.body = {
        verified: false,
        ipMatch: false,
        ip: clientIP,
        message: 'Verification token expired'
      };
      return;
    }

    // Check if IP matches the original verification IP
    const ipMatch = tokenData.ip === clientIP;

    if (!ipMatch) {
      ctx.body = {
        verified: false,
        ipMatch: false,
        ip: clientIP,
        originalIP: tokenData.ip,
        message: 'IP address mismatch - re-verification required'
      };
      return;
    }

    ctx.body = {
      verified: true,
      ipMatch: true,
      ip: clientIP,
      verifiedAt: tokenData.verifiedAt.toDate().toISOString(),
      expiresAt: tokenData.expiresAt.toDate().toISOString(),
      message: 'Verification valid'
    };
  } catch (error) {
    console.error('Error checking CAPTCHA status:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to check verification status' };
  }
};

/**
 * GET /api/captcha/challenge
 * Get a new challenge with random hold time and speed profile
 */
export const getCaptchaChallenge = async (ctx) => {
  try {
    const requiredHoldTime = generateRandomHoldTime();
    const speedProfile = generateSpeedProfile(requiredHoldTime);

    ctx.body = {
      type: 'slider',
      requiredHoldTime,
      speedProfile,
      message: `Hold for ${requiredHoldTime}ms then release`,
      maxTime: MAX_HOLD_TIME
    };
  } catch (error) {
    console.error('Error generating challenge:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to generate challenge' };
  }
};
