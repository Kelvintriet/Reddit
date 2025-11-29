import { collection, addDoc, doc, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ORPHANED_FILES_COLLECTION = 'orphanedFiles';
const ORPHAN_TIMEOUT_MINUTES = 30; // Files older than 30 minutes without post association will be deleted

export interface OrphanedFileRecord {
  fileId: string;
  userId: string;
  uploadedAt: Date;
  attachedToPost?: string; // Post ID if attached
  attachedAt?: Date;
}

/**
 * Register an uploaded file as potentially orphaned
 * This should be called immediately after file upload
 */
export const registerOrphanedFile = async (fileId: string, userId: string): Promise<void> => {
  try {
    await addDoc(collection(db, ORPHANED_FILES_COLLECTION), {
      fileId,
      userId,
      uploadedAt: Timestamp.now(),
      attachedToPost: null
    });
    console.log(`📝 Registered orphaned file: ${fileId}`);
  } catch (error) {
    console.error('Error registering orphaned file:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Mark files as attached to a post
 * This should be called when post is created
 */
export const markFilesAsAttached = async (fileIds: string[], postId: string): Promise<void> => {
  try {
    const promises = fileIds.map(async (fileId) => {
      // Find the orphaned file record
      const q = query(
        collection(db, ORPHANED_FILES_COLLECTION),
        where('fileId', '==', fileId),
        where('attachedToPost', '==', null)
      );
      const snapshot = await getDocs(q);
      
      // Update all matching records (should be only one)
      const updatePromises = snapshot.docs.map(docRef =>
        updateDoc(doc(db, ORPHANED_FILES_COLLECTION, docRef.id), {
          attachedToPost: postId,
          attachedAt: Timestamp.now()
        })
      );
      
      await Promise.all(updatePromises);
    });
    
    await Promise.all(promises);
    console.log(`✅ Marked ${fileIds.length} files as attached to post ${postId}`);
  } catch (error) {
    console.error('Error marking files as attached:', error);
    // Don't throw - this is not critical
  }
};

/**
 * Get list of orphaned files for a user that should be cleaned up
 * Used by cleanup job
 */
export const getOrphanedFiles = async (olderThanMinutes: number = ORPHAN_TIMEOUT_MINUTES): Promise<OrphanedFileRecord[]> => {
  try {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - olderThanMinutes);
    
    const q = query(
      collection(db, ORPHANED_FILES_COLLECTION),
      where('attachedToPost', '==', null),
      where('uploadedAt', '<', Timestamp.fromDate(cutoffTime))
    );
    
    const snapshot = await getDocs(q);
    const files = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
    } as OrphanedFileRecord & { id: string }));
    
    return files;
  } catch (error) {
    console.error('Error getting orphaned files:', error);
    return [];
  }
};

