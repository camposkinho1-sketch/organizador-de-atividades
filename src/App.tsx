import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, Clock, Calendar as CalendarIcon, User, AlertCircle, Settings, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleManager, DaySchedule, defaultSchedule } from './components/ScheduleManager';
import { GradesManager } from './components/GradesManager';
import { AppLogo } from './components/Logo';
import { useSyncState } from './lib/useSync';
import { useAuth } from './lib/AuthContext';

import { BoletimIcon } from './components/BoletimIcon';

// --- Types ---
type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'pending' | 'completed';
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
  const [schedule, setSchedule] = useSyncState<DaySchedule[]>('guardiao_schedule', defaultSchedule, 'schedule_data');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { googleAccessToken, signIn } = useAuth();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const syncToGoogleTasks = async (title: string, date: string, time: string) => {
    if (!googleAccessToken) return { success: false, message: 'Google Tasks desconectado' };
    
    try {
      // 1. Get default list ID
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (!listsRes.ok) {
        const errorText = await listsRes.text();
        console.error("Erro na API Tasks:", errorText);
        if (listsRes.status === 403) {
          throw new Error('A API do Google Tasks NÃO ESTÁ ATIVADA. Você precisa acessar o Google Cloud Console do seu projeto Firebase e ativar a "Google Tasks API" para funcionar.');
        }
        throw new Error('Não foi possível obter listas do Google Tasks');
      }
      const listsData = await listsRes.json();
      const taskListId = listsData.items[0].id;
      
      // 2. Create task
      // Date must be RFC 3339 timestamp string
      const due = new Date(`${date}T${time}:00`).toISOString();
      const createRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          due,
          notes: 'Agendado pelo Guardião da Segurança do Trabalho'
        })
      });
      
      if (!createRes.ok) throw new Error('Erro ao criar task no Google Tasks');
      return { success: true, message: 'Sucesso' };
    } catch (error: any) {
      console.error("syncToGoogleTasks error:", error);
      return { success: false, message: error.message };
    }
  };

  const handleCreateTask = async (args: any) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: args.title,
      date: args.date,
      time: args.time,
      status: 'pending'
    };
    setTasks(prev => [...prev, newTask]);
    
    // Sync to Google
    let googleSyncMsg = '';
    if (googleAccessToken) {
      const result = await syncToGoogleTasks(args.title, args.date, args.time);
      googleSyncMsg = result.success ? ' (Sincronizado com Google Tasks)' : ` (ATENÇÃO: Falha ao sincronizar: ${result.message})`;
    } else {
      googleSyncMsg = ' (Não sincronizado: Google Tasks desconectado)';
    }

    return { success: true, message: `Tarefa '${args.title}' agendada para ${args.date} às ${args.time}.${googleSyncMsg}` };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const historyFormatted = messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyFormatted,
          message: userMsg,
          schedule
        })
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
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar: Simulated Google Tasks */}
      <div className="w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-blue-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <CheckCircle className="text-blue-600 w-6 h-6" />
                Suas Tarefas
              </h2>
              <p className="text-sm text-blue-600/80 mt-1">Sincronizado via Guardião</p>
            </div>
          </div>
          {!googleAccessToken && (
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
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <CheckCircle className="w-12 h-12 stroke-1 text-slate-300" />
              <p className="text-center text-sm px-4">Nenhuma atividade agendada. Informe ao Guardião sobre novas tarefas!</p>
            </div>
          ) : (
            <AnimatePresence>
              {tasks.map(task => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={task.id}
                  onClick={() => toggleTaskCompletion(task.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    task.status === 'completed' 
                      ? 'bg-slate-50 border-slate-200 opacity-60' 
                      : 'bg-white border-blue-100 shadow-sm hover:shadow-md hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full flex-shrink-0 w-5 h-5 flex items-center justify-center border transition-colors ${
                      task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                    }`}>
                      {task.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                    </div>
                    <div>
                      <h3 className={`font-medium text-sm transition-all ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
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
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        <header className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center relative">
              <AppLogo className="w-12 h-12" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg sm:text-base md:text-lg">Guardião da Segurança do Trabalho</h1>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Online e monitorando
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowGrades(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent rounded-lg transition-colors text-sm font-medium"
            >
              <BoletimIcon className="w-5 h-5 text-blue-600 font-bold" />
              <span className="hidden sm:inline">Boletim</span>
            </button>
            <button 
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Editar Grade</span>
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

        <div className="p-4 bg-white border-t border-slate-200 w-full z-10 sticky bottom-0">
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ex: Tenho um trabalho de Química para entregar..."
              disabled={isLoading}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-full py-4 pl-6 pr-14 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-slate-500 flex justify-center items-center gap-2">
             <span>Funciona com Google Gemini</span>
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
      </AnimatePresence>
    </div>
  );
}
