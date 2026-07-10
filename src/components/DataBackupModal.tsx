import React, { useState } from 'react';
import { X, Download, Upload, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { playClick } from '../lib/audio';

export const DataBackupModal = ({ onClose }: { onClose: () => void }) => {
  const [status, setStatus] = useState('');

  const exportData = () => {
    playClick();
    const dataToExport = {
      guardiao_tasks: localStorage.getItem('guardiao_tasks'),
      guardiao_schedule: localStorage.getItem('guardiao_schedule'),
      guardiao_grades: localStorage.getItem('guardiao_grades'),
      portfolio_data: localStorage.getItem('portfolio_data'),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guardiao_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('Backup exportado com sucesso!');
    setTimeout(() => setStatus(''), 3000);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    playClick();
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.guardiao_tasks) localStorage.setItem('guardiao_tasks', data.guardiao_tasks);
        if (data.guardiao_schedule) localStorage.setItem('guardiao_schedule', data.guardiao_schedule);
        if (data.guardiao_grades) localStorage.setItem('guardiao_grades', data.guardiao_grades);
        if (data.portfolio_data) localStorage.setItem('portfolio_data', data.portfolio_data);
        
        setStatus('Dados restaurados! Recarregando...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        setStatus('Erro ao importar arquivo. Formato inválido.');
      }
    };
    reader.readAsText(file);
  };

  const restoreFromAutoBackup = () => {
    playClick();
    try {
      let restored = false;
      ['guardiao_tasks', 'guardiao_schedule', 'guardiao_grades', 'portfolio_data'].forEach(key => {
        const backup = localStorage.getItem(`${key}_autobackup`);
        if (backup) {
          localStorage.setItem(key, backup);
          restored = true;
        }
      });
      if (restored) {
        setStatus('Backup automático restaurado! Recarregando...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus('Nenhum backup automático encontrado.');
      }
    } catch (e) {
      setStatus('Erro ao restaurar backup automático.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#18181b] border-4 border-white shadow-[8px_8px_0px_white] w-full max-w-md flex flex-col relative"
      >
        <div className="p-4 border-b-4 border-white flex justify-between items-center bg-[#a3e635]">
          <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
            <Save className="w-5 h-5 text-black" />
            Backup & Segurança
          </h2>
          <button onClick={() => { playClick(); onClose(); }} className="p-1 border-2 border-transparent hover:border-black hover:bg-black text-black hover:text-[#a3e635] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
          <div className="bg-[#27272a] border-2 border-white p-4 shadow-[4px_4px_0px_white] flex gap-3 text-white">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-[#3b82f6]" />
            <p className="font-mono text-sm leading-relaxed">
              O Guardião salva seus dados automaticamente na nuvem, mas você pode criar cópias físicas locais para garantir que <strong>nunca se percam</strong>.
            </p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={exportData}
              className="flex items-center justify-between p-4 bg-[#3b82f6] text-white border-2 border-white shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
            >
              <div className="text-left">
                <h3 className="font-bold uppercase tracking-wide">Exportar Backup</h3>
                <p className="font-mono text-xs text-blue-100 mt-1">Salvar arquivo no dispositivo</p>
              </div>
              <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative">
              <input 
                type="file" 
                accept=".json" 
                onChange={importData} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button 
                className="w-full flex items-center justify-between p-4 bg-[#ec4899] text-white border-2 border-white shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
              >
                <div className="text-left">
                  <h3 className="font-bold uppercase tracking-wide">Importar Backup</h3>
                  <p className="font-mono text-xs text-pink-100 mt-1">Restaurar de arquivo .json</p>
                </div>
                <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <button 
              onClick={restoreFromAutoBackup}
              className="flex items-center justify-between p-4 bg-[#27272a] text-white border-2 border-white shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
            >
              <div className="text-left">
                <h3 className="font-bold uppercase tracking-wide">Recuperação de Emergência</h3>
                <p className="font-mono text-xs text-zinc-400 mt-1">Restaurar da memória local (Última sessão)</p>
              </div>
              <Save className="w-6 h-6 text-[#a3e635] group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          {status && (
            <div className="bg-[#a3e635] border-2 border-white p-3 shadow-[2px_2px_0px_white] flex items-center gap-2 text-black font-bold text-sm justify-center">
              <CheckCircle className="w-5 h-5" />
              {status}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
