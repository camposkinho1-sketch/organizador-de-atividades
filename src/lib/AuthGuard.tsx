import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { LogIn, KeyRound } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Verifique seu e-mail para confirmar a conta.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    }
  };

  // Se o Supabase não estiver configurado, avisa o usuário.
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border-t-4 border-amber-500">
          <KeyRound className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Configuração do Supabase</h2>
          <p className="text-slate-600 mb-6">
            Para que o sistema de login e sincronização funcione, você precisa adicionar as seguintes variáveis de ambiente nas <strong>Configurações (Secrets)</strong> do AI Studio:
          </p>
          <div className="bg-slate-100 p-4 rounded-lg text-left text-sm font-mono text-slate-700 mb-6 break-all">
            VITE_SUPABASE_URL="sua-url-aqui"<br/><br/>
            VITE_SUPABASE_ANON_KEY="sua-chave-aqui"
          </div>
          <p className="text-sm text-slate-500">
            Dica: No painel do Supabase, vá em Settings &gt; API para encontrar esses valores.<br/><br/>
            Se você for testar a criação de conta, é recomendado ir em <strong>Authentication &gt; Providers &gt; Email</strong> e desativar "Confirm email" temporariamente, ou você precisará confirmar a conta pelo e-mail enviado.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!session) {
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
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-amber-600 transition-colors"
            >
              {isLogin ? 'Ainda não tem conta? Crie uma' : 'Já tem conta? Faça login'}
            </button>
          </div>
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
          onClick={() => supabase.auth.signOut()}
          className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-red-600 hover:bg-red-50 border border-slate-200 shadow-sm transition-colors"
        >
          Sair
        </button>
      </div>
      {children}
    </>
  );
}
