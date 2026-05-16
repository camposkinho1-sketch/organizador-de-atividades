import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { LogIn, KeyRound } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6 text-amber-600">
            <KeyRound className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">
            Guardião Estudantil
          </h2>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">
              {error}
            </div>
          )}
          <button 
            onClick={handleAuth}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-[100] flex gap-2">
        <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 border border-slate-200 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Sincronizado
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 border border-slate-200 shadow-sm transition-colors"
        >
          Sair
        </button>
      </div>
      {children}
    </>
  );
}

