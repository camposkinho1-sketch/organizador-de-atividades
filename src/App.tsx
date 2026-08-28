import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, Clock, Calendar as CalendarIcon, User, AlertCircle, Settings, GraduationCap, Menu, X, LogOut, Book, Paperclip, FileIcon, ImageIcon, Edit2, Key, Trash2, Eraser, Save, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleManager, DaySchedule, defaultSchedule } from './components/ScheduleManager';
import { GradesManager, GradesConfig, defaultGradesConfig, createEmptyUnit } from './components/GradesManager';
import { PortfolioManager } from './components/PortfolioManager';
import { EditTaskModal } from './components/EditTaskModal';
import { CompleteTaskModal } from './components/CompleteTaskModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { DataBackupModal } from './components/DataBackupModal';
import { AppLogo } from './components/Logo';
import { useSyncState } from './lib/useSync';
import { useAuth } from './lib/AuthContext';
import { auth, db } from './lib/firebase';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { playMessageSent, playMessageReceived, playTaskCompleted, playTaskAdded, playClick } from './lib/audio';

import { BoletimIcon } from './components/BoletimIcon';

// --- Types ---
type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

export type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'pending' | 'completed' | 'needsAction';
  googleTaskId?: string;
  googleTaskListId?: string;
  googleEventId?: string;
  notes?: string;
  evidencePhotoBase64?: string;
  unitIndex?: number;
};

// We explicitely pass history to server.

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Olá! Eu sou o **Guardião da Segurança do Trabalho**, seu assistente acadêmico de alta performance. Posso te ajudar a organizar seus trabalhos e garantir que você nunca perca um prazo. Qual é a sua próxima atividade?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useSyncState<Task[]>('guardiao_tasks', [], 'tasks_data');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showDataBackup, setShowDataBackup] = useState(false);
  const [attachments, setAttachments] = useState<{file: File, base64: string}[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteUnlocked, setIsDeleteUnlocked] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [schedule, setSchedule] = useSyncState<DaySchedule[]>('guardiao_schedule', defaultSchedule, 'schedule_data');
  const [gradesConfig, setGradesConfig] = useSyncState<GradesConfig>('guardiao_grades', defaultGradesConfig, 'grades_data');
  const [syncedApiKey] = useSyncState<string>('custom_api_key', '', 'api_key_data');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, googleAccessToken, signIn, logOut } = useAuth();

  const getTasksByDate = () => {
    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const grouped = activeTasks.reduce((acc, task) => {
      let d = task.date || 'Sem data';
      if (!acc[d]) acc[d] = [];
      acc[d].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    return Object.keys(grouped).sort((a, b) => {
      if (a === 'Sem data') return 1;
      if (b === 'Sem data') return -1;
      // Convert to Date objects to compare properly
      const [yA, mA, dA] = a.split('-');
      const [yB, mB, dB] = b.split('-');
      const dateA = new Date(parseInt(yA), parseInt(mA) - 1, parseInt(dA));
      const dateB = new Date(parseInt(yB), parseInt(mB) - 1, parseInt(dB));
      return dateA.getTime() - dateB.getTime();
    }).map(date => {
      // Format date nicely
      let formattedDate = date;
      if (date !== 'Sem data') {
        const [y, m, d] = date.split('-');
        const taskDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = taskDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 0) formattedDate = 'Hoje';
        else if (diffDays === 1) formattedDate = 'Amanhã';
        else if (diffDays === -1) formattedDate = 'Ontem (Atrasado)';
        else if (diffDays < -1) formattedDate = `Atrasado há ${Math.abs(diffDays)} dias`;
        else formattedDate = `${d}/${m}/${y}`;
      }
      return { dateKey: date, label: formattedDate, tasks: grouped[date] };
    });
  };

  const renderTask = (task: Task) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={task.id}
      className="p-3 sm:p-4 bg-[#27272a] border-2 border-white shadow-[4px_4px_0px_white] transition-all duration-200 flex flex-col sm:flex-row sm:justify-between sm:items-start group gap-3 sm:gap-0"
    >
      <div className="flex items-start gap-3 cursor-pointer flex-1 min-w-0" onClick={() => toggleTaskCompletion(task.id)}>
        <div className="mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center border-2 transition-colors border-white group-hover:bg-[#a3e635]">
        </div>
        <div className="min-w-0 flex-1 w-full">
          <h3 className="font-bold text-sm text-white uppercase break-words break-all sm:break-normal">
            {task.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-bold text-zinc-400">
            <span className="flex items-center gap-1 shrink-0">
              <CalendarIcon className="w-3.5 h-3.5" />
              {task.date}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {task.time}
            </span>
          </div>
          {task.notes && (
            <p className="mt-2 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed border-l-4 border-[#3b82f6] pl-2 font-mono break-words break-all sm:break-normal">
              {task.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-1 sm:ml-2 flex-shrink-0 justify-end sm:justify-start w-full sm:w-auto border-t-2 border-zinc-700 sm:border-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
        <button
          onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
          className="flex-1 sm:flex-none flex justify-center items-center p-2 text-zinc-400 hover:text-white border-2 border-transparent hover:border-white hover:bg-[#3b82f6] transition-colors sm:opacity-0 sm:group-hover:opacity-100 bg-[#3f3f46] sm:bg-transparent"
          title="Editar Atividade"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); promptDeleteTask(task.id); }}
          className="flex-1 sm:flex-none flex justify-center items-center p-2 text-zinc-400 hover:text-white border-2 border-transparent hover:border-white hover:bg-[#ef4444] transition-colors sm:opacity-0 sm:group-hover:opacity-100 bg-[#3f3f46] sm:bg-transparent"
          title="Excluir Atividade"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to format date and time safely as RFC 3339 in local timezone
  // Prevents tasks from having shifts of 3+ hours incorrectly by ensuring offset is explicit.
  const formatRFC3339Local = (dateStr: string, timeStr: string) => {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    const tzo = -d.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const tzh = pad(Math.floor(Math.abs(tzo) / 60));
    const tzm = pad(Math.abs(tzo) % 60);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${dif}${tzh}:${tzm}`;
  };

  // Sync to Google Calendar
  const syncToGoogleCalendar = async (title: string, date: string, time: string, notes?: string) => {
    if (!googleAccessToken) return { success: false, message: 'Google desconectado' };
    
    try {
      let googleEventId = undefined;

      const tzoString = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startDate = new Date(`${date}T${time}:00`);
      const endDate = new Date(startDate.getTime() + 30 * 60000);
      
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const tzo = -startDate.getTimezoneOffset();
      const dif = tzo >= 0 ? '+' : '-';
      const tzh = pad(Math.floor(Math.abs(tzo) / 60));
      const tzm = pad(Math.abs(tzo) % 60);
      const tzStringLocal = `${dif}${tzh}:${tzm}`;

      const formatRFC = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${tzStringLocal}`;
      
      const eventStartDue = formatRFC(startDate);
      const endDue = formatRFC(endDate);

      // --- Sincronizar com Google Agenda ---
      const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 
           Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: title,
          description: `${notes || 'Agendado pelo Guardião Estudantil'}`,
          start: { dateTime: eventStartDue, timeZone: tzoString },
          end: { dateTime: endDue, timeZone: tzoString },
          reminders: { 
            useDefault: false, 
            overrides: [
              { method: 'popup', minutes: 10 },
              { method: 'popup', minutes: 0 }
            ] 
           }
        })
      });

      if (eventRes.ok) {
        const eventData = await eventRes.json();
        googleEventId = eventData.id;
      } else {
        const errorText = await eventRes.text();
        console.error("Erro na API Calendar:", errorText);
        if (eventRes.status === 401 || eventRes.status === 403) {
          throw new Error('Acesso negado. Ative a "Google Calendar API" no console do Google Cloud do Firebase. Se já ativou, clique no botão para deslogar do Google no App e faça login de novo para liberar os acessos do calendário.');
        }
        throw new Error(`Erro no Google Calendar: ${eventRes.status} - ${errorText}`);
      }

      return { success: true, message: 'Sucesso', taskId: undefined, listId: undefined, eventId: googleEventId };

    } catch (error: any) {
      console.error("syncToGoogleCalendar error:", error);
      return { success: false, message: error.message };
    }
  };

  const handleCreateTask = async (args: any) => {
    let googleTaskId = undefined;
    let googleTaskListId = undefined;
    let googleEventId = undefined;
    let googleSyncMsg = '';
    
    if (googleAccessToken) {
      const result = await syncToGoogleCalendar(args.title, args.date, args.time, args.notes);
      if (result.success) {
         googleSyncMsg = ' (Sincronizado com o Google Agenda)';
         googleEventId = result.eventId;
      } else {
         googleSyncMsg = ` (ATENÇÃO: Falha ao sincronizar: ${result.message})`;
      }
    } else {
      googleSyncMsg = ' (Não sincronizado: Google desconectado)';
    }

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: args.title,
      date: args.date,
      time: args.time,
      status: 'pending',
      notes: args.notes,
      googleTaskId,
      googleTaskListId,
      googleEventId
    };
    setTasks(prev => [...prev, newTask]);
    playTaskAdded();

    return { success: true, message: `Evento '${args.title}' agendado para ${args.date} às ${args.time}.${googleSyncMsg}` };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    if (input.trim() === '4D032D2') {
      setIsDeleteUnlocked(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: 'Acesso Administrativo Temporário concedido: Opção de excluir conta desbloqueada. Você pode encontrá-la no menu lateral inferior.' }]);
      setInput('');
      return;
    }

    const userMsg = input.trim() || 'Processar arquivo' + (attachments.length > 1 ? 's anexos' : ' anexo');
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    
    let displayMessage = userMsg;
    if (currentAttachments.length > 0) {
      displayMessage += `\n[Anexos: ${currentAttachments.map(a => a.file.name).join(', ')}]`;
    }
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: displayMessage }]);
    setIsLoading(true);

    try {
      const historyFormatted = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const bodyData: any = {
        history: historyFormatted,
        message: userMsg,
        schedule
      };

      if (currentAttachments.length > 0) {
        bodyData.attachments = currentAttachments.map(att => ({
          name: att.file.name,
          type: att.file.type,
          data: att.base64
        }));
      }

      playMessageSent();

      const requestHeaders: any = { 'Content-Type': 'application/json' };
      if (syncedApiKey) {
        requestHeaders['x-api-key'] = syncedApiKey;
      }

      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao comunicar com o servidor');
      }

      const responseData = await response.json();
      
      // Check if function was called
      if (responseData.functionCalls && responseData.functionCalls.length > 0) {
        let functionResponseParts: any[] = [];
        
        for (const call of responseData.functionCalls) {
          if (call.name === 'create_task') {
            const result = await handleCreateTask(call.args);
            functionResponseParts.push({
              functionResponse: {
                name: call.name,
                response: result,
                id: call.id
              }
            });
          }
        }
        
        // Send function results back to the model to get the final text response
        const requestHeaders: any = { 'Content-Type': 'application/json' };
        if (syncedApiKey) {
          requestHeaders['x-api-key'] = syncedApiKey;
        }

        const secondResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify({
             history: [...historyFormatted, { role: 'user', parts: [{ text: userMsg }] }, { role: 'model', parts: [{ functionCall: responseData.functionCalls[0] }] }],
             message: functionResponseParts,
             schedule
          })
        });

        if (secondResponse.ok) {
           const secondData = await secondResponse.json();
           if (secondData.text) {
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: secondData.text }]);
             playMessageReceived();
           }
        } else {
           const errData = await secondResponse.json().catch(() => ({}));
           throw new Error(errData.error || 'Falha ao comunicar com o servidor (segunda etapa)');
        }
      } else if (responseData.text) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: responseData.text }]);
        playMessageReceived();
      }
    } catch (error: any) {
      console.error("Error communicating with Gemini:", error);
      let errorMessage = 'Desculpe, ocorreu um erro de conexão. Tente novamente.';
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: errorMessage 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTaskWithEvidence = (taskId: string, evidencePhotoBase64: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed', evidencePhotoBase64 } : t
    ));
    
    playTaskCompleted();
    setCompletingTask(null);
  };

  const handleCompleteEvaluationTask = (task: Task) => {
    // Determine subject and evaluation name
    const match = task.title.match(/^\[(.*?)\]\s*-\s*\[?(.*?)\]?$/);
    const subjectName = match ? match[1].trim() : "Geral";
    const evalName = match ? match[2].trim() : task.title;

    let unitIndex = 0;
    if (task.notes) {
      const unitMatch = task.notes.match(/(\d+)[ªa]?\s*unidade/i) || task.notes.match(/unidade\s*(\d+)/i);
      if (unitMatch && unitMatch[1]) {
        unitIndex = parseInt(unitMatch[1]) - 1;
      }
    }
    if (unitIndex < 0) unitIndex = 0;
    // Cap unitIndex based on current config safely.
    // If somehow config.numberOfUnits is not set, use 4 as default limit.
    const maxUnits = gradesConfig?.numberOfUnits || 4;
    if (unitIndex >= maxUnits) unitIndex = maxUnits - 1;

    // Add to Boletim
    setGradesConfig(prev => {
      const newGrades = { ...prev.grades };
      let subject = newGrades[subjectName];
      if (!subject) {
        subject = {
          subjectName,
          units: Array(prev.numberOfUnits || 4).fill(null).map(createEmptyUnit)
        };
      } else {
        // Deep clone units
        subject = { ...subject, units: subject.units.map(u => ({ ...u, evaluations: u.evaluations ? [...u.evaluations] : [] })) };
      }

      // Ensure unit object exists
      if (!subject.units[unitIndex]) {
         subject.units[unitIndex] = createEmptyUnit();
      }
      const unit = subject.units[unitIndex];
      
      unit.useEvaluations = true;
      unit.evaluations.push({
        id: Math.random().toString(36).substr(2, 9),
        name: evalName,
        grade: null, 
        weight: 1
      });
      subject.units[unitIndex] = unit;
      newGrades[subjectName] = subject;
      
      return { ...prev, grades: newGrades };
    });

    // Mark as completed so it exits the list
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, status: 'completed' } : t
    ));
    
    playTaskCompleted();
  };

  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.status !== 'completed') {
      const isEvaluation = /teste|prova|avalia[çc][ãa]o|avaliativa/i.test(task.title);
      if (isEvaluation) {
        handleCompleteEvaluationTask(task);
      } else {
        setCompletingTask(task);
      }
    } else {
      // Revert to pending
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'pending', evidencePhotoBase64: undefined } : t
      ));
    }
  };

  const promptDeleteTask = (taskId: string) => {
    playClick();
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    if (task && googleAccessToken) {
      // Attempt delete in Google Calendar
      if (task.googleEventId) {
        fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.googleEventId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }).catch(err => console.error(err));
      }
    }
  };

  const restoreTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'pending' } : t
    ));
  };

  const updateTaskPartial = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const handleEditTaskSave = (taskId: string, newTitle: string, newDate: string, newTime: string, newNotes: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, title: newTitle, date: newDate, time: newTime, notes: newNotes } : t
    ));
    setEditingTask(null);

    const taskDue = formatRFC3339Local(newDate, newTime);

    if (task.googleEventId && googleAccessToken) {
      const tzoString = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startDate = new Date(`${newDate}T${newTime}:00`);
      const endDate = new Date(startDate.getTime() + 30 * 60000);
      
      fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.googleEventId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: newTitle,
          description: `${newNotes || 'Agendado pelo Guardião Estudantil'}`,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() }
        })
      }).catch(err => console.error("Failed to update Google Calendar event:", err));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: {file: File, base64: string}[] = [];

    const processFile = (file: File): Promise<void> => {
      return new Promise((resolve) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`O arquivo ${file.name} é muito grande. O limite máximo é 5MB.`);
          resolve();
          return;
        }

        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

        if (!isImage && !isPdf) {
          alert(`Formato não suportado para o arquivo ${file.name}. Por favor, envie uma imagem ou PDF.`);
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            newAttachments.push({ file, base64: reader.result });
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    };

    Promise.all(files.map(processFile)).then(() => {
      if (newAttachments.length > 0) {
        setAttachments(prev => [...prev, ...newAttachments]);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleAppClick = () => {
    // Se o usuário estiver logado mas o token expirou,
    // intercepta o clique para reconectar silenciosamente, 
    // pois requer uma ação do usuário para abrir o popup.
    if (user && !googleAccessToken) {
      const storedToken = localStorage.getItem('googleAccessToken');
      const expiry = localStorage.getItem('googleAccessTokenExpiry');
      if (!storedToken || !expiry || Date.now() >= parseInt(expiry, 10)) {
         signIn().catch(err => console.log("Silent auto-reconnect failed", err));
      }
    }
  };

  const clearChat = () => {
    playClick();
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        content: 'Olá! Eu sou o **Guardião da Segurança do Trabalho**, seu assistente acadêmico de alta performance. Posso te ajudar a organizar seus trabalhos e garantir que você nunca perca um prazo. Qual é a sua próxima atividade?'
      }
    ]);
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#f4f4f5] font-sans overflow-hidden font-medium" onClickCapture={handleAppClick}>
      
      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setShowMobileSidebar(false)} 
        />
      )}

      {/* Sidebar: Simulated Google Tasks */}
      <div className={`w-[85vw] sm:w-80 md:w-80 bg-[#18181b] border-r-4 border-white flex-col z-50 md:z-10 absolute md:relative inset-y-0 left-0 transform transition-transform duration-300 ease-in-out ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex`}>
        <div className="p-6 border-b-4 border-white flex flex-col gap-4 bg-[#a3e635]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                <CheckCircle className="text-black w-6 h-6" />
                Suas Eventos
              </h2>
              <div className="flex items-center gap-2 mt-1 mb-2">
                <p className="text-sm font-bold text-black">Sincronizado</p>
                <div className="w-2 h-2 rounded-none bg-black"></div>
              </div>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden p-2 text-black border-2 border-black hover:bg-black hover:text-[#a3e635] shadow-[2px_2px_0px_black] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {googleAccessToken ? (
            <button 
              onClick={logOut}
              className="text-xs font-black uppercase bg-[#ef4444] border-2 border-black text-white py-3 px-3 shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta Google
            </button>
          ) : (
            <button 
              onClick={signIn}
              className="text-xs font-black uppercase bg-[#3b82f6] border-2 border-black text-white py-3 px-3 shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
              </svg>
              Conectar com Google Tasks
            </button>
          )}

          {isDeleteUnlocked && user && (
             <button 
               onClick={() => setShowDeleteAccountConfirm(true)}
               className="text-xs font-black uppercase bg-black border-2 border-black text-[#ef4444] py-3 px-3 shadow-[4px_4px_0px_black] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full flex items-center justify-center gap-2 mt-2"
             >
               <ShieldAlert className="w-4 h-4" />
               Excluir Conta
             </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <AnimatePresence>
            {tasks.filter(t => t.status !== 'completed').length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3"
              >
                <CheckCircle className="w-12 h-12 stroke-2 text-zinc-600" />
                <p className="text-center text-sm px-4 font-bold uppercase">Todas as eventos concluídas.</p>
              </motion.div>
            ) : (
              getTasksByDate().map(({ dateKey, label, tasks: dateTasks }) => (
                <div key={dateKey} className="flex flex-col gap-3">
                  <div className="sticky top-0 bg-[#18181b] z-10 py-1">
                    <h3 className={`text-xs font-black uppercase border-b-2 pb-1 ${
                      label.includes('Atrasado') ? 'text-[#ef4444] border-[#ef4444]' : 'text-[#a3e635] border-[#a3e635]'
                    }`}>
                      {label}
                    </h3>
                  </div>
                  {dateTasks.map(task => renderTask(task))}
                </div>
              ))
            )}
          </AnimatePresence>
        </div>
        {/* Mobile Menu Action Buttons */}
        <div className="p-4 border-t-4 border-white bg-[#18181b] flex flex-row justify-between gap-2 md:hidden">
            <button 
              onClick={() => { playClick(); setShowGrades(true); setShowMobileSidebar(false); }}
              className="flex-1 flex items-center justify-center bg-[#18181b] border-2 border-white text-white py-3 px-2 transition-all shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-[#a3e635] hover:text-black"
              title="Ver Boletim"
            >
              <BoletimIcon className="w-5 h-5 font-bold" />
            </button>
            <button 
              onClick={() => { playClick(); setShowSchedule(true); setShowMobileSidebar(false); }}
              className="flex-1 flex items-center justify-center bg-[#18181b] border-2 border-white text-white py-3 px-2 transition-all shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-[#ec4899]"
              title="Grade de Horários"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { playClick(); setShowDataBackup(true); setShowMobileSidebar(false); }}
              className="flex-1 flex items-center justify-center bg-[#18181b] border-2 border-white text-[#a3e635] py-3 px-2 transition-all shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-[#a3e635] hover:text-black"
              title="Backup e Dados"
            >
              <Save className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { playClick(); setShowApiSettings(true); setShowMobileSidebar(false); }}
              className="flex-1 flex items-center justify-center bg-[#18181b] border-2 border-white text-white py-3 px-2 transition-all shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-[#3b82f6]"
              title="Chave API"
            >
              <Key className="w-5 h-5" />
            </button>
            <button 
              onClick={() => { clearChat(); setShowMobileSidebar(false); }}
              className="flex-1 flex items-center justify-center bg-[#18181b] border-2 border-white text-white py-3 px-2 transition-all shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none hover:bg-[#ef4444]"
              title="Limpar Chat"
            >
              <Eraser className="w-5 h-5" />
            </button>
        </div>

        <div className="p-4 border-t-4 border-white bg-[#18181b]">
          <button 
            onClick={() => { setShowPortfolio(true); setShowMobileSidebar(false); }}
            className="w-full flex items-center justify-center gap-2 bg-[#ec4899] border-2 border-white text-white py-3 px-4 text-sm font-black uppercase transition-all shadow-[4px_4px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
          >
            <Book className="w-5 h-5" />
            Caderno de Ativ.
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#09090b] relative min-w-0">
        <header className="px-4 md:px-6 py-4 bg-[#18181b] border-b-4 border-white shadow-[0_4px_0_0_white] flex items-center justify-between sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-2 -ml-2 text-white hover:bg-[#3b82f6] border border-transparent hover:border-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative flex-shrink-0">
              <AppLogo className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-white uppercase tracking-wider text-sm sm:text-base md:text-lg truncate">Guardião Estudantil</h1>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#a3e635]">
                <span className="w-2 h-2 bg-[#a3e635] animate-pulse"></span>
                <span className="truncate">Online</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button 
              onClick={clearChat}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-[#18181b] border-2 border-white text-white hover:bg-[#ef4444] transition-colors text-sm font-bold uppercase shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              title="Limpar Chat"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
            <button 
              onClick={() => { playClick(); setShowApiSettings(true); }}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-[#18181b] border-2 border-white text-white hover:bg-[#3b82f6] transition-colors text-sm font-bold uppercase shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              title="Configurar Chave API"
            >
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">Chave</span>
            </button>
            <button 
              onClick={() => { playClick(); setShowGrades(true); }}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-[#18181b] border-2 border-white text-white hover:bg-[#a3e635] hover:text-black transition-colors text-sm font-bold uppercase shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              title="Boletim"
            >
              <BoletimIcon className="w-5 h-5 font-bold" />
              <span className="hidden sm:inline">Boletim</span>
            </button>
            <button 
              onClick={() => { playClick(); setShowSchedule(true); }}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-[#18181b] border-2 border-white text-white hover:bg-[#ec4899] transition-colors text-sm font-bold uppercase shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              title="Editar Grade"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Grade</span>
            </button>
            <button 
              onClick={() => { playClick(); setShowDataBackup(true); }}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-[#18181b] border-2 border-white text-[#a3e635] hover:bg-[#a3e635] hover:text-black transition-colors text-sm font-bold uppercase shadow-[2px_2px_0px_white] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              title="Backup e Recuperação"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Dados</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            
            <div className="bg-[#a3e635] border-2 border-white p-4 flex gap-3 text-black shadow-[4px_4px_0px_white]">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-black" />
              <p className="font-bold">Simulador Ativado: Crie eventos (ex: "Tenho atividade de Química") e veja a IA agendar automaticamente na sua barra lateral.</p>
            </div>

            {messages.map((message) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={message.id} 
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 border-2 border-white shadow-[2px_2px_0px_white] ${
                  message.role === 'user' 
                    ? 'bg-[#ec4899] text-white' 
                    : 'bg-[#3b82f6] text-white'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <GraduationCap className="w-6 h-6" />}
                </div>
                
                <div className={`max-w-[85%] md:max-w-[75%] p-4 border-2 border-white shadow-[4px_4px_0px_white] ${
                  message.role === 'user' 
                    ? 'bg-[#ec4899] text-white' 
                    : 'bg-[#27272a] text-white'
                }`}>
                  <div className="whitespace-pre-wrap format-tags font-mono text-sm leading-relaxed">
                    {/* Basic markdown formatting since we aren't using a library yet */}
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={i !== 0 ? 'mt-2' : ''}>
                        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="text-[#a3e635] font-black">{part.slice(2, -2)}</strong>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 flex-row">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-[#3b82f6] text-white border-2 border-white shadow-[2px_2px_0px_white]">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="bg-[#27272a] border-2 border-white p-4 shadow-[4px_4px_0px_white] flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#a3e635] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#a3e635] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#a3e635] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 bg-[#18181b] border-t-4 border-white w-full z-10 sticky bottom-0 flex flex-col items-center">
          {attachments.length > 0 && (
            <div className="max-w-3xl w-full mb-3 flex flex-wrap gap-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#3b82f6] border-2 border-white p-2 shadow-[2px_2px_0px_white]">
                  <div className="flex items-center gap-2 overflow-hidden max-w-[150px] sm:max-w-[200px]">
                    <div className="text-white">
                      {att.file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileIcon className="w-4 h-4" />}
                    </div>
                    <div className="truncate text-xs font-bold text-white uppercase">
                      {att.file.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="ml-2 p-1 text-white hover:text-[#ef4444] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={sendMessage} className="max-w-3xl w-full mx-auto relative flex items-center">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ex: Tenho um trabalho de Química..."
              disabled={isLoading}
              className="w-full bg-[#27272a] border-2 border-white text-white font-mono py-3 md:py-4 pl-12 pr-14 outline-none focus:ring-0 focus:shadow-[inset_4px_4px_0px_rgba(255,255,255,0.1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0px_white] text-sm md:text-base"
            />
            <button 
              type="submit" 
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-[#a3e635] text-black border-2 border-white hover:translate-x-[1px] hover:translate-y-[1px] disabled:bg-zinc-600 disabled:text-zinc-400 transition-all shadow-[2px_2px_0px_white] hover:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-zinc-400 font-mono flex justify-center items-center gap-2">
             <span>Funciona com Google Gemini (Lê Imagens e PDF)</span>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showSchedule && (
          <motion.div key="schedule" className="contents">
            <ScheduleManager 
              schedule={schedule} 
              setSchedule={setSchedule} 
              onClose={() => setShowSchedule(false)} 
            />
          </motion.div>
        )}
        {showGrades && (
          <motion.div key="grades" className="contents">
            <GradesManager 
              schedule={schedule} 
              onClose={() => setShowGrades(false)} 
            />
          </motion.div>
        )}
        {showPortfolio && (
          <motion.div key="portfolio" className="contents">
            <PortfolioManager
              schedule={schedule}
              tasks={tasks}
              onClose={() => setShowPortfolio(false)}
              onDeleteTask={promptDeleteTask}
              onRestoreTask={restoreTask}
              onUpdateTask={updateTaskPartial}
            />
          </motion.div>
        )}
        {showApiSettings && (
          <motion.div key="api-settings" className="contents">
            <ApiSettingsModal onClose={() => setShowApiSettings(false)} />
          </motion.div>
        )}

        {showDataBackup && (
          <motion.div key="data-backup" className="contents">
            <DataBackupModal onClose={() => setShowDataBackup(false)} />
          </motion.div>
        )}

        {showDeleteAccountConfirm && (
          <motion.div 
            key="delete-account-modal"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#18181b] border-4 border-[#ef4444] shadow-[8px_8px_0px_#ef4444] p-6 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-[#ef4444] border-2 border-white text-white shadow-[4px_4px_0px_white] flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase mb-2">Excluir Conta</h3>
              <p className="text-zinc-400 mb-6 font-mono text-sm">Atenção! Esta ação é <span className="text-[#ef4444] font-bold">irreversível</span>. Todos os seus dados, eventos e informações associadas a sua conta serão permanentemente excluídos. Tem certeza que deseja prosseguir?</p>
              <div className="flex flex-col gap-3 sm:gap-4">
                <button
                  onClick={async () => {
                    if (user) {
                      try {
                        await deleteDoc(doc(db, 'user_data', user.uid));
                        await deleteUser(user);
                        alert('Conta excluída com sucesso.');
                        window.location.reload();
                      } catch (error: any) {
                        alert('Erro ao excluir conta. Por razões de segurança, é necessário fazer login recentemente para excluir. Saia da conta, entre novamente e tente outra vez.');
                        console.error(error);
                      }
                    }
                  }}
                  className="px-4 py-3 bg-[#ef4444] border-2 border-white text-white text-sm font-bold uppercase shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full"
                >
                  Confirmar Exclusão
                </button>
                <button
                  onClick={() => setShowDeleteAccountConfirm(false)}
                  className="px-4 py-3 bg-[#27272a] border-2 border-white text-white text-sm font-bold uppercase shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all w-full"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {taskToDelete && (
          <motion.div 
            key="delete-modal"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#18181b] border-4 border-white shadow-[8px_8px_0px_white] p-6 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-[#ef4444] border-2 border-white text-white shadow-[4px_4px_0px_white] flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase mb-2">Excluir Lembrete</h3>
              <p className="text-zinc-400 mb-6 font-mono text-sm">Você tem certeza que deseja excluir este lembrete?</p>
              <div className="flex justify-center gap-3 sm:gap-4">
                <button
                  onClick={() => setTaskToDelete(null)}
                  className="px-2 sm:px-4 py-3 bg-[#27272a] border-2 border-white text-white text-xs sm:text-sm font-bold uppercase shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (taskToDelete) {
                      confirmDeleteTask(taskToDelete);
                    }
                    setTaskToDelete(null);
                  }}
                  className="px-2 sm:px-4 py-3 bg-[#ef4444] border-2 border-white text-white text-xs sm:text-sm font-bold uppercase shadow-[4px_4px_0px_white] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex-1"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {editingTask && (
          <motion.div key="edit-task" className="contents">
            <EditTaskModal
              task={editingTask}
              onClose={() => setEditingTask(null)}
              onSave={handleEditTaskSave}
            />
          </motion.div>
        )}
        {completingTask && (
          <motion.div key="complete-task" className="contents">
            <CompleteTaskModal
              task={completingTask}
              onClose={() => setCompletingTask(null)}
              onComplete={handleCompleteTaskWithEvidence}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
