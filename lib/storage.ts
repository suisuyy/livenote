import { db, storage } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MAX_STORAGE_BYTES = 1073741824; // 1GB

export async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function uploadFileWithDeduplication(file: File, userId: string): Promise<{ sha256: string, name: string, size: number, mimeType: string, url: string }> {
  const sha256 = await calculateSHA256(file);
  const fileRecordRef = doc(db, 'files', sha256);
  const userRef = doc(db, 'users', userId);

  // 1. Check user storage limit
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }
  const currentStorageUsed = userDoc.data().storageUsed || 0;
  if (currentStorageUsed + file.size > MAX_STORAGE_BYTES) {
    throw new Error("Storage limit exceeded (1GB max)");
  }

  // 2. Check if file already exists globally
  const fileRecordDoc = await getDoc(fileRecordRef);
  let url = '';

  if (fileRecordDoc.exists()) {
    // File exists, reuse it
    url = await getDownloadURL(ref(storage, `files/${sha256}`));
  } else {
    // File doesn't exist, upload it
    const storageRef = ref(storage, `files/${sha256}`);
    await uploadBytes(storageRef, file);
    url = await getDownloadURL(storageRef);

    // Save global file record
    await setDoc(fileRecordRef, {
      size: file.size,
      mimeType: file.type,
      uploadedBy: userId,
      createdAt: serverTimestamp()
    });
  }

  // 3. Update user's storage usage
  await updateDoc(userRef, {
    storageUsed: increment(file.size)
  });

  return {
    sha256,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    url
  };
}
