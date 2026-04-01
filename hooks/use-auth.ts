import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<(User & { isGuest?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState<number>(0);

  const loginAsGuest = () => {
    const guestUser = {
      uid: 'guest-' + Math.random().toString(36).substr(2, 9),
      displayName: 'Guest User',
      email: 'guest@example.com',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
      isGuest: true,
    } as any;
    setUser(guestUser);
    localStorage.setItem('guestUser', JSON.stringify(guestUser));
    window.dispatchEvent(new Event('guest-auth-change'));
  };

  const logoutGuest = () => {
    setUser(null);
    localStorage.removeItem('guestUser');
    window.dispatchEvent(new Event('guest-auth-change'));
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const savedGuest = localStorage.getItem('guestUser');
      if (savedGuest) {
        setUser(JSON.parse(savedGuest));
      } else if (auth.currentUser) {
        setUser(auth.currentUser as any);
      } else {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('guest-auth-change', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('guest-auth-change', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        const savedGuest = localStorage.getItem('guestUser');
        if (savedGuest) {
          setUser(JSON.parse(savedGuest));
          setLoading(false);
          return;
        }

        if (currentUser) {
          // Ensure user document exists
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              email: currentUser.email || '',
              role: 'user',
              storageUsed: 0,
              createdAt: serverTimestamp(),
            });
            setStorageUsed(0);
          } else {
            setStorageUsed(userSnap.data().storageUsed || 0);
          }
        }
        setUser(currentUser as any);
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, storageUsed, setStorageUsed, loginAsGuest, logoutGuest };
}
