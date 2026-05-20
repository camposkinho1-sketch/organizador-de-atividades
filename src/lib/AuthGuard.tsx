import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, KeyRound } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, logOut } = useAuth();
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setError('');
    
    try {
      await signIn();
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
      {children}
    </>
  );
}

