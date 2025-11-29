import { collection, doc, setDoc, getDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface EditToken {
  id: string
  postId: string
  userId: string
  token: string
  createdAt: any
  expiresAt: any
  isExpired: boolean
}

// Generate random 15-character token
const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 15; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate new edit token for a post
export const generateEditToken = async (postId: string, userId: string): Promise<string> => {
  try {
    // First, expire all existing tokens for this post
    await expireExistingTokens(postId, userId)
    
    const token = generateToken()
    const tokenId = `${postId}_${token}`
    
    const editTokenRef = doc(db, 'editTokens', tokenId)
    
    await setDoc(editTokenRef, {
      id: tokenId,
      postId,
      userId,
      token,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      isExpired: false
    })
    
    console.log('✅ Edit token generated:', token)
    return token
  } catch (error) {
    console.error('❌ Error generating edit token:', error)
    throw error
  }
}

// Enhanced validate edit token with detailed error info
export const validateEditToken = async (postId: string, token: string, userId: string): Promise<{
  isValid: boolean;
  error?: string;
  canViewContent?: boolean;
}> => {
  try {
    // Additional security checks
    if (!postId || !token || !userId) {
      return { isValid: false, error: 'Missing required parameters' };
    }

    // Validate token format (15 characters, alphanumeric)
    if (!/^[A-Za-z0-9]{15}$/.test(token)) {
      return { isValid: false, error: 'Invalid token format' };
    }

    const tokenId = `${postId}_${token}`
    const tokenRef = doc(db, 'editTokens', tokenId)
    const tokenSnap = await getDoc(tokenRef)

    if (!tokenSnap.exists()) {
      return { isValid: false, error: 'Token not found', canViewContent: false };
    }

    const tokenData = tokenSnap.data() as EditToken

    // Enhanced security: Check if token belongs to the user
    if (tokenData.userId !== userId) {
      return { isValid: false, error: 'Unauthorized access attempt', canViewContent: false };
    }

    // Check if post ID matches
    if (tokenData.postId !== postId) {
      return { isValid: false, error: 'Token-post mismatch', canViewContent: false };
    }

    // Check if token is manually expired
    if (tokenData.isExpired) {
      return { isValid: false, error: 'Token has been revoked', canViewContent: true };
    }

    // Check if token has timed out
    const now = new Date()
    const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt)

    if (now > expiresAt) {
      // Mark as expired
      await setDoc(tokenRef, { ...tokenData, isExpired: true }, { merge: true })
      return { isValid: false, error: 'Token has expired', canViewContent: true };
    }

    return { isValid: true };
  } catch (error) {
    console.error('❌ Error validating token:', error)
    return { isValid: false, error: 'Validation error occurred', canViewContent: false };
  }
}

// Legacy function for backward compatibility
export const validateEditTokenLegacy = async (postId: string, token: string, userId: string): Promise<boolean> => {
  const result = await validateEditToken(postId, token, userId);
  return result.isValid;
}

// Expire all existing tokens for a post/user
export const expireExistingTokens = async (postId: string, userId: string): Promise<void> => {
  try {
    const tokensRef = collection(db, 'editTokens')
    const q = query(tokensRef, where('postId', '==', postId), where('userId', '==', userId))
    const querySnap = await getDocs(q)
    
    const expirePromises = querySnap.docs.map(doc => 
      setDoc(doc.ref, { isExpired: true }, { merge: true })
    )
    
    await Promise.all(expirePromises)
    console.log(`✅ Expired ${querySnap.docs.length} existing tokens for post ${postId}`)
  } catch (error) {
    console.error('❌ Error expiring existing tokens:', error)
    throw error
  }
}

// Expire token after successful edit (security measure)
export const expireTokenAfterEdit = async (postId: string, token: string, _userId: string): Promise<void> => {
  try {
    const tokenId = `${postId}_${token}`
    const tokenRef = doc(db, 'editTokens', tokenId)

    await setDoc(tokenRef, { isExpired: true }, { merge: true })
    console.log('✅ Token expired after successful edit')
  } catch (error) {
    console.error('❌ Error expiring token after edit:', error)
  }
}

// Clean up expired tokens (run periodically)
export const cleanupExpiredTokens = async (): Promise<void> => {
  try {
    const tokensRef = collection(db, 'editTokens')
    const querySnap = await getDocs(tokensRef)

    const now = new Date()
    const deletePromises: Promise<void>[] = []

    querySnap.docs.forEach(doc => {
      const tokenData = doc.data() as EditToken
      const expiresAt = tokenData.expiresAt.toDate ? tokenData.expiresAt.toDate() : new Date(tokenData.expiresAt)

      // Delete tokens that expired more than 1 hour ago
      if (now.getTime() - expiresAt.getTime() > 60 * 60 * 1000) {
        deletePromises.push(deleteDoc(doc.ref))
      }
    })

    await Promise.all(deletePromises)
    console.log(`✅ Cleaned up ${deletePromises.length} expired tokens`)
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error)
  }
}