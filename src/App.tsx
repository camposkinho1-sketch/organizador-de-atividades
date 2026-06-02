import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, Clock, Calendar as CalendarIcon, User, AlertCircle, Settings, GraduationCap, Menu, X, LogOut, Book, Paperclip, FileIcon, ImageIcon, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleManager, DaySchedule, defaultSchedule } from './components/ScheduleManager';
import { GradesManager } from './components/GradesManager';
import { PortfolioManager } from './components/PortfolioManager';
import { EditTaskModal } from './components/EditTaskModal';
import { AppLogo } from './components/Logo';
import { useSyncState } from './lib/useSync';
import { useAuth } from './lib/AuthContext';
import { auth } from './lib/firebase';

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
  status: 'pending' | 'completed';
  googleTaskId?: string;
  googleTaskListId?: string;
  notes?: string;
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
  const [attachment, setAttachment] = useState<{file: File, base64: string} | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [schedule, setSchedule] = useSyncState<DaySchedule[]>('guardiao_schedule', defaultSchedule, 'schedule_data');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, googleAccessToken, signIn, logOut } = useAuth();

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

  // Sync from Google Tasks on load or token change
  useEffect(() => {
    const fetchGoogleTasks = async () => {
      if (!googleAccessToken) return;
      try {
        const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        if (!listsRes.ok) return;
        const listsData = await listsRes.json();
        const taskListId = listsData.items[0]?.id;
        if (!taskListId) return;

        const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        });
        if (!tasksRes.ok) return;
        const tasksData = await tasksRes.json();
        const gTasks = tasksData.items || [];

        setTasks(prev => prev.map(localTask => {
          if (!localTask.googleTaskId) return localTask;
          const remoteTask = gTasks.find((g: any) => g.id === localTask.googleTaskId);
          if (remoteTask) {
             const remoteCompleted = remoteTask.status === 'completed';
             // Also could sync date/time from remote if it changed, but let's just sync completion for now,
             // or sync title too.
             const newStatus = remoteCompleted ? 'completed' : 'pending';
             if (localTask.status !== newStatus || localTask.title !== remoteTask.title) {
                return { ...localTask, status: newStatus, title: remoteTask.title || localTask.title };
             }
          }
          return localTask;
        }));
      } catch (err) {
        console.error("Error fetching google tasks:", err);
      }
    };
    fetchGoogleTasks();
  }, [googleAccessToken]);

  const updateGoogleTask = async (taskId: string, listId: string, updates: any) => {
    if (!googleAccessToken) return;
    try {
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error("Failed to update google task:", err);
    }
  };

  const syncToGoogleTasks = async (title: string, date: string, time: string, notes?: string) => {
    if (!googleAccessToken) return { success: false, message: 'Google Tasks desconectado' };
    
    try {
      // 1. Get default list ID
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (!listsRes.ok) {
        const errorText = await listsRes.text();
        console.error("Erro na API Tasks:", errorText);
        if (listsRes.status === 401) {
          throw new Error('Acesso expirado. Por favor, conecte-se com o Google novamente.');
        }
        if (listsRes.status === 403) {
          throw new Error('A API do Google Tasks NÃO ESTÁ ATIVADA. Você precisa acessar o Google Cloud Console do seu projeto Firebase e ativar a "Google Tasks API" para funcionar.');
        }
        throw new Error('Não foi possível obter listas do Google Tasks');
      }
      const listsData = await listsRes.json();
      const taskListId = listsData.items[0].id;
      
      // 2. Create task
      // Date must be RFC 3339 timestamp string
      const due = formatRFC3339Local(date, time);
      const createRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          due,
          notes: `⏰ Horário: ${time}\n${notes || 'Agendado pelo Guardião Estudantil'}`
        })
      });
      
      if (!createRes.ok) throw new Error('Erro ao criar task no Google Tasks');
      const createData = await createRes.json();
      return { success: true, message: 'Sucesso', taskId: createData.id, listId: taskListId };
    } catch (error: any) {
      console.error("syncToGoogleTasks error:", error);
      return { success: false, message: error.message };
    }
  };

  const handleCreateTask = async (args: any) => {
    let googleTaskId = undefined;
    let googleTaskListId = undefined;
    let googleSyncMsg = '';
    
    if (googleAccessToken) {
      const result = await syncToGoogleTasks(args.title, args.date, args.time, args.notes);
      if (result.success) {
         googleSyncMsg = ' (Sincronizado com Google Tasks)';
         googleTaskId = result.taskId;
         googleTaskListId = result.listId;
      } else {
         googleSyncMsg = ` (ATENÇÃO: Falha ao sincronizar: ${result.message})`;
      }
    } else {
      googleSyncMsg = ' (Não sincronizado: Google Tasks desconectado)';
    }

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: args.title,
      date: args.date,
      time: args.time,
      status: 'pending',
      notes: args.notes,
      googleTaskId,
      googleTaskListId
    };
    setTasks(prev => [...prev, newTask]);

    return { success: true, message: `Tarefa '${args.title}' agendada para ${args.date} às ${args.time}.${googleSyncMsg}` };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMsg = input.trim() || 'Processar arquivo anexo';
    setInput('');
    const currentAttachment = attachment;
    setAttachment(null);
    
    let displayMessage = userMsg;
    if (currentAttachment) {
      displayMessage += `\n[Anexo: ${currentAttachment.file.name}]`;
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

      if (currentAttachment) {
        bodyData.attachment = {
          name: currentAttachment.file.name,
          type: currentAttachment.file.type,
          data: currentAttachment.base64
        };
      }

      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o servidor');
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
        const secondResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
           }
        } else {
           throw new Error('Falha ao comunicar com o servidor (segunda etapa)');
        }
      } else if (responseData.text) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: responseData.text }]);
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

  const toggleTaskCompletion = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    if (task.googleTaskId && task.googleTaskListId) {
      updateGoogleTask(task.googleTaskId, task.googleTaskListId, { status: newStatus === 'completed' ? 'completed' : 'needsAction' });
    }
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Attempt delete in Google Tasks
    if (task?.googleTaskId && task?.googleTaskListId && googleAccessToken) {
      fetch(`https://tasks.googleapis.com/tasks/v1/lists/${task.googleTaskListId}/tasks/${task.googleTaskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      }).catch(err => console.error(err));
    }
  };

  const restoreTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'pending' } : t
    ));

    if (task.googleTaskId && task.googleTaskListId) {
      updateGoogleTask(task.googleTaskId, task.googleTaskListId, { status: 'needsAction' });
    }
  };

  const handleEditTaskSave = (taskId: string, newTitle: string, newDate: string, newTime: string, newNotes: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, title: newTitle, date: newDate, time: newTime, notes: newNotes } : t
    ));
    setEditingTask(null);

    if (task.googleTaskId && task.googleTaskListId) {
      const due = formatRFC3339Local(newDate, newTime);
      updateGoogleTask(task.googleTaskId, task.googleTaskListId, { 
        title: newTitle, 
        due, 
        notes: `⏰ Horário: ${newTime}\n${newNotes || 'Agendado pelo Guardião Estudantil'}`
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Arquivo muito grande. O limite máximo é 5MB.");
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert("Formato não suportado. Por favor, envie uma imagem ou PDF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachment({ file, base64: reader.result });
      }
    };
    reader.readAsDataURL(file);
    
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden" onClickCapture={handleAppClick}>
      
      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setShowMobileSidebar(false)} 
        />
      )}

      {/* Sidebar: Simulated Google Tasks */}
      <div className={`w-80 bg-white border-r border-slate-200 shadow-2xl md:shadow-sm flex-col z-50 md:z-10 absolute md:relative inset-y-0 left-0 transform transition-transform duration-300 ease-in-out ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex`}>
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <CheckCircle className="text-blue-600 w-6 h-6" />
                Suas Tarefas
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-blue-600/80">Sincronizado</p>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              </div>
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden p-2 text-slate-500 hover:bg-blue-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {googleAccessToken ? (
            <button 
              onClick={logOut}
              className="text-xs font-semibold bg-white border border-red-200 text-red-600 py-2 px-3 rounded-lg shadow-sm hover:bg-red-50 transition-colors w-full flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta Google
            </button>
          ) : (
            <button 
              onClick={signIn}
              className="text-xs font-semibold bg-white border border-blue-200 text-blue-700 py-2 px-3 rounded-lg shadow-sm hover:bg-blue-50 transition-colors w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
              </svg>
              Conectar com Google Tasks
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {tasks.filter(t => t.status !== 'completed').length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <CheckCircle className="w-12 h-12 stroke-1 text-slate-300" />
              <p className="text-center text-sm px-4">Todas as tarefas foram concluídas ou nenhuma foi agendada.</p>
            </div>
          ) : (
            <AnimatePresence>
              {tasks.filter(t => t.status !== 'completed').map(task => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={task.id}
                  className="p-4 rounded-xl border transition-all duration-200 bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200 flex justify-between items-start group"
                >
                  <div className="flex items-start gap-3 cursor-pointer flex-1" onClick={() => toggleTaskCompletion(task.id)}>
                    <div className="mt-0.5 rounded-full flex-shrink-0 w-5 h-5 flex items-center justify-center border transition-colors border-slate-300 group-hover:border-green-500">
                    </div>
                    <div>
                      <h3 className="font-medium text-sm transition-all text-slate-800">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {task.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {task.time}
                        </span>
                      </div>
                      {task.notes && (
                        <p className="mt-2 text-xs text-slate-500 whitespace-pre-wrap leading-relaxed border-l-2 border-blue-200 pl-2">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Editar Atividade"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => setShowPortfolio(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors border border-indigo-100 shadow-sm"
          >
            <Book className="w-5 h-5" />
            Caderno de Atividades
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
        <header className="px-4 md:px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10 w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative flex-shrink-0">
              <AppLogo className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm sm:text-base md:text-lg truncate">Guardião Estudantil</h1>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="truncate">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button 
              onClick={() => setShowGrades(true)}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent rounded-lg transition-colors text-sm font-medium"
              title="Boletim"
            >
              <BoletimIcon className="w-5 h-5 text-blue-600 font-bold" />
              <span className="hidden sm:inline">Boletim</span>
            </button>
            <button 
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-2 px-2 md:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
              title="Editar Grade"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Grade</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-sm text-yellow-800 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-yellow-600" />
              <p>Simulador Ativado: Crie tarefas (ex: "Tenho atividade de Química") e veja a IA agendar automaticamente na sua barra lateral.</p>
            </div>

            {messages.map((message) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={message.id} 
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-slate-200 text-slate-600' 
                    : 'bg-amber-100 text-amber-700 border border-amber-300'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <GraduationCap className="w-6 h-6" />}
                </div>
                
                <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                }`}>
                  <div className="whitespace-pre-wrap format-tags">
                    {/* Basic markdown formatting since we aren't using a library yet */}
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={i !== 0 ? 'mt-2' : ''}>
                        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className={message.role === 'user' ? 'text-white font-bold' : 'text-slate-900 font-bold'}>{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 flex-row">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-700 border border-amber-300">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 w-full z-10 sticky bottom-0 flex flex-col items-center">
          {attachment && (
            <div className="max-w-3xl w-full mb-3 flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-blue-100 p-2 rounded-md text-blue-700">
                  {attachment.file.type.startsWith('image/') ? <ImageIcon className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                </div>
                <div className="truncate text-sm font-medium text-slate-700">
                  {attachment.file.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="max-w-3xl w-full mx-auto relative flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded-full transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ex: Tenho um trabalho de Química para entregar..."
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-full py-4 pl-14 pr-14 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
            <button 
              type="submit" 
              disabled={(!input.trim() && !attachment) || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-slate-500 flex justify-center items-center gap-2">
             <span>Funciona com Google Gemini (Lê Imagens e PDF)</span>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {showSchedule && (
          <ScheduleManager 
            schedule={schedule} 
            setSchedule={setSchedule} 
            onClose={() => setShowSchedule(false)} 
          />
        )}
        {showGrades && (
          <GradesManager 
            schedule={schedule} 
            onClose={() => setShowGrades(false)} 
          />
        )}
        {showPortfolio && (
          <PortfolioManager
            schedule={schedule}
            tasks={tasks}
            onClose={() => setShowPortfolio(false)}
            onDeleteTask={deleteTask}
            onRestoreTask={restoreTask}
          />
        )}
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={handleEditTaskSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
