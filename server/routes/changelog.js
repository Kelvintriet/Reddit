import axios from 'axios';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Authorized users who can create changelogs
const AUTHORIZED_USERS = [
    {
        customUID: '549-110-NAM',
        username: 'taikhoangphu2 minhtriet',
        atName: 'kelvinhuynh'
    },
    {
        customUID: '318-131-SAS',
        username: 'Kelvin Huynh',
        atName: 'minhtri_cofounder'
    }
];

// Default password
const DEFAULT_PASSWORD = 'Mt20112011@';

/**
 * Get user data from Firestore using REST API
 */
const getUserData = async (uid) => {
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
        const response = await axios.get(url);

        if (response.data && response.data.fields) {
            // Convert Firestore fields format to regular object
            const fields = response.data.fields;
            return {
                customUID: fields.customUID?.stringValue,
                username: fields.username?.stringValue,
                atName: fields.atName?.stringValue
            };
        }
        return null;
    } catch (error) {
        if (error.response?.status === 404) {
            console.log('User document not found:', uid);
            return null;
        }
        console.error('Error fetching user data:', error.message);
        return null;
    }
};

/**
 * Get changelog password from Firestore
 */
const getChangelogPassword = async () => {
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/changelog_config`;
        const response = await axios.get(url);

        if (response.data && response.data.fields) {
            return response.data.fields.password?.stringValue || DEFAULT_PASSWORD;
        }
        return DEFAULT_PASSWORD;
    } catch (error) {
        if (error.response?.status === 404) {
            // Password config doesn't exist, use default
            console.log('Password config not found, using default');
            return DEFAULT_PASSWORD;
        }
        console.error('Error fetching password:', error.message);
        return DEFAULT_PASSWORD;
    }
};

/**
 * Create password config in Firestore if it doesn't exist
 */
const createPasswordConfig = async () => {
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/changelog_config`;

        await axios.patch(url, {
            fields: {
                password: { stringValue: DEFAULT_PASSWORD },
                createdAt: { timestampValue: new Date().toISOString() },
                updatedAt: { timestampValue: new Date().toISOString() }
            }
        });

        console.log('✅ Password config created');
        return true;
    } catch (error) {
        console.error('Error creating password config:', error.message);
        return false;
    }
};

/**
 * Check if user is authorized to create changelogs
 */
const isAuthorizedUser = async (uid) => {
    try {
        console.log('👤 Checking authorization for UID:', uid);
        const userData = await getUserData(uid);

        if (!userData) {
            console.log('❌ User document not found in Firestore');
            return false;
        }

        console.log('📄 User data:', userData);

        const isAuth = AUTHORIZED_USERS.some(authUser => {
            const matchCustomUID = userData.customUID && userData.customUID === authUser.customUID;
            const matchUsername = userData.username && userData.username === authUser.username;
            const matchAtName = userData.atName && userData.atName === authUser.atName;

            console.log(`Checking against ${authUser.customUID}:`, {
                matchCustomUID,
                matchUsername,
                matchAtName
            });

            return matchCustomUID || matchUsername || matchAtName;
        });

        console.log('✅ Final authorization result:', isAuth);
        return isAuth;
    } catch (error) {
        console.error('❌ Error checking user authorization:', error);
        return false;
    }
};

/**
 * Check if user is authorized to create changelogs
 * GET /api/changelog/check-auth
 */
export const checkChangelogAuth = async (ctx) => {
    try {
        const uid = ctx.state.user?.uid;
        console.log('🔍 Checking changelog auth for user:', uid);

        if (!uid) {
            console.log('❌ No UID in request');
            ctx.status = 401;
            ctx.body = { authorized: false, error: 'Not authenticated' };
            return;
        }

        const isAuthorized = await isAuthorizedUser(uid);
        console.log('🔐 Authorization result for', uid, ':', isAuthorized);

        ctx.body = { authorized: isAuthorized };
    } catch (error) {
        console.error('❌ Error checking changelog auth:', error);
        ctx.status = 500;
        ctx.body = { authorized: false, error: 'Server error' };
    }
};

/**
 * Verify changelog password
 * POST /api/changelog/verify-password
 * Body: { password: string }
 */
export const verifyChangelogPassword = async (ctx) => {
    try {
        const uid = ctx.state.user?.uid;
        const { password } = ctx.request.body;

        if (!uid) {
            ctx.status = 401;
            ctx.body = { verified: false, error: 'Not authenticated' };
            return;
        }

        // Check if user is authorized
        const isAuthorized = await isAuthorizedUser(uid);
        if (!isAuthorized) {
            ctx.status = 403;
            ctx.body = { verified: false, error: 'Not authorized' };
            return;
        }

        // Get password from Firestore
        const correctPassword = await getChangelogPassword();

        // Verify password
        const verified = password === correctPassword;

        if (verified) {
            ctx.body = {
                verified: true,
                expiresIn: 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
            };
        } else {
            ctx.status = 401;
            ctx.body = { verified: false, error: 'Incorrect password' };
        }
    } catch (error) {
        console.error('Error verifying changelog password:', error);
        ctx.status = 500;
        ctx.body = { verified: false, error: 'Server error' };
    }
};

/**
 * Update changelog password (admin only)
 * POST /api/changelog/update-password
 * Body: { newPassword: string }
 */
export const updateChangelogPassword = async (ctx) => {
    try {
        const uid = ctx.state.user?.uid;
        const { newPassword } = ctx.request.body;

        if (!uid) {
            ctx.status = 401;
            ctx.body = { success: false, error: 'Not authenticated' };
            return;
        }

        // Check if user is authorized
        const isAuthorized = await isAuthorizedUser(uid);
        if (!isAuthorized) {
            ctx.status = 403;
            ctx.body = { success: false, error: 'Not authorized' };
            return;
        }

        if (!newPassword || newPassword.length < 8) {
            ctx.status = 400;
            ctx.body = { success: false, error: 'Password must be at least 8 characters' };
            return;
        }

        // Update password in Firestore using REST API
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/config/changelog_config`;

        await axios.patch(url, {
            fields: {
                password: { stringValue: newPassword },
                updatedAt: { timestampValue: new Date().toISOString() },
                updatedBy: { stringValue: uid }
            }
        });

        ctx.body = { success: true };
    } catch (error) {
        console.error('Error updating changelog password:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: 'Server error' };
    }
};

/**
 * Initialize password config on first request
 * POST /api/changelog/init-password
 */
export const initializeChangelogPassword = async (ctx) => {
    try {
        const uid = ctx.state.user?.uid;

        if (!uid) {
            ctx.status = 401;
            ctx.body = { success: false, error: 'Not authenticated' };
            return;
        }

        // Check if user is authorized
        const isAuthorized = await isAuthorizedUser(uid);
        if (!isAuthorized) {
            ctx.status = 403;
            ctx.body = { success: false, error: 'Not authorized' };
            return;
        }

        const success = await createPasswordConfig();
        ctx.body = { success };
    } catch (error) {
        console.error('Error initializing password:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: 'Server error' };
    }
};
