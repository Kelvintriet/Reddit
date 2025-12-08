import { create } from 'zustand';
import { auth } from '../lib/firebase';
import { signInWithEmail, registerWithEmail, signInWithGoogle, logout } from '../lib/firebase';
import { createUserProfile as createUserProfileCollection, getUserProfile as getUserProfileCollection } from '../collections/users';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatarUrl?: string;
  username?: string;
  karma?: number;
  atName?: string;
  customUID?: string;
  region?: string;
  regionCode?: string;
  onboardingCompleted?: boolean;
  showLocation?: boolean;
  currentLocation?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
  };
  language?: 'vi' | 'en';
}

interface AuthState {
  user: User | null;
  userProfile: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  showOnboarding: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  fetchUserProfile: (uid: string) => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;
  initializeAuth: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  isLoading: false,
  isInitialized: false,
  showOnboarding: false,
  error: null,

  clearError: () => set({ error: null }),
  
  setUser: (user: User | null) => set({ user }),

  setShowOnboarding: (show: boolean) => set({ showOnboarding: show }),

  completeOnboarding: () => {
    const { user } = get();
    if (user) {
      set({ 
        user: { ...user, onboardingCompleted: true },
        showOnboarding: false 
      });
    }
  },

  fetchUserProfile: async (uid: string) => {
    try {
      const profile = await getUserProfileCollection(uid);
      set({ userProfile: profile });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithEmail(email, password);
      const user = userCredential.user;
      
      // Fetch user profile from Firestore
      const profile = await getUserProfileCollection(user.uid);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profile?.displayName || null,
        photoURL: user.photoURL,
        avatarUrl: profile?.avatarUrl,
        username: profile?.username,
        karma: profile?.karma,
        atName: profile?.atName,
        customUID: profile?.customUID,
        region: profile?.region,
        regionCode: profile?.regionCode,
        onboardingCompleted: profile?.onboardingCompleted || false,
        language: profile?.language || 'vi'
      };

      set({ 
        user: userData,
        userProfile: profile,
        isLoading: false,
        showOnboarding: !userData.onboardingCompleted
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let errorMessage = 'Đăng nhập thất bại';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản với email này';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mật khẩu không chính xác';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tài khoản đã bị vô hiệu hóa';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet';
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw error;
    }
  },

  signUp: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await registerWithEmail(email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      const profile = await createUserProfileCollection(user, { username });
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profile?.displayName || null,
        photoURL: user.photoURL,
        avatarUrl: profile?.avatarUrl,
        username: profile?.username,
        karma: profile?.karma,
        atName: profile?.atName,
        customUID: profile?.customUID,
        region: profile?.region,
        regionCode: profile?.regionCode,
        onboardingCompleted: profile?.onboardingCompleted || false,
        language: profile?.language || 'vi'
      };

      set({ 
        user: userData,
        userProfile: profile,
        isLoading: false,
        showOnboarding: true // Always show onboarding for new users
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      let errorMessage = 'Đăng ký thất bại';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được sử dụng';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet';
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      
      // Create or get user profile
      const profile = await createUserProfileCollection(user);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profile?.displayName || null,
        photoURL: user.photoURL,
        avatarUrl: profile?.avatarUrl,
        username: profile?.username,
        karma: profile?.karma,
        atName: profile?.atName,
        customUID: profile?.customUID,
        region: profile?.region,
        regionCode: profile?.regionCode,
        onboardingCompleted: profile?.onboardingCompleted || false,
        language: profile?.language || 'vi'
      };

      set({ 
        user: userData,
        userProfile: profile,
        isLoading: false,
        showOnboarding: !userData.onboardingCompleted
      });
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      let errorMessage = 'Đăng nhập Google thất bại';
      if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Đăng nhập bị hủy';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup bị chặn. Vui lòng cho phép popup';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet';
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await logout();
      set({ 
        user: null, 
        userProfile: null,
        isLoading: false,
        showOnboarding: false
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ 
        error: error.message || 'Đăng xuất thất bại', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    return get().signOut();
  },

  initializeAuth: () => {
    set({ isInitialized: false });
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Fetch user profile when auth state changes
        try {
          const profile = await getUserProfileCollection(firebaseUser.uid);
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || profile?.displayName || null,
            photoURL: firebaseUser.photoURL,
            avatarUrl: profile?.avatarUrl,
            username: profile?.username,
            karma: profile?.karma,
            atName: profile?.atName,
            customUID: profile?.customUID,
            region: profile?.region,
            regionCode: profile?.regionCode,
            onboardingCompleted: profile?.onboardingCompleted || false,
            language: profile?.language || 'vi'
          };
          
          set({ user: userData });
          
          set({ 
            userProfile: profile, 
            isInitialized: true,
            showOnboarding: !userData.onboardingCompleted
          });
        } catch (error) {
          console.error('Error fetching user profile on auth state change:', error);
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL,
            onboardingCompleted: false
          };
          
          set({ user: userData });
          
          set({ 
            isInitialized: true,
            showOnboarding: true // Show onboarding if no profile found
          });
        }
      } else {
        set({ user: null });
        set({ 
          userProfile: null, 
          isInitialized: true,
          showOnboarding: false
        });
      }
    });
  }
})); 