// IndexedDB Utility for permanent storage
const DB_NAME = 'LiveChatGallery';
const STORE_NAME = 'items';
const NOTES_STORE = 'notes';
const FOLDERS_STORE = 'folders';

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  lastModified: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Folder {
  id: string;
  name: string;
  createdAt?: any;
}

export async function initDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFolderLocal(folder: Folder) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.put(folder);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getFoldersLocal() {
  const db = await initDB();
  return new Promise<Folder[]>((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readonly');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteFolderLocal(id: string) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNoteLocal(note: Note) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.put(note);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getNotesLocal() {
  const db = await initDB();
  return new Promise<Note[]>((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, 'readonly');
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNoteLocal(id: string) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGalleryItemLocal(item: any) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

export async function getGalleryItemsLocal() {
  const db = await initDB();
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteGalleryItemLocal(id: string) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
