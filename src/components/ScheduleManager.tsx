import React, { useState } from 'react';
import { X, Check, Edit2, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type DaySchedule = {
  day: string;
  short: string;
  classes: string[];
};

export const defaultSchedule: DaySchedule[] = [
  { 
    day: 'Segunda-feira', short: 'Seg', 
    classes: [
      'Técnicas de Seg. Industriais (Jhonatan)', 
      'Técnicas de Seg. Industriais (Jhonatan)', 
      'Biologia (Mª Sueli)', 
      'Biologia (Mª Sueli)', 
      'Prev. e Combate a Incêndio (Jhonatan)',
      'Prev. e Combate a Incêndio (Jhonatan)'
    ] 
  },
  { 
    day: 'Terça-feira', short: 'Ter', 
    classes: [
      'Saúde do Trabalhador (Andrea)', 
      'Saúde do Trabalhador (Andrea)', 
      'Primeiros Socorros (Jhonatan)', 
      'PPOS (Jhonatan)', 
      'PPOS (Jhonatan)',
      'Arte (Gildasia)'
    ] 
  },
  { 
    day: 'Quarta-feira', short: 'Qua', 
    classes: [
      'Química (Sérgio)', 
      'Química (Sérgio)', 
      'História (Cristiane)', 
      'História (Cristiane)', 
      'Geografia (Marli)',
      'Legislação e Normas (Rosinete)'
    ] 
  },
  { 
    day: 'Quinta-feira', short: 'Qui', 
    classes: [
      'Filosofia (Maurício)', 
      'Educação Física (Raquel)', 
      'Segurança do Trabalho (Fabricio)', 
      'Segurança do Trabalho (Fabricio)', 
      'Língua Inglesa (Salomão)',
      'Sociologia (Cristiane)'
    ] 
  },
  { 
    day: 'Sexta-feira', short: 'Sex', 
    classes: [
      'Matemática (Evanginei)', 
      'Matemática (Evanginei)', 
      'Língua Portuguesa (Adriana)', 
      'Língua Portuguesa (Adriana)', 
      'Física (Chrystian)',
      'Física (Chrystian)'
    ] 
  }
];

const periods = [
  { label: '1ª Aula', time: '7:20 - 8:10' },
  { label: '2ª Aula', time: '8:10 - 9:00' },
  { label: '3ª Aula', time: '9:00 - 9:50' },
  { isInterval: true, label: 'Intervalo Matutino', time: '9:50 - 10:10' },
  { label: '4ª Aula', time: '10:10 - 11:00' },
  { label: '5ª Aula', time: '11:00 - 11:45' },
  { label: '6ª Aula', time: '11:45 - 12:30' },
];

interface ScheduleManagerProps {
  schedule: DaySchedule[];
  setSchedule: (schedule: DaySchedule[]) => void;
  onClose: () => void;
}

export function ScheduleManager({ schedule, setSchedule, onClose }: ScheduleManagerProps) {
  const [editingCell, setEditingCell] = useState<{ dIdx: number, cIdx: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Ensure schedule has 6 classes per day
  const normalizedSchedule = schedule.map(day => {
    const newClasses = [...day.classes];
    while(newClasses.length < 6) newClasses.push("");
    return { ...day, classes: newClasses };
  });

  const updateSchedule = (newSchedule: DaySchedule[]) => {
    setSchedule(newSchedule);
  };

  const handleSave = (dIdx: number, cIdx: number) => {
    const newSchedule = [...normalizedSchedule];
    newSchedule[dIdx] = { ...newSchedule[dIdx], classes: [...newSchedule[dIdx].classes] };
    newSchedule[dIdx].classes[cIdx] = editValue.trim();
    updateSchedule(newSchedule);
    setEditingCell(null);
  };

  const handleClear = (dIdx: number, cIdx: number) => {
    const newSchedule = [...normalizedSchedule];
    newSchedule[dIdx] = { ...newSchedule[dIdx], classes: [...newSchedule[dIdx].classes] };
    newSchedule[dIdx].classes[cIdx] = "";
    updateSchedule(newSchedule);
    setEditingCell(null);
  };

  const renderCellContent = (val: string) => {
    if (!val) return <span className="text-slate-300 italic">Vago</span>;
    // Attempt to split format "Subject (Teacher)"
    const match = val.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <span className="font-bold text-slate-800 leading-tight text-[10px] sm:text-[11px] text-center uppercase block mb-1">
            {match[1]}
          </span>
          <span className="text-[9px] text-slate-500 font-medium uppercase text-center block">
            {match[2]}
          </span>
        </div>
      );
    }
    // Fallback if formatting doesn't match
    return (
      <span className="font-bold text-slate-800 text-[10px] sm:text-[11px] text-center leading-tight uppercase block w-full">
        {val}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white text-slate-900 w-full sm:max-w-6xl sm:rounded-2xl h-[90vh] flex flex-col shadow-2xl rounded-t-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Grade Horária</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-slate-500 hidden sm:block">Gerencie as aulas da semana</p>
              <button 
                onClick={() => updateSchedule(defaultSchedule)}
                className="text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-1 rounded transition-colors"
                title="Restaurar grade padrão do sistema"
              >
                Restaurar Padrão
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-slate-100">
          <div className="min-w-[800px] rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white text-slate-900">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-r border-slate-200 p-3 bg-slate-50 text-slate-600 font-bold w-32 border-t-0 border-l-0 text-center">
                    Horário
                  </th>
                  {normalizedSchedule.map(day => (
                    <th key={day.short} className="border-b border-r border-slate-200 p-3 bg-slate-50 text-slate-800 font-bold border-t-0 text-center uppercase tracking-wide">
                      {day.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, periodIdx) => {
                  if (period.isInterval) {
                    return (
                      <tr key="intervalo" className="bg-slate-100">
                        <td className="border border-slate-200 p-2 text-center border-l-0">
                          <div className="font-bold text-slate-700 text-sm whitespace-nowrap">{period.label}</div>
                          <div className="text-xs text-slate-500">{period.time}</div>
                        </td>
                        <td colSpan={5} className="border border-slate-200 p-2 text-center border-r-0">
                          <div className="font-bold text-slate-800 tracking-[0.2em] text-lg uppercase">
                            Intervalo
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Calculate actual class index because of the interval row
                  // The interval is after the 3rd class (index 2)
                  const classIndex = periodIdx > 3 ? periodIdx - 1 : periodIdx;

                  return (
                    <tr key={`aula-${periodIdx}`}>
                      <td className="border border-slate-200 p-2 text-center bg-slate-50 border-l-0 w-32 h-[100px]">
                        <div className="font-bold text-slate-700 text-sm">{period.label}</div>
                        <div className="text-xs text-slate-500">{period.time}</div>
                      </td>
                      
                      {normalizedSchedule.map((day, dIdx) => {
                        const isEditing = editingCell?.dIdx === dIdx && editingCell?.cIdx === classIndex;
                        const val = day.classes[classIndex] || "";
                        
                        return (
                          <td 
                            key={`${day.short}-${classIndex}`} 
                            className={`border border-slate-200 p-2 text-center relative group h-[100px] w-[calc(100%/5)] transition-all duration-200 ${isEditing ? 'bg-yellow-50 z-10' : 'hover:bg-blue-50/30 hover:shadow-md hover:border-blue-300 hover:z-10'}`}
                          >
                            {isEditing ? (
                              <div className="flex flex-col h-full w-full absolute inset-0 p-1 bg-yellow-50 z-10 shadow-[0_0_0_1px_#eab308]">
                                <textarea 
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  className="w-full h-full text-center text-xs p-1 border-0 bg-transparent focus:outline-none resize-none font-medium text-slate-800"
                                  placeholder="Aula (Professor)"
                                  autoFocus
                                />
                                <div className="flex justify-center gap-1 mt-auto pb-1 bg-gradient-to-t from-yellow-50 via-yellow-50">
                                  <button onClick={() => handleSave(dIdx, classIndex)} className="text-green-700 p-1 bg-green-200 rounded hover:bg-green-300 shadow-sm" title="Salvar">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => { setEditValue(''); handleSave(dIdx, classIndex); }} className="text-red-700 p-1 bg-red-200 rounded hover:bg-red-300 shadow-sm sm:hidden" title="Limpar">
                                    <Eraser size={14} />
                                  </button>
                                  <button onClick={() => setEditingCell(null)} className="text-slate-700 p-1 bg-slate-200 rounded hover:bg-slate-300 shadow-sm" title="Cancelar">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="h-full flex flex-col items-center justify-center relative p-1 cursor-pointer"
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('button')) return;
                                  setEditingCell({ dIdx, cIdx: classIndex }); 
                                  setEditValue(val); 
                                }}
                              >
                                {renderCellContent(val)}
                                
                                <div className="absolute inset-0 bg-white/95 opacity-0 lg:group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity pointer-events-none lg:group-hover:pointer-events-auto rounded">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingCell({ dIdx, cIdx: classIndex }); setEditValue(val); }}
                                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 shadow-sm border border-blue-200 hidden lg:flex"
                                    title="Editar aula"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  {val && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleClear(dIdx, classIndex); }}
                                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 shadow-sm border border-red-200 hidden lg:flex"
                                      title="Limpar aula"
                                    >
                                      <Eraser size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

