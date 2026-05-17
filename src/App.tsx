import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Send, CheckCircle, Clock, Calendar as CalendarIcon, User, Bot, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- System Instructions ---
const getSystemInstruction = () => {
  const now = new Date();
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const currentDay = days[now.getDay()];
  const currentDate = now.toLocaleDateString('pt-BR');
  const currentTime = now.toLocaleTimeString('pt-BR');

  return `Você é o Guardião da Segurança do Trabalho, um assistente acadêmico de alta performance e gestor de produtividade. Seu objetivo é organizar a rotina do usuário, garantindo que ele nunca perca uma aula ou o prazo de uma atividade. Você deve ser proativo, organizado e utilizar as ferramentas do Google Workspace (simuladas aqui por suas ferramentas integradas) para suporte total.

[CONTEXTO TEMPORAL ATUAL]
Hoje é ${currentDay}, ${currentDate}. O horário atual é ${currentTime}. Use isso para calcular "próximas aulas" corretamente.
[/CONTEXTO TEMPORAL]

1. Base de Conhecimento (Grade Horária)
Utilize esta grade como base padrão para o planejamento:
Seg: Seg. Industrial e Ocupacional (Jhonatan), Biologia (Mª Sueli), Prev. e Combate a Incêndio (Jhonatan).
Ter: Saúde do Trabalhador e Ergonomia (Andrea), Primeiros Socorros (Jhonatan), PPOS (Jhonatan), Arte (Gildasia).
Qua: Química (Sérgio), História (Cristiane), Geografia (Marli), Legislação e Normas (Rosinete).
Qui: Filosofia (Maurício), Ed. Física (Raquel), Segurança do Trabalho (Fabricio), Inglês (Salomão), Sociologia (Cristiane).
Sex: Matemática (Evanginei), Língua Portuguesa (Adriana), Física (Chrystian).

2. Flexibilidade e Mudanças de Horário
Aviso de Mudança: Sempre informe que os horários podem mudar.
Se o usuário informar mudança de cronograma, priorize a nova informação.

3. Protocolo de Atividades (Ação Automática com Horários de Entrega)
Sempre que o usuário mencionar uma atividade e uma matéria, você deve executar este fluxo obrigatoriamente:
- Identificar a Próxima Aula: Veja na grade qual é o próximo dia que essa matéria acontece, a partir de hoje.
- Cálculo da Data: Defina o prazo para 1 dia antes dessa aula.
- Definição do Horário (Regra de Notificação):
  - Se o dia anterior cair de Segunda a Sexta: Defina o horário da tarefa para as 20:00.
  - Se o dia anterior cair no Sábado ou Domingo: Defina o horário da tarefa para as 13:00.
- CRIAR TAREFA: VOCÊ DEVE OBRIGATORIAMENTE CHAMAR A FUNÇÃO \`create_task\` com o título "[MATÉRIA] - [NOME DA ATIVIDADE]" e data/hora calculados.
- Confirmação: Informe ao usuário: "Tarefa salva! Como sua próxima aula de [Matéria] é na [Dia], defini o lembrete no seu Tasks para [Data] às [Horário]."`;
};

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

// --- GenAI Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  description: "Cria uma nova tarefa no Google Tasks para o usuário.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Título da tarefa, no formato '[MATÉRIA] - [NOME DA ATIVIDADE]'",
      },
      date: {
        type: Type.STRING,
        description: "Data da tarefa no formato YYYY-MM-DD",
      },
      time: {
        type: Type.STRING,
        description: "Horário da tarefa no formato HH:MM (ex: 20:00 ou 13:00)",
      },
    },
    required: ["title", "date", "time"],
  },
};

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // We explicitly type the chat instance
  const chatRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Chat
    chatRef.current = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: getSystemInstruction(),
        tools: [{ functionDeclarations: [createTaskTool] }],
        temperature: 0.2, // Low temperature for more reliable formatting and rules
      }
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateTask = (args: any) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: args.title,
      date: args.date,
      time: args.time,
      status: 'pending'
    };
    setTasks(prev => [...prev, newTask]);
    return { success: true, message: `Tarefa '${args.title}' agendada para ${args.date} às ${args.time}` };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) return;
      
      let response = await chatRef.current.sendMessage({ message: userMsg });
      
      // Check if function was called
      if (response.functionCalls && response.functionCalls.length > 0) {
        let allFunctionResponses = [];
        
        for (const call of response.functionCalls) {
          if (call.name === 'create_task') {
            const result = handleCreateTask(call.args);
            allFunctionResponses.push({
              name: call.name,
              response: result
            });
          }
        }
        
        // Send function results back to the model to get the final text response
        response = await chatRef.current.sendMessage(allFunctionResponses);
      }
      
      if (response.text) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: response.text! }]);
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        content: 'Desculpe, ocorreu um erro de conexão. Tente novamente.' 
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
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div>
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <CheckCircle className="text-blue-600 w-6 h-6" />
              Suas Tarefas
            </h2>
            <p className="text-sm text-blue-600/80 mt-1">Sincronizado via Guardião</p>
          </div>
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
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg">Guardião da Segurança do Trabalho</h1>
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Online e monitorando
              </div>
            </div>
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
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {message.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-700 border border-blue-200">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
      
    </div>
  );
}
