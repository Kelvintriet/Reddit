import axios from 'axios';
import { auth } from '../lib/firebase';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.reddit.koolname.asia';

// Storage key for password session
const PASSWORD_SESSION_KEY = 'changelog_password_session';

interface PasswordSession {
    userId: string;
    expiresAt: number;
}

/**
 * Get the current user's Firebase ID token
 */
const getAuthToken = async (): Promise<string | null> => {
    try {
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
    }
};

/**
 * Check if user is authorized to create changelogs (via backend)
 */
export const isAuthorizedChangelogUser = async (user: any): Promise<boolean> => {
    if (!user) {
        console.log('❌ No user provided');
        return false;
    }

    try {
        const token = await getAuthToken();

        console.log('🔑 Auth token:', { hasAuthToken: !!token });

        if (!token) {
            console.log('❌ No auth token available');
            return false;
        }

        console.log('📡 Calling backend API...');
        const response = await axios.get(`${API_URL}/api/changelog/check-auth`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Backend response:', response.data);
        return response.data.authorized === true;
    } catch (error: any) {
        console.error('❌ Error checking changelog authorization:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return false;
    }
};

/**
 * Verify password via backend
 */
export const verifyChangelogPassword = async (password: string): Promise<{ verified: boolean; expiresIn?: number; error?: string }> => {
    try {
        const token = await getAuthToken();

        if (!token) {
            return { verified: false, error: 'Not authenticated' };
        }

        const response = await axios.post(
            `${API_URL}/api/changelog/verify-password`,
            { password },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return {
            verified: response.data.verified,
            expiresIn: response.data.expiresIn
        };
    } catch (error: any) {
        console.error('Error verifying password:', error);
        return {
            verified: false,
            error: error.response?.data?.error || 'Server error'
        };
    }
};

/**
 * Save password session (3 days)
 */
export const savePasswordSession = (userId: string, expiresIn: number = 3 * 24 * 60 * 60 * 1000): void => {
    const session: PasswordSession = {
        userId,
        expiresAt: Date.now() + expiresIn
    };

    try {
        localStorage.setItem(PASSWORD_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
        console.error('Error saving password session:', error);
    }
};

/**
 * Check if user has valid password session
 */
export const hasValidPasswordSession = (userId: string): boolean => {
    try {
        const sessionData = localStorage.getItem(PASSWORD_SESSION_KEY);
        if (!sessionData) return false;

        const session: PasswordSession = JSON.parse(sessionData);

        // Check if session is for the same user and not expired
        if (session.userId === userId && session.expiresAt > Date.now()) {
            return true;
        }

        // Clear expired or invalid session
        clearPasswordSession();
        return false;
    } catch (error) {
        console.error('Error checking password session:', error);
        return false;
    }
};

/**
 * Clear password session
 */
export const clearPasswordSession = (): void => {
    try {
        localStorage.removeItem(PASSWORD_SESSION_KEY);
    } catch (error) {
        console.error('Error clearing password session:', error);
    }
};

/**
 * Update changelog password (admin only)
 */
export const updateChangelogPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const token = await getAuthToken();

        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        const response = await axios.post(
            `${API_URL}/api/changelog/update-password`,
            { newPassword },
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        return { success: response.data.success };
    } catch (error: any) {
        console.error('Error updating password:', error);
        return {
            success: false,
            error: error.response?.data?.error || 'Server error'
        };
    }
};
