import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase with client config
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Middleware to check if user is blocked
 * Blocks access for users with isBlocked: true or customUID (for future blocking feature)
 */
export const checkBlockedUser = async (ctx, next) => {
    try {
        const userId = ctx.state.user?.uid;

        if (!userId) {
            ctx.status = 401;
            ctx.body = { error: 'User not authenticated' };
            return;
        }

        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();

                // Check if user is blocked
                if (userData.isBlocked === true) {
                    ctx.status = 403;
                    ctx.body = { error: 'Access denied: User is blocked' };
                    return;
                }

                // Check for customUID (for future blocking feature)
                // If you want to block users with customUID, uncomment below:
                // if (userData.customUID) {
                //   ctx.status = 403;
                //   ctx.body = { error: 'Access denied: Custom user blocked' };
                //   return;
                // }
            }
        } catch (error) {
            // User document not found or error - allow through (user might not have profile yet)
            console.error('Error checking blocked user:', error.message);
        }

        await next();
    } catch (error) {
        console.error('Blocked user check error:', error);
        // Don't block on error, allow through but log it
        await next();
    }
};

