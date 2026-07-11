import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

export function useSyncState<T>(key: string, initialValue: T, column: string) {
  const [value, setValue] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });
  
  const [sessionUser, setSessionUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSessionUser(user);
    });
    
    return () => unsubscribe();
  }, []);

  // Listen for real-time changes across devices
  useEffect(() => {
    if (!sessionUser) return;

    const docRef = doc(db, 'user_data', sessionUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data[column] !== undefined) {
          setValue(prev => {
            const stringifiedPrev = JSON.stringify(prev);
            const stringifiedNew = JSON.stringify(data[column]);
            if (stringifiedPrev !== stringifiedNew) {
              try {
                localStorage.setItem(key, stringifiedNew);
                localStorage.setItem(`${key}_autobackup`, stringifiedNew);
              } catch (e) {
                console.error("Failed to save to localStorage:", e);
              }
              return data[column];
            }
            return prev;
          });
        }
      }
    }, (error) => {
      console.error("Error listening to data:", error);
    });
    
    return () => unsubscribe();
  }, [sessionUser, column, key]);

  // Wrap the setter to also update Firestore and localStorage
  const setSyncedValue = (newValue: T | ((val: T) => T)) => {
    setValue((prevValue) => {
      const computedValue = typeof newValue === 'function' ? (newValue as Function)(prevValue) : newValue;
      
      try {
        localStorage.setItem(key, JSON.stringify(computedValue));
        // Save an auto-backup to prevent data loss
        localStorage.setItem(`${key}_autobackup`, JSON.stringify(computedValue));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }

      if (sessionUser) {
        try {
          // Sanitize data to remove undefined fields which Firestore rejects
          const sanitizedValue = computedValue === undefined ? null : JSON.parse(JSON.stringify(computedValue));
          
          const payload = {
            [column]: sanitizedValue,
            updated_at: serverTimestamp()
          };
          
          // Upsert the user profile data
          setDoc(doc(db, 'user_data', sessionUser.uid), payload, { merge: true }).catch(err => {
            console.error("Error saving data to firestore:", err);
          });
        } catch (e) {
          console.error("Failed to sync to firestore:", e);
        }
      }

      return computedValue;
    });
  };

  return [value, setSyncedValue] as const;
}

