import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ChangelogChange {
    type: 'feature' | 'improvement' | 'bugfix' | 'breaking';
    description: string;
}

export interface Changelog {
    id?: string;
    version: string;
    date: string;
    changes: ChangelogChange[];
    createdAt?: Timestamp;
    createdBy?: string;
    createdByUsername?: string;
}

// Create a new changelog entry
export const createChangelog = async (data: {
    version: string;
    date: string;
    changes: ChangelogChange[];
    createdBy: string;
    createdByUsername: string;
}): Promise<string> => {
    try {
        const changelogData = {
            ...data,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'changelogs'), changelogData);
        console.log('✅ Changelog created with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating changelog:', error);
        throw error;
    }
};

// Get all changelogs ordered by date (newest first)
export const getChangelogs = async (): Promise<Changelog[]> => {
    try {
        const changelogsRef = collection(db, 'changelogs');
        const q = query(changelogsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Changelog));
    } catch (error) {
        console.error('Error getting changelogs:', error);
        throw error;
    }
};

// Get a single changelog by ID
export const getChangelog = async (id: string): Promise<Changelog | null> => {
    try {
        const changelogRef = doc(db, 'changelogs', id);
        const changelogSnap = await getDoc(changelogRef);

        if (changelogSnap.exists()) {
            return {
                id: changelogSnap.id,
                ...changelogSnap.data()
            } as Changelog;
        }
        return null;
    } catch (error) {
        console.error('Error getting changelog:', error);
        throw error;
    }
};

// Update a changelog
export const updateChangelog = async (id: string, updates: Partial<Changelog>): Promise<void> => {
    try {
        const changelogRef = doc(db, 'changelogs', id);
        await updateDoc(changelogRef, updates);
        console.log('✅ Changelog updated');
    } catch (error) {
        console.error('❌ Error updating changelog:', error);
        throw error;
    }
};

// Delete a changelog
export const deleteChangelog = async (id: string): Promise<void> => {
    try {
        const changelogRef = doc(db, 'changelogs', id);
        await deleteDoc(changelogRef);
        console.log('✅ Changelog deleted');
    } catch (error) {
        console.error('❌ Error deleting changelog:', error);
        throw error;
    }
};
