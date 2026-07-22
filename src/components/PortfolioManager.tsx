import React, { useMemo, useState } from 'react';
import { X, Book, CheckCircle, Calendar as CalendarIcon, Clock, Trash, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DaySchedule } from './ScheduleManager';
import { Task } from '../App';
import { useSyncState } from '../lib/useSync';
import { GradesConfig } from './GradesManager';

interface PortfolioManagerProps {
  schedule: DaySchedule[];
  tasks: Task[];
  onClose: () => void;
  onDeleteTask: (taskId: string) => void;
  onRestoreTask: (taskId: string) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
}

export function PortfolioManager({ schedule, tasks, onClose, onDeleteTask, onRestoreTask, onUpdateTask }: PortfolioManagerProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [gradesConfig] = useSyncState<GradesConfig>('guardiao_grades', { numberOfUnits: 4 } as GradesConfig, 'grades_data');
  const numUnits = gradesConfig?.numberOfUnits || 4;

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    schedule.forEach(day => {
      day.classes.forEach(c => {
        if (!c) return;
        const match = c.match(/^(.*?)\s*\(/);
        if (match) subjects.add(match[1].trim());
        else subjects.add(c.trim());
      });
    });
    return Array.from(subjects).sort();
  }, [schedule]);

  const completedTasks = useMemo(() => {
    const isEvaluation = (title: string) => /teste|prova|avalia[çc][ãa]o|avaliativa/i.test(title);
    return tasks.filter(t => t.status === 'completed' && !isEvaluation(t.title));
  }, [tasks]);

  const tasksBySubject = useMemo(() => {
    const map = new Map<string, Task[]>();
    uniqueSubjects.forEach(sub => map.set(sub, []));
    
    completedTasks.forEach(task => {
      // Extract subject from task title format [SUBJECT] - Title
      const match = task.title.match(/^\[(.*?)\]\s*-\s*(.*)$/);
      let subject = "Outros";
      
      if (match) {
        // Try to match with an existing subject (case insensitive, partial match etc could be complex, simple trim first)
        const possibleSub = match[1].trim();
        // Exact match or partial map? Let's just find the closest or if it exists.
        const found = uniqueSubjects.find(s => s.toLowerCase() === possibleSub.toLowerCase() || s.toLowerCase().includes(possibleSub.toLowerCase()) || possibleSub.toLowerCase().includes(s.toLowerCase()));
        if (found) {
            subject = found;
        } else {
            subject = possibleSub; // fallback even if not in current schedule
            if (!map.has(subject)) map.set(subject, []);
        }
      } else {
         // General heuristic
         const found = uniqueSubjects.find(s => task.title.toLowerCase().includes(s.toLowerCase()));
         if (found) subject = found;
      }
      
      if (!map.has(subject)) map.set(subject, []);
      map.get(subject)!.push(task);
    });
    return map;
  }, [completedTasks, uniqueSubjects]);

  // If no subject selected, default to the first one that has tasks, or just the first subject
  const currentSubject = selectedSubject || 
    (uniqueSubjects.find(s => (tasksBySubject.get(s)?.length || 0) > 0) || uniqueSubjects[0] || "Outros");

  const currentTasks = tasksBySubject.get(currentSubject) || [];

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (let i = 0; i < numUnits; i++) {
      groups[i.toString()] = [];
    }
    groups['outro'] = [];

    currentTasks.forEach(t => {
      if (t.unitIndex !== undefined && t.unitIndex >= 0 && t.unitIndex < numUnits) {
        groups[t.unitIndex.toString()].push(t);
      } else {
        groups['outro'].push(t);
      }
    });
    return groups;
  }, [currentTasks, numUnits]);

  const renderTask = (task: Task) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={task.id}
      className="bg-white text-slate-900 border text-left border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
    >
      <div className="flex flex-col flex-1">
        <div className="flex items-start gap-4">
          <div className="mt-1 lg:mt-0 rounded-full w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 w-full">
            <h4 className="font-medium text-slate-800 text-base break-words break-all sm:break-normal">{task.title}</h4>
            <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                <CalendarIcon className="w-3.5 h-3.5" />
                {task.date}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5" />
                {task.time}
              </span>
            </div>
            
            {task.evidencePhotoBase64 && (
                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden shrink-0 w-32 h-32 md:w-48 md:h-48 group/img">
                  <a href={task.evidencePhotoBase64} target="_blank" rel="noreferrer" className="block w-full h-full">
                    <img src={task.evidencePhotoBase64} alt="Comprovação" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  </a>
                </div>
            )}
            
            <div className="mt-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-400" />
              <select
                value={task.unitIndex !== undefined ? task.unitIndex.toString() : 'outro'}
                onChange={(e) => {
                  if (onUpdateTask) {
                    const val = e.target.value;
                    onUpdateTask(task.id, { unitIndex: val === 'outro' ? undefined : parseInt(val) });
                  }
                }}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <option value="outro">Geral / Sem Ciclo</option>
                {Array.from({ length: numUnits }).map((_, i) => (
                  <option key={i} value={i}>{i + 1}º Ciclo/Unidade</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col justify-start gap-2 mt-3 lg:mt-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onRestoreTask(task.id)}
          className="p-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent"
          title="Restaurar para a lista principal"
        >
          Restaurar
        </button>
        <button
          onClick={() => onDeleteTask(task.id)}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Excluir permanentemente"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-xl">
              <Book className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg sm:text-xl">Caderno de Atividades</h2>
              <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">Portfólio de atividades concluídas por matéria</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar - Subjects */}
          <div className="w-full md:w-64 border-b md:border-r border-slate-100 bg-slate-50 flex flex-col shrink-0">
            <div className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:block">
              Suas Matérias
            </div>
            <div className="flex md:flex-col gap-2 p-3 md:p-2 md:pb-4 overflow-x-auto md:overflow-y-auto">
              {Array.from(tasksBySubject.keys()).sort().map(subject => {
                const count = tasksBySubject.get(subject)?.length || 0;
                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`flex items-center justify-between px-3 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap md:whitespace-normal flex-shrink-0 ${
                      currentSubject === subject
                        ? 'bg-indigo-100/50 text-indigo-800 shadow-sm border border-indigo-200/50'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{subject}</span>
                    {count > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        currentSubject === subject ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content - Tasks */}
          <div className="flex-1 bg-white text-slate-900 flex flex-col overflow-y-auto">
            <div className="p-6 border-b border-slate-100 bg-white text-slate-900 sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                {currentSubject}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {currentTasks.length} {currentTasks.length === 1 ? 'atividade concluída' : 'atividades concluídas'}
              </p>
            </div>

            <div className="p-6 flex flex-col gap-8">
              {currentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                  <CheckCircle className="w-16 h-16 stroke-1 text-slate-300 mb-4" />
                  <p className="text-center font-medium text-slate-500">Nenhuma atividade concluída ainda.</p>
                  <p className="text-center text-sm mt-1 max-w-sm">
                    Quando você marcar uma atividade como concluída na sua lista principal, ela aparecerá aqui.
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {Array.from({ length: numUnits }).map((_, i) => {
                    const tasksInUnit = groupedTasks[i.toString()] || [];
                    if (tasksInUnit.length === 0) return null;
                    return (
                      <motion.div 
                        key={`unit-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col gap-3"
                      >
                        <h4 className="font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start text-sm shadow-sm flex items-center gap-2">
                          <Folder className="w-4 h-4 text-indigo-500" />
                          {i + 1}º Ciclo/Unidade
                        </h4>
                        <div className="flex flex-col gap-3">
                          <AnimatePresence>
                            {tasksInUnit.map(renderTask)}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}

                  {(groupedTasks['outro']?.length ?? 0) > 0 && (
                    <motion.div 
                      key="unit-outro"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-3"
                    >
                      <h4 className="font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start text-sm shadow-sm flex items-center gap-2">
                        <Folder className="w-4 h-4 text-slate-400" />
                        Geral / Sem Ciclo
                      </h4>
                      <div className="flex flex-col gap-3">
                        <AnimatePresence>
                          {groupedTasks['outro'].map(renderTask)}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
