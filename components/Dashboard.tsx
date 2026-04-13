'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { loginWithGoogle, logout, db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc, orderBy, getDoc, serverTimestamp } from 'firebase/firestore';
import { Folder as FolderIcon, FileText, LogOut, Settings, Plus, Upload, Trash2, File as FileIcon, MessageSquare } from 'lucide-react';
import { uploadFileWithDeduplication } from '@/lib/storage';
import LiveChat from '@/components/LiveChat';
import { 
  getFoldersLocal, 
  getNotesLocal, 
  saveFolderLocal, 
  saveNoteLocal, 
  deleteNoteLocal,
  type Note,
  type Folder
} from '@/lib/db';

export default function Dashboard() {
  const { user, loading, storageUsed, loginAsGuest, logoutGuest } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiApiUrl, setGeminiApiUrl] = useState('https://generativelanguage.googleapis.com');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load user settings
    if (!user.isGuest) {
      getDoc(doc(db, 'users', user.uid)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().settings) {
          setTheme(docSnap.data().settings.theme || 'dark');
          setGeminiApiKey(docSnap.data().settings.geminiApiKey || '');
          setGeminiApiUrl(docSnap.data().settings.geminiApiUrl || 'https://generativelanguage.googleapis.com');
        }
      });

      const foldersRef = collection(db, 'users', user.uid, 'folders');
      const qFolders = query(foldersRef, orderBy('createdAt', 'desc'));
      const unsubFolders = onSnapshot(qFolders, (snapshot) => {
        setFolders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Folder)));
      }, (error) => {
        console.error("Folders snapshot error:", error);
      });

      const notesRef = collection(db, 'users', user.uid, 'notes');
      const qNotes = query(notesRef, orderBy('updatedAt', 'desc'));
      const unsubNotes = onSnapshot(qNotes, (snapshot) => {
        setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
      }, (error) => {
        console.error("Notes snapshot error:", error);
      });

      return () => {
        unsubFolders();
        unsubNotes();
      };
    } else {
      // Guest mode: load from IndexedDB
      getFoldersLocal().then(setFolders);
      getNotesLocal().then(setNotes);
      
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('guestSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'dark');
        setGeminiApiKey(settings.geminiApiKey || '');
        setGeminiApiUrl(settings.geminiApiUrl || 'https://generativelanguage.googleapis.com');
      }
    }
  }, [user]);

  const handleUpdateSettings = async (updates: { theme?: string, geminiApiKey?: string, geminiApiUrl?: string }) => {
    if (!user) return;
    
    const newTheme = updates.theme ?? theme;
    const newApiKey = updates.geminiApiKey ?? geminiApiKey;
    const newApiUrl = updates.geminiApiUrl ?? geminiApiUrl;

    setTheme(newTheme);
    setGeminiApiKey(newApiKey);
    setGeminiApiUrl(newApiUrl);

    if (!user.isGuest) {
      await setDoc(doc(db, 'users', user.uid), {
        settings: { theme: newTheme, geminiApiKey: newApiKey, geminiApiUrl: newApiUrl }
      }, { merge: true });
    } else {
      localStorage.setItem('guestSettings', JSON.stringify({ theme: newTheme, geminiApiKey: newApiKey, geminiApiUrl: newApiUrl }));
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-900">
        <div className="bg-neutral-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold mb-2">Cloud Notes</h1>
          <p className="text-neutral-400 mb-8">Secure, deduplicated cloud storage for your notes and files.</p>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
          <button
            onClick={loginAsGuest}
            className="w-full bg-neutral-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            Sign in as Guest
          </button>
        </div>
      </div>
    );
  }

  const handleCreateFolder = async () => {
    const name = prompt("Folder name:");
    if (!name) return;
    if (!user.isGuest) {
      await addDoc(collection(db, 'users', user.uid, 'folders'), {
        name,
        createdAt: serverTimestamp()
      });
    } else {
      const newFolder = { id: 'guest-folder-' + Date.now(), name, createdAt: new Date() };
      await saveFolderLocal(newFolder);
      setFolders(prev => [newFolder, ...prev]);
    }
  };

  const handleCreateNote = async () => {
    if (!selectedFolder) {
      alert("Please select a folder first.");
      return;
    }
    const title = prompt("Note title:");
    if (!title) return;
    
    const newNote = {
      folderId: selectedFolder,
      title,
      content: "",
      lastModified: Date.now(),
      attachments: [],
      createdAt: user.isGuest ? new Date() : serverTimestamp(),
      updatedAt: user.isGuest ? new Date() : serverTimestamp()
    };
    
    if (!user.isGuest) {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'notes'), newNote);
      setSelectedNote({ id: docRef.id, ...newNote });
    } else {
      const guestNote = { id: 'guest-note-' + Date.now(), ...newNote, lastModified: Date.now() };
      await saveNoteLocal(guestNote);
      setNotes(prev => [guestNote, ...prev]);
      setSelectedNote(guestNote);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    if (!user.isGuest) {
      await updateDoc(doc(db, 'users', user.uid, 'notes', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } else {
      const note = notes.find(n => n.id === id);
      if (note) {
        const updatedNote = { ...note, ...updates, updatedAt: new Date(), lastModified: Date.now() };
        await saveNoteLocal(updatedNote);
        setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
      }
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      if (!user.isGuest) {
        await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
      } else {
        await deleteNoteLocal(id);
        setNotes(prev => prev.filter(n => n.id !== id));
      }
      if (selectedNote?.id === id) setSelectedNote(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedNote) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    try {
      const fileData = await uploadFileWithDeduplication(file, user.uid);
      const newAttachments = [...(selectedNote.attachments || []), fileData];
      
      await handleUpdateNote(selectedNote.id, { attachments: newAttachments });
      setSelectedNote({ ...selectedNote, attachments: newAttachments });
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = Math.min(100, (storageUsed / 1073741824) * 100);

  return (
    <div className={`flex-1 flex overflow-hidden relative ${theme === 'light' ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-900 text-neutral-50'}`}>
      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="absolute top-0 bottom-24 left-0 right-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`absolute top-0 bottom-24 left-0 z-50 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} w-64 border-r border-b rounded-br-2xl flex flex-col ${theme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-950 border-neutral-800'} transition-transform duration-300 overflow-hidden`}>
        <div className={`p-4 border-b ${theme === 'light' ? 'border-neutral-200' : 'border-neutral-800'}`}>
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full" />
            <div className="overflow-hidden flex-1">
              <p className="font-medium truncate">{user.displayName}</p>
              <p className={`text-xs truncate ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>{user.email}</p>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className={`p-1.5 rounded-lg transition-colors ${theme === 'light' ? 'hover:bg-neutral-200 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400'}`}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          {user.isGuest && (
            <button 
              onClick={async () => {
                try {
                  await loginWithGoogle();
                  logoutGuest();
                } catch (error) {
                  console.error("Failed to sign in:", error);
                }
              }} 
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'}`}
            >
              Sign in with Google
            </button>
          )}

          <div className="mb-2">
            <div className={`flex justify-between text-xs mb-1 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>
              <span>Storage</span>
              <span>{formatBytes(storageUsed)} / 1 GB</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'light' ? 'bg-neutral-300' : 'bg-neutral-800'}`}>
              <div 
                className={`h-full ${storagePercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <button
            onClick={() => { setSelectedNote(null); setSelectedFolder(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-6 ${
              !selectedNote && !selectedFolder
                ? (theme === 'light' ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800 text-white')
                : (theme === 'light' ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white')
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-medium">Live Chat</span>
          </button>

          <div className="flex items-center justify-between mb-2 group">
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-500'}`}>Folders</h2>
            <button onClick={handleCreateFolder} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'light' ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'}`}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 mb-6">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => { setSelectedFolder(folder.id); setSelectedNote(null); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === folder.id 
                    ? (theme === 'light' ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800 text-white') 
                    : (theme === 'light' ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white')
                }`}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))}
            {folders.length === 0 && <p className={`text-xs italic px-3 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-600'}`}>No folders yet</p>}
          </div>

          {selectedFolder && (
            <>
              <div className="flex items-center justify-between mb-2 group">
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-500'}`}>Notes</h2>
                <button onClick={handleCreateNote} className={`opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'light' ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'}`}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {notes.filter(n => n.folderId === selectedFolder).map(note => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedNote?.id === note.id 
                        ? (theme === 'light' ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-800 text-white') 
                        : (theme === 'light' ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white')
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{note.title}</span>
                  </button>
                ))}
                {notes.filter(n => n.folderId === selectedFolder).length === 0 && <p className={`text-xs italic px-3 ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-600'}`}>No notes yet</p>}
              </div>
            </>
          )}
        </div>

        <div className={`p-4 border-t ${theme === 'light' ? 'border-neutral-200' : 'border-neutral-800'}`}>
          <button onClick={user.isGuest ? logoutGuest : logout} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${theme === 'light' ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <LogOut className="w-4 h-4" />
            Sign Out {user.isGuest && '(Guest)'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col w-full h-full ${theme === 'light' ? 'bg-white' : 'bg-neutral-900'}`}>
        <LiveChat 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          geminiApiKey={geminiApiKey}
          geminiApiUrl={geminiApiUrl}
          theme={theme}
          onUpdateSettings={handleUpdateSettings}
          isSettingsOpen={isSettingsOpen}
          onSettingsOpenChange={setIsSettingsOpen}
        >
          {selectedNote ? (
            <div className={`flex-1 flex flex-col h-full overflow-hidden ${theme === 'light' ? 'bg-white' : 'bg-neutral-900'}`}>
              <div className={`p-6 border-b flex items-center justify-between shrink-0 ${theme === 'light' ? 'border-neutral-200' : 'border-neutral-800'}`}>
                <div className="flex items-center gap-4 flex-1">
                  <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => {
                    setSelectedNote({ ...selectedNote, title: e.target.value });
                    handleUpdateNote(selectedNote.id, { title: e.target.value });
                  }}
                  className={`bg-transparent text-2xl font-bold outline-none flex-1 ${theme === 'light' ? 'placeholder:text-neutral-400' : 'placeholder:text-neutral-600'}`}
                  placeholder="Note Title"
                />
              </div>
              <button onClick={() => handleDeleteNote(selectedNote.id)} className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'text-neutral-500 hover:text-red-500 hover:bg-neutral-100' : 'text-neutral-500 hover:text-red-400 hover:bg-neutral-800'}`}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <textarea
                value={selectedNote.content}
                onChange={(e) => {
                  setSelectedNote({ ...selectedNote, content: e.target.value });
                  handleUpdateNote(selectedNote.id, { content: e.target.value });
                }}
                className={`w-full flex-1 bg-transparent resize-none outline-none leading-relaxed min-h-[200px] ${theme === 'light' ? 'text-neutral-800 placeholder:text-neutral-400' : 'text-neutral-300 placeholder:text-neutral-700'}`}
                placeholder="Start typing your note here..."
              />

              {/* Attachments Section */}
              <div className={`border-t pt-6 ${theme === 'light' ? 'border-neutral-200' : 'border-neutral-800'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-400'}`}>Attachments</h3>
                  <label className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    isUploading || user.isGuest
                      ? (theme === 'light' ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed')
                      : (theme === 'light' ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer')
                  }`}>
                    <Upload className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading || user.isGuest} />
                  </label>
                </div>
                {user.isGuest && (
                  <p className="text-[10px] text-amber-500 mb-4">Cloud storage is disabled in guest mode. Sign in to upload files.</p>
                )}
                
                {selectedNote.attachments && selectedNote.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedNote.attachments.map((file, index) => (
                      <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="block group">
                        <div className={`border rounded-lg p-3 transition-colors ${theme === 'light' ? 'bg-neutral-50 border-neutral-200 hover:border-neutral-400' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'}`}>
                          <div className={`w-full aspect-square rounded mb-2 flex items-center justify-center overflow-hidden ${theme === 'light' ? 'bg-neutral-200' : 'bg-neutral-900'}`}>
                            {file.mimeType.startsWith('image/') ? (
                              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                            ) : (
                              <FileIcon className={`w-8 h-8 ${theme === 'light' ? 'text-neutral-400' : 'text-neutral-600'}`} />
                            )}
                          </div>
                          <p className={`text-xs truncate ${theme === 'light' ? 'text-neutral-700 group-hover:text-black' : 'text-neutral-300 group-hover:text-white'}`}>{file.name}</p>
                          <p className={`text-[10px] ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-500'}`}>{formatBytes(file.size)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm italic ${theme === 'light' ? 'text-neutral-500' : 'text-neutral-600'}`}>No attachments yet. Upload images or files to this note.</p>
                )}
              </div>
            </div>
          </div>
        ) : selectedFolder ? (
            <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${theme === 'light' ? 'bg-white' : 'bg-neutral-900'}`}>
              <div className={`flex-1 flex items-center justify-center ${theme === 'light' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Select a note or create a new one
              </div>
            </div>
          ) : null}
        </LiveChat>
      </div>

    </div>
  );
}
