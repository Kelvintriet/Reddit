import { create } from 'zustand';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace('localhost', '127.0.0.1');

interface CaptchaState {
  isVerified: boolean;
  isChecking: boolean;
  showModal: boolean;
  error: string | null;
  clientIP: string | null;

  checkIP: () => Promise<boolean>;
  verify: (clickTimes: number[]) => Promise<boolean>;
  openModal: () => void;
  closeModal: () => void;
  clearError: () => void;
}

export const useCaptchaStore = create<CaptchaState>()((set) => ({
  isVerified: false,
  isChecking: true,
  showModal: false,
  error: null,
  clientIP: null,

  // Check if this IP is already verified
  checkIP: async () => {
    set({ isChecking: true });

    try {
      const response = await fetch(`${BACKEND_URL}/api/captcha/check`);
      const data = await response.json();

      set({
        isVerified: data.verified === true,
        clientIP: data.ip,
        isChecking: false
      });

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
      const response = await fetch(`${BACKEND_URL}/api/captcha/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clickTimes })
      });

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Verification failed' });
        return false;
      }

      set({
        isVerified: true,
        clientIP: data.ip,
        showModal: false,
        error: null
      });

      return true;
    } catch (error: any) {
      set({ error: 'Network error. Try again.' });
      return false;
    }
  },

  openModal: () => set({ showModal: true, error: null }),
  closeModal: () => set({ showModal: false, error: null }),
  clearError: () => set({ error: null })
}));
