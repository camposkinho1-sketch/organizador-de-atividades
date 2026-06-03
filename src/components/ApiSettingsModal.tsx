import React, { useState, useEffect } from 'react';
import { X, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ApiSettingsModal = ({ onClose }: { onClose: () => void }) => {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('custom_api_key') || '';
    setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('custom_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('custom_api_key');
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Configurar Chave API
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-sm text-blue-800 shadow-sm mb-6">
             <AlertCircle className="w-6 h-6 flex-shrink-0 text-blue-600 focus:outline-none" />
             <p>Use esta opção para inserir a sua própria chave de API. As requisições de chat passarão a usar essa chave instantaneamente.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Chave da API</label>
            <input
              type="password"
              placeholder="Sua chave de API..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">Sua chave é salva apenas localmente no seu navegador para uso imediato no app.</p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
          >
            {saved ? <><CheckCircle className="w-4 h-4" /> Salvo!</> : 'Salvar Chave'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
