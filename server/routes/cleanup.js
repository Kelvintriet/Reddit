import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyAq91-kUVQlXW3MhwpfRPmGP7e0nWAqGT0',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'xredread.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'xredread',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'xredread.firebasestorage.app',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '822628499479',
  appId: process.env.FIREBASE_APP_ID || '1:822628499479:web:873b4caca6b644e6289c52'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '68354a45003c063d0155';
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || '686a52c0001f6ee0e043';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || ''; // You'll need to set this

const ORPHAN_TIMEOUT_MINUTES = 30; // Files older than 30 minutes without post association

/**
 * Cleanup orphaned files endpoint
 * Deletes files that were uploaded but never attached to a post
 */
export const cleanupOrphanedFiles = async (ctx) => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - ORPHAN_TIMEOUT_MINUTES);
    
    // Get orphaned files from Firestore
    const orphanedFilesRef = collection(db, 'orphanedFiles');
    const q = query(
      orphanedFilesRef,
      where('attachedToPost', '==', null),
      where('uploadedAt', '<', Timestamp.fromDate(cutoffTime))
    );
    
    const snapshot = await getDocs(q);
    const orphanedFiles = snapshot.docs.map(doc => ({
      id: doc.id,
      fileId: doc.data().fileId,
      userId: doc.data().userId,
      uploadedAt: doc.data().uploadedAt?.toDate()
    }));
    
    if (orphanedFiles.length === 0) {
      ctx.body = {
        success: true,
        message: 'No orphaned files to clean up',
        deletedCount: 0
      };
      return;
    }
    
    // Delete files from Appwrite
    const deletePromises = orphanedFiles.map(async (file) => {
      try {
        // Delete from Appwrite storage
        const deleteUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${file.fileId}?project=${APPWRITE_PROJECT_ID}`;
        
        await axios.delete(deleteUrl, {
          headers: {
            'X-Appwrite-Project': APPWRITE_PROJECT_ID,
            ...(APPWRITE_API_KEY && { 'X-Appwrite-Key': APPWRITE_API_KEY })
          }
        });
        
        // Delete record from Firestore
        await deleteDoc(doc(db, 'orphanedFiles', file.id));
        
        console.log(`✅ Deleted orphaned file: ${file.fileId}`);
        return { success: true, fileId: file.fileId };
      } catch (error) {
        console.error(`❌ Failed to delete file ${file.fileId}:`, error.message);
        // Still delete the Firestore record even if Appwrite delete fails
        try {
          await deleteDoc(doc(db, 'orphanedFiles', file.id));
        } catch (e) {
          console.error(`Failed to delete Firestore record:`, e);
        }
        return { success: false, fileId: file.fileId, error: error.message };
      }
    });
    
    const results = await Promise.all(deletePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    ctx.body = {
      success: true,
      message: `Cleaned up ${successCount} orphaned files`,
      deletedCount: successCount,
      failedCount: failCount,
      totalChecked: orphanedFiles.length
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error.message || 'Failed to cleanup orphaned files'
    };
  }
};

