import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleAccessToken: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  googleAccessToken: null,
  signIn: async () => {},
  logOut: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('googleAccessToken');
    const expiry = localStorage.getItem('googleAccessTokenExpiry');
    if (stored && expiry) {
      if (Date.now() < parseInt(expiry, 10)) {
        return stored;
      } else {
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleAccessTokenExpiry');
      }
    }
    return null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setGoogleAccessToken(null);
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleAccessTokenExpiry');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkTokenExpiry = () => {
      const stored = localStorage.getItem('googleAccessToken');
      const expiry = localStorage.getItem('googleAccessTokenExpiry');
      
      if (user && (!stored || !expiry || Date.now() >= parseInt(expiry, 10))) {
        // Token expired or missing. Clear it gently; don't trigger popup automatically
        setGoogleAccessToken(null);
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleAccessTokenExpiry');
      } else if (user && stored && expiry) {
        // Schedule next check
        const timeRemaining = parseInt(expiry, 10) - Date.now();
        if (timeRemaining > 0) {
          timeoutId = setTimeout(checkTokenExpiry, timeRemaining + 1000);
        }
      }
    };

    if (user) {
      checkTokenExpiry();
    }

    return () => clearTimeout(timeoutId);
  }, [user]);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      provider.setCustomParameters({
        prompt: 'consent'
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        localStorage.setItem('googleAccessToken', credential.accessToken);
        // Token expira em aproximadamente 1 hora. Guardamos para 55 minutos para segurança.
        localStorage.setItem('googleAccessTokenExpiry', (Date.now() + 55 * 60 * 1000).toString());
      }
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Erro ao fazer login:", error);
        alert(`Erro ao fazer login: ${error.message}`);
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setGoogleAccessToken(null);
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('googleAccessTokenExpiry');
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleAccessToken, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
