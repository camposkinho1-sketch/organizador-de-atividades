import React, { useState, useRef } from 'react';
import { X, CheckCircle, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../App';

interface CompleteTaskModalProps {
  task: Task;
  onClose: () => void;
  onComplete: (taskId: string, evidencePhotoBase64: string) => void;
}

export function CompleteTaskModal({ task, onClose, onComplete }: CompleteTaskModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. O limite máximo é 10MB.");
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert("Formato não suportado. Por favor, envie uma imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setPhoto(dataUrl);
          } else {
            setPhoto(reader.result as string); // fallback
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleComplete = () => {
    if (!photo) return;
    onComplete(task.id, photo);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white text-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50/50">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Concluir Atividade
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="text-center">
            <p className="text-slate-600 mb-1">Para marcar a atividade:</p>
            <h3 className="font-semibold text-slate-900 text-lg">"{task.title}"</h3>
            <p className="text-slate-600 mt-1">como concluída, por favor anexe uma foto como comprovação.</p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            {photo ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-full shadow-sm backdrop-blur-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors text-slate-500"
              >
                <div className="p-3 bg-white text-slate-900 rounded-full shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="font-medium text-sm">Clique para enviar a foto</span>
                  <span className="text-xs opacity-70">JPEG, PNG ou WEBP até 10MB</span>
                </div>
              </button>
            )}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg, image/png, image/webp"
              className="hidden"
            />
          </div>
          
          <div className="mt-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleComplete}
              disabled={!photo}
              className="px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar como Concluída
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
