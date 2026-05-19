import React, { useState } from 'react';
import { CheckCircle, Calendar as CalendarIcon, Clock, Settings, Plus, LayoutDashboard, Calendar, ClipboardList, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduleManager, DaySchedule, defaultSchedule } from './components/ScheduleManager';
import { GradesManager } from './components/GradesManager';
import { AppLogo } from './components/Logo';
import { useSyncState } from './lib/useSync';
import { BoletimIcon } from './components/BoletimIcon';

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: 'pending' | 'completed';
};

export default function App() {
  const [tasks, setTasks] = useSyncState<Task[]>('guardiao_tasks', [], 'tasks_data');
  const [schedule, setSchedule] = useSyncState<DaySchedule[]>('guardiao_schedule', defaultSchedule, 'schedule_data');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title: newTaskTitle,
      date: newTaskDate || new Date().toISOString().split('T')[0],
      time: newTaskTime || '12:00',
      status: 'pending'
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewTaskDate('');
    setNewTaskTime('');
  };

  const deleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar: Tasks */}
      <div className="w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100 bg-blue-50/50">
          <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
            <CheckCircle className="text-blue-600 w-6 h-6" />
            Minhas Tarefas
          </h2>
          <p className="text-sm text-blue-600/80 mt-1">Gerencie suas atividades acadêmicas</p>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAddTask} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nova tarefa..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={newTaskDate}
                onChange={e => setNewTaskDate(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={newTaskTime}
                onChange={e => setNewTaskTime(e.target.value)}
                className="w-24 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <ClipboardList className="w-12 h-12 stroke-1 text-slate-300" />
              <p className="text-center text-sm px-4">Nenhuma tarefa. Adicione algo acima!</p>
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
                  className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${
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
                    <div className="flex-1">
                      <h3 className={`font-medium text-sm transition-all pr-6 ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
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
                  <button 
                    onClick={(e) => deleteTask(task.id, e)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        <header className="px-6 py-4 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center relative">
              <AppLogo className="w-12 h-12" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg sm:text-base md:text-lg">Guardião Acadêmico</h1>
              <div className="text-xs font-medium text-slate-500">
                Gerenciamento Simples e Direto
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 flex flex-col items-center">
          <div className="w-full max-w-4xl space-y-6 flex flex-col items-center">
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center w-full">
              <LayoutDashboard className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo ao seu painel</h2>
              <p className="text-slate-600 max-w-lg mx-auto">
                Acesse sua grade de horários, insira suas notas e gerencie suas tarefas de forma simples e rápida, sem distrações.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div 
                onClick={() => setShowSchedule(true)}
                className="group cursor-pointer bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-center flex flex-col items-center justify-center gap-4 h-48"
              >
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Grade Horária</h3>
                  <p className="text-sm text-slate-500">Visualize e edite as aulas da semana</p>
                </div>
              </div>

              <div 
                onClick={() => setShowGrades(true)}
                className="group cursor-pointer bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all text-center flex flex-col items-center justify-center gap-4 h-48"
              >
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-110 transition-all">
                  <BoletimIcon className="w-8 h-8 font-bold" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Boletim Escolar</h3>
                  <p className="text-sm text-slate-500">Acompanhe suas notas e situação</p>
                </div>
              </div>
            </div>
            
            <div className="md:hidden mt-4 w-full">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <CheckCircle className="text-blue-600 w-5 h-5" />
                  Minhas Tarefas (Móvel)
                </h3>
                 <form onSubmit={handleAddTask} className="flex flex-col gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Nova tarefa..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </form>
                
                <div className="flex flex-col gap-3">
                  {tasks.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">Nenhuma tarefa.</p>
                  ) : (
                    tasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`p-3 rounded-xl border flex items-center gap-3 ${
                          task.status === 'completed' 
                            ? 'bg-slate-50 border-slate-200 opacity-60' 
                            : 'bg-white border-blue-100'
                        }`}
                      >
                       <div className={`rounded-full flex-shrink-0 w-5 h-5 flex items-center justify-center border ${
                          task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'
                        }`}>
                          {task.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        </div>
                        <span className={`text-sm flex-1 ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                          {task.title}
                        </span>
                        <button 
                          onClick={(e) => deleteTask(task.id, e)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

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
