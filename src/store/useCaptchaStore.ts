import { create } from 'zustand';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.reddit.koolname.asia';

// Device UID management - generates a new UID each session, stored in localStorage
const DEVICE_UID_KEY = 'captcha_device_uid';

/**
 * Generate a random device UID
 */
const generateDeviceUID = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let uid = '';
  for (let i = 0; i < 32; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
};

/**
 * Get or create device UID from localStorage
 * UID persists in localStorage for flagging purposes
 */
const getDeviceUID = (): string => {
  let uid = localStorage.getItem(DEVICE_UID_KEY);

  if (!uid) {
    uid = generateDeviceUID();
    localStorage.setItem(DEVICE_UID_KEY, uid);
  }

  return uid;
};

interface CaptchaState {
  isVerified: boolean;
  isChecking: boolean;
  showModal: boolean;
  error: string | null;
  clientIP: string | null;
  deviceUID: string | null;
  isFlagged: boolean;

  checkIP: () => Promise<boolean>;
  verify: (clickTimes: number[]) => Promise<boolean>;
  openModal: () => void;
  closeModal: () => void;
  clearError: () => void;
  regenerateUID: () => void;
}

export const useCaptchaStore = create<CaptchaState>()((set, get) => ({
  isVerified: false,
  isChecking: true,
  showModal: false,
  error: null,
  clientIP: null,
  deviceUID: null,
  isFlagged: false,

  // Check if this IP + UID is already verified
  checkIP: async () => {
    set({ isChecking: true });

    try {
      const uid = getDeviceUID();
      set({ deviceUID: uid });

      const response = await fetch(`${BACKEND_URL}/api/captcha/check?uid=${uid}`);
      const data = await response.json();

      set({
        isVerified: data.verified === true,
        clientIP: data.ip,
        deviceUID: uid,
        isFlagged: data.flagged === true,
        isChecking: false
      });

      // If flagged (new device on same IP), show info
      if (data.flagged) {
        console.log('🚩 New device detected on this IP - verification required');
      }

      return data.verified === true;
    } catch (error) {
      console.error('Failed to check IP:', error);
      set({ isChecking: false, isVerified: false });
      return false;
    }
  },

  // Verify with click timing data
  verify: async (clickTimes: number[]) => {
    set({ error: null });

    try {
      const uid = get().deviceUID || getDeviceUID();

      const response = await fetch(`${BACKEND_URL}/api/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickTimes, uid })
      });

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Verification failed' });
        return false;
      }

      set({
        isVerified: true,
        clientIP: data.ip,
        deviceUID: uid,
        showModal: false,
        error: null,
        isFlagged: false
      });

      return true;
    } catch (error: any) {
      set({ error: 'Network error. Try again.' });
      return false;
    }
  },

  openModal: () => set({ showModal: true, error: null }),
  closeModal: () => set({ showModal: false, error: null }),
  clearError: () => set({ error: null }),

  // Regenerate device UID (for testing or manual reset)
  regenerateUID: () => {
    const newUID = generateDeviceUID();
    localStorage.setItem(DEVICE_UID_KEY, newUID);
    sessionStorage.setItem(DEVICE_UID_KEY, newUID);
    set({ deviceUID: newUID, isVerified: false });
  }
}));
