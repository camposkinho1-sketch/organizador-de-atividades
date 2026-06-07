import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where } from 'firebase/firestore';

export type TaskAttachment = {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'link' | 'other';
  url?: string;
  base64?: string;
};

// Fetch attachments for a specific task
export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, `user_data/${auth.currentUser.uid}/attachments`),
      where("taskId", "==", taskId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskAttachment));
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return [];
  }
}

// Save a new attachment
export async function saveTaskAttachment(taskId: string, attachment: Omit<TaskAttachment, 'id'>): Promise<TaskAttachment> {
  if (!auth.currentUser) throw new Error("User not authenticated");
  
  const id = Math.random().toString(36).substring(2, 15);
  const docRef = doc(db, `user_data/${auth.currentUser.uid}/attachments`, id);
  
  const dataToSave = {
    taskId,
    ...attachment
  };
  
  await setDoc(docRef, dataToSave);
  return { id, ...attachment };
}

// Delete an attachment
export async function deleteTaskAttachment(attachmentId: string): Promise<void> {
  if (!auth.currentUser) return;
  const docRef = doc(db, `user_data/${auth.currentUser.uid}/attachments`, attachmentId);
  await deleteDoc(docRef);
}
