import axios from 'axios';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

/**
 * Middleware to verify Firebase authentication token using REST API
 * Adds user info to ctx.state.user if valid
 */
export const verifyAuth = async (ctx, next) => {
    try {
        const authHeader = ctx.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { error: 'No authorization token provided' };
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            // Verify token using Firebase REST API
            const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;
            const response = await axios.post(verifyUrl, {
                idToken: token
            });

            if (response.data && response.data.users && response.data.users.length > 0) {
                const user = response.data.users[0];

                // Add user info to context state
                ctx.state.user = {
                    uid: user.localId,
                    email: user.email,
                    emailVerified: user.emailVerified || false
                };

                await next();
            } else {
                throw new Error('Invalid token response');
            }
        } catch (error) {
            console.error('Token verification error:', error.response?.data?.error?.message || error.message);
            ctx.status = 401;
            ctx.body = { error: 'Invalid or expired token' };
            return;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        ctx.status = 500;
        ctx.body = { error: 'Authentication error' };
        return;
    }
};

