import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface SettingsToken {
  subredditName: string;
  userId: string;
  token: string;
  createdAt: any;
  expiresAt: any;
  isExpired: boolean;
}

// Generate settings token (called when owner clicks settings button)
export const generateSettingsToken = async (subredditName: string, userId: string): Promise<string> => {
  try {
    // First, expire any existing tokens for this subreddit
    await expireExistingTokensForSubreddit(subredditName, userId);

    // Generate 64-character random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const tokenData: SettingsToken = {
      subredditName,
      userId,
      token,
      createdAt: serverTimestamp(),
      expiresAt,
      isExpired: false
    };

    // Store token in Firestore
    const tokenId = `${subredditName}_${token}`;
    const tokenRef = doc(db, 'settingsTokens', tokenId);
    await setDoc(tokenRef, tokenData);

    console.log('✅ Settings token generated:', token);
    return token;
  } catch (error) {
    console.error('❌ Error generating settings token:', error);
    throw error;
  }
};

// Validate settings token
export const validateSettingsToken = async (subredditName: string, token: string, userId: string): Promise<boolean> => {
  try {
    // Validate input
    if (!subredditName || !token || !userId || token.length !== 64) {
      console.log('❌ Invalid input parameters');
      return false;
    }

    // Validate token format (64 characters, alphanumeric)
    if (!/^[A-Za-z0-9]{64}$/.test(token)) {
      console.log('❌ Invalid token format');
      return false;
    }

    const tokenId = `${subredditName}_${token}`;
    const tokenRef = doc(db, 'settingsTokens', tokenId);
    const tokenSnap = await getDoc(tokenRef);
    
    if (!tokenSnap.exists()) {
      console.log('❌ Token not found');
      return false;
    }
    
    const tokenData = tokenSnap.data() as SettingsToken;
    
    // Check if token belongs to the user
    if (tokenData.userId !== userId) {
      console.log('❌ Token does not belong to user');
      return false;
    }
    
    // Check if subreddit matches
    if (tokenData.subredditName !== subredditName) {
      console.log('❌ Subreddit mismatch');
      return false;
    }
    
    // Check if token is manually expired
    if (tokenData.isExpired) {
      console.log('❌ Token is manually expired');
      return false;
    }
    
    // Check if token has timed out
    const now = new Date();
    const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
    
    if (now > expiresAt) {
      console.log('❌ Token has timed out');
      // Mark as expired
      await setDoc(tokenRef, { ...tokenData, isExpired: true }, { merge: true });
      return false;
    }
    
    console.log('✅ Settings token is valid');
    return true;
  } catch (error) {
    console.error('❌ Error validating settings token:', error);
    return false;
  }
};

// Expire all existing tokens for a subreddit (to ensure only one active token)
const expireExistingTokensForSubreddit = async (subredditName: string, userId: string): Promise<void> => {
  try {
    const tokensRef = collection(db, 'settingsTokens');
    const q = query(tokensRef, where('subredditName', '==', subredditName), where('userId', '==', userId));
    const querySnap = await getDocs(q);

    const expirePromises: Promise<void>[] = [];
    querySnap.docs.forEach(doc => {
      const tokenData = doc.data() as SettingsToken;
      if (!tokenData.isExpired) {
        expirePromises.push(setDoc(doc.ref, { isExpired: true }, { merge: true }));
      }
    });

    await Promise.all(expirePromises);
    console.log(`✅ Expired ${expirePromises.length} existing tokens for subreddit ${subredditName}`);
  } catch (error) {
    console.error('❌ Error expiring existing tokens:', error);
  }
};

// Expire settings token (called when user logs out or manually)
export const expireSettingsToken = async (subredditName: string, token: string): Promise<void> => {
  try {
    const tokenId = `${subredditName}_${token}`;
    const tokenRef = doc(db, 'settingsTokens', tokenId);

    await setDoc(tokenRef, { isExpired: true }, { merge: true });
    console.log('✅ Settings token expired');
  } catch (error) {
    console.error('❌ Error expiring settings token:', error);
  }
};

// Clean up expired settings tokens (run periodically)
export const cleanupExpiredSettingsTokens = async (): Promise<void> => {
  try {
    const tokensRef = collection(db, 'settingsTokens');
    const querySnap = await getDocs(tokensRef);
    
    const now = new Date();
    const deletePromises: Promise<void>[] = [];
    
    querySnap.docs.forEach(doc => {
      const tokenData = doc.data() as SettingsToken;
      const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
      
      // Delete tokens that expired more than 1 hour ago
      if (now.getTime() - expiresAt.getTime() > 60 * 60 * 1000) {
        deletePromises.push(deleteDoc(doc.ref));
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`✅ Cleaned up ${deletePromises.length} expired settings tokens`);
  } catch (error) {
    console.error('❌ Error cleaning up expired settings tokens:', error);
  }
};

// Get all active settings tokens for a user (for security monitoring)
export const getUserActiveSettingsTokens = async (userId: string): Promise<SettingsToken[]> => {
  try {
    const tokensRef = collection(db, 'settingsTokens');
    const querySnap = await getDocs(tokensRef);
    
    const activeTokens: SettingsToken[] = [];
    const now = new Date();
    
    querySnap.docs.forEach(doc => {
      const tokenData = doc.data() as SettingsToken;
      
      if (tokenData.userId === userId && !tokenData.isExpired) {
        const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt);
        
        if (now <= expiresAt) {
          activeTokens.push(tokenData);
        }
      }
    });
    
    return activeTokens;
  } catch (error) {
    console.error('❌ Error getting user active settings tokens:', error);
    return [];
  }
};
