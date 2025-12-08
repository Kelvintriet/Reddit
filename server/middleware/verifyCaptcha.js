import { getFirestore, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getClientIP } from '../routes/captcha.js';

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

/**
 * Middleware to verify CAPTCHA token
 * Blocks requests without valid CAPTCHA verification
 * 
 * Usage: Add this middleware to routes that require CAPTCHA verification
 * The client must include 'x-captcha-token' header with the verification token
 */
export const verifyCaptchaToken = async (ctx, next) => {
  try {
    // Skip CAPTCHA in local development
    const isLocalDev = process.env.NODE_ENV !== 'production' ||
      ctx.request.hostname === 'localhost' ||
      ctx.request.hostname === '127.0.0.1';

    if (isLocalDev) {
      console.log('🔓 CAPTCHA bypassed for local development');
      ctx.state.captcha = {
        verified: true,
        bypassed: true,
        reason: 'local_development'
      };
      await next();
      return;
    }

    const token = ctx.headers['x-captcha-token'];
    const clientIP = getClientIP(ctx);

    if (!token) {
      ctx.status = 403;
      ctx.body = {
        error: 'CAPTCHA verification required',
        code: 'CAPTCHA_REQUIRED',
        message: 'Please complete the "I\'m not a robot" verification to continue'
      };
      return;
    }

    // Check token in Firestore
    const tokenRef = doc(db, 'captchaVerifications', token);
    const tokenSnap = await getDoc(tokenRef);

    if (!tokenSnap.exists()) {
      ctx.status = 403;
      ctx.body = {
        error: 'Invalid CAPTCHA token',
        code: 'CAPTCHA_INVALID',
        message: 'Your verification has expired or is invalid. Please verify again.'
      };
      return;
    }

    const tokenData = tokenSnap.data();

    // Check if token is expired
    if (tokenData.expiresAt.toDate() < new Date()) {
      // Clean up expired token
      await deleteDoc(tokenRef);
      ctx.status = 403;
      ctx.body = {
        error: 'CAPTCHA token expired',
        code: 'CAPTCHA_EXPIRED',
        message: 'Your verification has expired. Please verify again.'
      };
      return;
    }

    // Optional: Verify IP matches (can be disabled for users with dynamic IPs)
    const strictIPCheck = process.env.CAPTCHA_STRICT_IP_CHECK === 'true';
    if (strictIPCheck && tokenData.ip !== clientIP) {
      ctx.status = 403;
      ctx.body = {
        error: 'IP address mismatch',
        code: 'CAPTCHA_IP_MISMATCH',
        message: 'Your IP address has changed. Please verify again.'
      };
      return;
    }

    // Add verification info to context state
    ctx.state.captcha = {
      verified: true,
      token,
      ip: clientIP,
      verifiedAt: tokenData.verifiedAt.toDate(),
      expiresAt: tokenData.expiresAt.toDate()
    };

    await next();
  } catch (error) {
    console.error('CAPTCHA middleware error:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to verify CAPTCHA token' };
  }
};

/**
 * Optional middleware - only warns if CAPTCHA is not verified but allows request
 * Useful for routes that should work but with reduced functionality
 */
export const checkCaptchaOptional = async (ctx, next) => {
  try {
    const token = ctx.headers['x-captcha-token'];
    const clientIP = getClientIP(ctx);

    ctx.state.captcha = {
      verified: false,
      ip: clientIP
    };

    if (token) {
      const tokenRef = doc(db, 'captchaVerifications', token);
      const tokenSnap = await getDoc(tokenRef);

      if (tokenSnap.exists()) {
        const tokenData = tokenSnap.data();

        if (tokenData.expiresAt.toDate() >= new Date()) {
          ctx.state.captcha = {
            verified: true,
            token,
            ip: clientIP,
            verifiedAt: tokenData.verifiedAt.toDate(),
            expiresAt: tokenData.expiresAt.toDate()
          };
        }
      }
    }

    await next();
  } catch (error) {
    console.error('CAPTCHA optional check error:', error);
    // Don't block on error, just mark as unverified
    ctx.state.captcha = { verified: false };
    await next();
  }
};
