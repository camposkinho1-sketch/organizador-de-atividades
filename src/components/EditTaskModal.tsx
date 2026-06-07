import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Clock, Calendar as CalendarIcon, FileText, Paperclip, Plus, Link, Trash2, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../App';
import { getTaskAttachments, saveTaskAttachment, deleteTaskAttachment, TaskAttachment } from '../lib/attachments';

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, newTitle: string, newDate: string, newTime: string, newNotes: string) => void;
}

export function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [time, setTime] = useState(task.time);
  const [notes, setNotes] = useState(task.notes || '');
  
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    getTaskAttachments(task.id).then(data => {
      if (isMounted) {
        setAttachments(data);
        setIsLoadingAttachments(false);
      }
    });
    return () => { isMounted = false };
  }, [task.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;
    onSave(task.id, title, date, time, notes);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) {
        alert(`O arquivo ${file.name} é muito grande. O limite máximo é 2MB por arquivo para sincronização.`);
        continue;
      }

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf';
            const type = isImage ? 'image' : isPdf ? 'pdf' : 'other';
            
            try {
              const newAttachment = await saveTaskAttachment(task.id, {
                name: file.name,
                type,
                base64: reader.result
              });
              setAttachments(prev => [...prev, newAttachment]);
            } catch (err) {
              console.error("Erro ao salvar anexo", err);
              alert(`Falha ao salvar o anexo ${file.name}.`);
            }
          }
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(file);
      });
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) return;
    
    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const name = newLinkName.trim() || url;
    
    setIsUploading(true);
    try {
      const newAttachment = await saveTaskAttachment(task.id, {
        name,
        type: 'link',
        url
      });
      setAttachments(prev => [...prev, newAttachment]);
      setShowLinkInput(false);
      setNewLinkUrl('');
      setNewLinkName('');
    } catch (err) {
      console.error("Erro ao salvar link", err);
      alert("Falha ao salvar o link.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm("Deseja realmente excluir este anexo?")) return;
    
    try {
      await deleteTaskAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error("Erro ao excluir", err);
      alert("Falha ao excluir o anexo.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50/50 flex-shrink-0">
          <h2 className="font-bold text-slate-800 text-lg">Editar Lembrete</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="edit-task-form" onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Título / Tarefa
              </label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  Data
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Horário
                </label>
                <input 
                  type="time" 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Complemento / Notas
              </label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Adicione detalhes extras para sua tarefa..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
            </div>
          </form>

          {/* Anexos Section */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                Anexos ({isLoadingAttachments ? '...' : attachments.length})
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Link className="w-3.5 h-3.5" />
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Arquivos
                </button>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                  className="hidden"
                />
              </div>
            </div>

            <AnimatePresence>
              {showLinkInput && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-2 overflow-hidden"
                >
                  <input 
                    type="text" 
                    placeholder="URL (ex: https://...)"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  />
                  <input 
                    type="text" 
                    placeholder="Título (opcional)"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-slate-500 px-2 py-1 hover:bg-slate-200 rounded">Cancelar</button>
                    <button type="button" onClick={handleAddLink} disabled={isUploading || !newLinkUrl} className="text-xs text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">Adicionar</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingAttachments ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
            ) : attachments.length === 0 ? (
              <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-sm bg-slate-50">
                Nenhum anexo. Adicione fotos, PDFs ou links.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-blue-200 group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-1.5 rounded-md flex-shrink-0 ${att.type === 'link' ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}>
                        {att.type === 'image' ? <ImageIcon className="w-4 h-4" /> : 
                         att.type === 'link' ? <Link className="w-4 h-4" /> : 
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div className="truncate flex flex-col">
                        <span className="text-sm font-medium text-slate-700 truncate">{att.name}</span>
                        {att.type === 'link' && <span className="text-xs text-slate-400 truncate">{att.url}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {att.type === 'link' ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Abrir link">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <a href={att.base64} download={att.name} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Baixar arquivo">
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                      <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir anexo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            form="edit-task-form"
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
