import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState<number>(0);

  const loginAsGuest = () => {
    const guestUser: AuthUser = {
      uid: 'guest-' + Math.random().toString(36).substr(2, 9),
      displayName: 'Guest User',
      email: 'guest@example.com',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
      isGuest: true,
    };
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
        setUser(auth.currentUser as AuthUser);
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
    console.log("useAuth: Setting up onAuthStateChanged");
    
    // Fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      console.warn("useAuth: onAuthStateChanged took too long, forcing loading to false");
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(fallbackTimeout);
      console.log("useAuth: onAuthStateChanged fired, currentUser:", currentUser?.uid);

      try {
        const savedGuest = localStorage.getItem('guestUser');
        if (savedGuest) {
          console.log("useAuth: Found saved guest user");
          setUser(JSON.parse(savedGuest));
          setLoading(false);
          return;
        }

        setUser(currentUser as AuthUser | null);
        setLoading(false); // Set loading to false immediately so UI can render

        if (currentUser) {
          console.log("useAuth: User is logged in, fetching user doc in background");
          // Ensure user document exists (in background)
          const userRef = doc(db, 'users', currentUser.uid);
          try {
            const userSnap = await getDoc(userRef);
            console.log("useAuth: Fetched user doc, exists:", userSnap.exists());
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
          } catch (docError) {
            console.error("Error fetching user doc:", docError);
          }
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setLoading(false);
      }
    });

    return () => {
      console.log("useAuth: Cleaning up onAuthStateChanged");
      unsubscribe();
    };
  }, []);

  return { user, loading, storageUsed, setStorageUsed, loginAsGuest, logoutGuest };
}
