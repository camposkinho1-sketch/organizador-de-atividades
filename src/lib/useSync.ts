import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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

  // Fetch initial data from Firestore
  useEffect(() => {
    if (!sessionUser) return;

    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'user_data', sessionUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data[column]) {
            setValue(data[column]);
            localStorage.setItem(key, JSON.stringify(data[column]));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchConfig();
  }, [sessionUser, column, key]); // execute only once when user loads

  // Wrap the setter to also update Firestore and localStorage
  const setSyncedValue = (newValue: T | ((val: T) => T)) => {
    const computedValue = newValue instanceof Function ? newValue(value) : newValue;
    setValue(computedValue);
    localStorage.setItem(key, JSON.stringify(computedValue));

    if (sessionUser) {
      const payload = {
        [column]: computedValue,
        updated_at: serverTimestamp()
      };
      
      // Upsert the user profile data
      setDoc(doc(db, 'user_data', sessionUser.uid), payload, { merge: true }).catch(err => {
        console.error("Error saving data:", err);
      });
    }
  };

  return [value, setSyncedValue] as const;
}

