import React, { useState, useEffect, useMemo } from 'react';
import { X, Building2, Calculator, Settings2, Edit3, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DaySchedule } from './ScheduleManager';
import { BoletimIcon } from './BoletimIcon';
import { useSyncState } from '../lib/useSync';

export interface Evaluation {
  id: string;
  name: string;
  grade: number | string | null;
  weight: number | string | null;
}

export interface UnitDetail {
  manualGrade: number | string | null;
  evaluations: Evaluation[];
  useEvaluations: boolean;
}

export interface SubjectGrades {
  subjectName: string;
  units: UnitDetail[];
}

export interface GradesConfig {
  schoolName: string;
  unitPassingAverage: number;
  finalPassingAverage: number;
  numberOfUnits: number;
  grades: { [subject: string]: SubjectGrades };
}

interface GradesManagerProps {
  schedule: DaySchedule[];
  onClose: () => void;
}

const defaultGradesConfig: GradesConfig = {
  schoolName: 'Nome do Colégio',
  unitPassingAverage: 7.0,
  finalPassingAverage: 7.0,
  numberOfUnits: 4,
  grades: {}
};

const createEmptyUnit = (): UnitDetail => ({
  manualGrade: null,
  evaluations: [],
  useEvaluations: false
});

export function getUnitGrade(unit: UnitDetail): number | null {
  if (!unit) return null;
  if (unit.useEvaluations) {
    if (unit.evaluations.length === 0) return null;
    let totalGrade = 0;
    let hasGrade = false;
    unit.evaluations.forEach(ev => {
      let g = null;
      if (typeof ev.grade === 'number') g = ev.grade;
      else if (typeof ev.grade === 'string') g = parseFloat(ev.grade.replace(',', '.'));
      
      if (g !== null && !isNaN(g)) {
        totalGrade += g;
        hasGrade = true;
      }
    });
    if (!hasGrade) return null;
    return totalGrade;
  } else {
    if (typeof unit.manualGrade === 'number') return unit.manualGrade;
    if (typeof unit.manualGrade === 'string') {
      const parsed = parseFloat(unit.manualGrade.replace(',', '.'));
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  }
}

function UnitDetailsModal({ 
  subjectName, 
  unitIndex, 
  unit, 
  onSave, 
  onClose 
}: { 
  subjectName: string; 
  unitIndex: number; 
  unit: UnitDetail; 
  onSave: (newUnit: UnitDetail) => void; 
  onClose: () => void;
}) {
  const [editedUnit, setEditedUnit] = useState<UnitDetail>(() => {
    if (!unit) return createEmptyUnit();
    return { ...unit, evaluations: unit.evaluations ? [...unit.evaluations] : [] };
  });

  const handleAddEval = () => {
    setEditedUnit(prev => ({
      ...prev,
      useEvaluations: true,
      evaluations: [
        ...prev.evaluations, 
        { id: Math.random().toString(36).substr(2, 9), name: '', grade: null, weight: 1 }
      ]
    }));
  };

  const handleUpdateEval = (id: string, field: keyof Evaluation, value: string) => {
    setEditedUnit(prev => ({
      ...prev,
      evaluations: prev.evaluations.map(ev => {
        if (ev.id !== id) return ev;
        if (field === 'name') return { ...ev, name: value };
        
        let valToSave: string | number | null = value;
        if (value.trim() === '') {
          valToSave = null;
        }
        return { ...ev, [field]: valToSave };
      })
    }));
  };

  const handleDeleteEval = (id: string) => {
    setEditedUnit(prev => ({
      ...prev,
      evaluations: prev.evaluations.filter(ev => ev.id !== id)
    }));
  };

  const handleManualGradeChange = (value: string) => {
    setEditedUnit(prev => ({
      ...prev,
      manualGrade: value.trim() === '' ? null : value
    }));
  };

  const currentComputedGrade = getUnitGrade(editedUnit);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-4 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">{unitIndex + 1}ª Unidade - {subjectName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Informe as notas para calcular o total desta unidade.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6">
          
              <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setEditedUnit({ ...editedUnit, useEvaluations: false })}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                !editedUnit.useEvaluations ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Nota Direta
            </button>
            <button
              onClick={() => setEditedUnit({ ...editedUnit, useEvaluations: true })}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                editedUnit.useEvaluations ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Soma Detalhada
            </button>
          </div>

          {!editedUnit.useEvaluations ? (
            <div className="flex flex-col items-center justify-center py-8">
              <label className="text-sm font-medium text-slate-600 mb-2">Informe a Nota Final</label>
              <input 
                type="text"
                placeholder="Ex: 8.5"
                value={editedUnit.manualGrade !== null ? editedUnit.manualGrade : ""}
                onChange={(e) => handleManualGradeChange(e.target.value)}
                className="w-32 text-center text-3xl font-bold border-b-2 border-slate-300 focus:border-amber-500 py-2 focus:outline-none bg-transparent transition-colors text-slate-800"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-600" /> Notas Parciais
                </h4>
                {currentComputedGrade !== null && (
                  <div className="text-sm font-bold text-slate-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Soma Resultante: <span className="text-amber-700">{currentComputedGrade.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {editedUnit.evaluations.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-500 mb-3">Nenhuma nota cadastrada nesta unidade.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 text-xs font-semibold text-slate-500 px-2 uppercase">
                    <div className="flex-1">Descrição</div>
                    <div className="w-24 text-center">Nota</div>
                    <div className="w-8"></div>
                  </div>
                  {editedUnit.evaluations.map(ev => (
                    <div key={ev.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                      <input 
                        type="text"
                        placeholder="Ex: Prova"
                        value={ev.name}
                        onChange={(e) => handleUpdateEval(ev.id, 'name', e.target.value)}
                        className="flex-1 border-none bg-slate-50 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                      <input 
                        type="text"
                        placeholder="0.0"
                        value={ev.grade !== null ? ev.grade : ""}
                        onChange={(e) => handleUpdateEval(ev.id, 'grade', e.target.value)}
                        className="w-24 text-center font-semibold text-amber-700 border-none bg-amber-50/50 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-amber-500 outline-none placeholder:text-amber-200"
                      />
                      <button 
                        onClick={() => handleDeleteEval(ev.id)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={handleAddEval}
                className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 border border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Avaliação
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(editedUnit)}
            className="px-5 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Salvar Notas
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function GradesManager({ schedule, onClose }: GradesManagerProps) {
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    schedule.forEach(day => {
      day.classes.forEach(c => {
        if (!c) return;
        const match = c.match(/^(.*?)\s*\(/);
        const name = match ? match[1].trim() : c.trim();
        if (name) subjects.add(name);
      });
    });
    return Array.from(subjects).sort();
  }, [schedule]);

  const [config, setConfig] = useSyncState<GradesConfig>('guardiao_grades', defaultGradesConfig, 'grades_data');

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editingCell, setEditingCell] = useState<{subjectName: string, unitIndex: number} | null>(null);

  useEffect(() => {
    if (!uniqueSubjects || uniqueSubjects.length === 0) return;
    
    setConfig(prev => {
      const newGrades = { ...prev.grades };
      let changed = false;
      uniqueSubjects.forEach(sub => {
        if (!newGrades[sub]) {
          newGrades[sub] = {
            subjectName: sub,
            units: Array(prev.numberOfUnits || 4).fill(null).map(createEmptyUnit)
          };
          changed = true;
        } else if (newGrades[sub].units.length !== prev.numberOfUnits) {
          const old = newGrades[sub].units;
          newGrades[sub].units = Array(prev.numberOfUnits).fill(null).map((_, i) => old[i] ? old[i] : createEmptyUnit());
          changed = true;
        }
      });
      if (changed) {
        return { ...prev, grades: newGrades };
      }
      return prev;
    });
  }, [uniqueSubjects, config.numberOfUnits, setConfig]);

  const updateSchoolName = (name: string) => setConfig({ ...config, schoolName: name });
  const updateUnitAverage = (val: string) => setConfig({ ...config, unitPassingAverage: parseFloat(val) || 0 });
  const updateFinalAverage = (val: string) => setConfig({ ...config, finalPassingAverage: parseFloat(val) || 0 });
  const updateUnitsCount = (val: string) => setConfig({ ...config, numberOfUnits: parseInt(val) || 4 });

  const calculateSubjectStatus = (subject: SubjectGrades) => {
    const validGrades: number[] = [];
    subject.units.forEach(unit => {
      const g = getUnitGrade(unit);
      if (g !== null) validGrades.push(g);
    });

    const sum = validGrades.reduce((a, b) => a + b, 0);
    const average = validGrades.length > 0 ? sum / validGrades.length : 0;
    
    const isComplete = validGrades.length === config.numberOfUnits;

    // Intelligent total target calculation based on whether they typed an average (<=10) or total points (>10)
    const isTotalPointsMode = config.finalPassingAverage > 10;
    const totalTargetPoints = isTotalPointsMode 
      ? config.finalPassingAverage 
      : config.finalPassingAverage * config.numberOfUnits;

    const pointsNeeded = Math.max(0, totalTargetPoints - sum);
    const remainingUnits = config.numberOfUnits - validGrades.length;
    const avgNeededRemaining = remainingUnits > 0 ? (pointsNeeded / remainingUnits) : 0;
    const alreadyPassed = sum >= totalTargetPoints;

    let status = 'none';
    let label = '';

    if (validGrades.length > 0) {
      const isApproved = isComplete ? alreadyPassed : (average >= config.unitPassingAverage);
      if (isApproved) {
        status = 'good';
        label = isComplete ? 'Aprovado' : 'Na média';
      } else {
        status = 'bad';
        label = isComplete ? 'Reprovado / Final' : 'Abaixo da média';
      }
    } else {
      label = 'Sem notas';
    }

    return { 
      average, 
      status, 
      label, 
      isComplete,
      sum,
      totalTargetPoints,
      pointsNeeded,
      remainingUnits,
      avgNeededRemaining,
      alreadyPassed,
      hasGrades: validGrades.length > 0
    };
  };

  const handleSaveUnit = (subjectName: string, unitIndex: number, newUnit: UnitDetail) => {
    setConfig(prev => {
      const newGrades = { ...prev.grades };
      const sub = { ...newGrades[subjectName] };
      const units = [...sub.units];
      units[unitIndex] = newUnit;
      sub.units = units;
      newGrades[subjectName] = sub;
      return { ...prev, grades: newGrades };
    });
    setEditingCell(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-slate-50 w-full sm:max-w-6xl sm:rounded-2xl h-[90vh] flex flex-col shadow-2xl rounded-t-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <BoletimIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Boletim e Avaliações</h2>
              <p className="text-sm text-slate-500 hidden sm:block">Acompanhe seu desempenho com detalhes em cada disciplina</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 min-h-0">
          
          {/* Settings Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
            <div 
              className="px-5 py-4 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors rounded-xl"
              onClick={() => setIsEditingSettings(!isEditingSettings)}
            >
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-slate-500" />
                <h3 className="font-semibold text-slate-800">Configurações da Instituição</h3>
              </div>
              <div className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                <span>{config.schoolName}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Média: {config.unitPassingAverage.toFixed(1)}</span>
              </div>
            </div>

            <AnimatePresence>
              {isEditingSettings && (
                <motion.div 
                  key="settings-panel"
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1 uppercase">
                        <Building2 className="w-3.5 h-3.5" /> Nome do Colégio
                      </label>
                      <input 
                        type="text" 
                        value={config.schoolName}
                        onChange={e => updateSchoolName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                        placeholder="Ex: Colégio Estadual..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1 uppercase">
                        Unidades / Bimestres
                      </label>
                      <select 
                        value={config.numberOfUnits}
                        onChange={e => updateUnitsCount(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                      >
                        <option value={2}>2 Semestres</option>
                        <option value={3}>3 Trimestres</option>
                        <option value={4}>4 Bimestres</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1 uppercase">
                        Média por Unidade
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={config.unitPassingAverage}
                        onChange={e => updateUnitAverage(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1 uppercase">
                        Média Final / Pontos Totais
                      </label>
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        value={config.finalPassingAverage}
                        onChange={e => updateFinalAverage(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                        placeholder="Ex: 7.0 ou 15"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grades Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="min-w-[800px] inline-block w-full align-middle">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-slate-200 p-4 bg-slate-50 text-slate-600 font-bold text-left sticky top-0 z-10 w-1/4">
                      Matéria
                    </th>
                    {Array.from({ length: config.numberOfUnits }).map((_, i) => (
                      <th key={i} className="border-b border-slate-200 p-4 bg-slate-50 text-slate-600 font-bold text-center sticky top-0 z-10 w-28">
                        {i + 1}ª Unidade
                      </th>
                    ))}
                    <th className="border-b border-l border-slate-200 p-4 bg-slate-100 text-slate-700 font-bold text-center sticky top-0 z-10 w-32 border-l-slate-300">
                      Média Atual
                    </th>
                    <th className="border-b border-slate-200 p-4 bg-slate-100 text-slate-700 font-bold text-center sticky top-0 z-10 w-40">
                      Situação
                    </th>
                    <th className="border-b border-l border-slate-200 p-4 bg-slate-100 text-slate-700 font-bold text-center sticky top-0 z-10 w-48 border-l-slate-200">
                      Falta para Passar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={config.numberOfUnits + 4} className="p-8 text-center text-slate-500">
                        Nenhuma matéria encontrada na grade horária.
                      </td>
                    </tr>
                  ) : (
                    uniqueSubjects.map((subjectName) => {
                      const subject = config.grades[subjectName] || { subjectName, units: Array(config.numberOfUnits).fill(null).map(createEmptyUnit) };
                      const stats = calculateSubjectStatus(subject);
                      
                      return (
                        <tr key={subjectName} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group">
                          <td className="p-4 font-semibold text-slate-800">
                            {subjectName}
                          </td>
                          
                          {Array.from({ length: config.numberOfUnits }).map((_, unitIndex) => {
                            const unit = subject.units[unitIndex];
                            const computedGrade = getUnitGrade(unit);
                            return (
                              <td key={unitIndex} className="p-2 text-center">
                                <button 
                                  onClick={() => setEditingCell({ subjectName, unitIndex })}
                                  className={`w-full py-2 px-1 rounded-lg border transition-all text-sm flex items-center justify-center gap-1 group-hover:scale-105 active:scale-95 ${
                                    (unit && computedGrade !== null)
                                      ? unit.useEvaluations ? 'border-amber-200 bg-amber-50 text-amber-800 font-bold shadow-sm' : 'border-slate-200 bg-white text-slate-800 font-bold shadow-sm hover:border-amber-300' 
                                      : 'border-dashed border-slate-300 text-slate-400 bg-slate-50/50 hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                >
                                  {computedGrade !== null ? computedGrade.toFixed(1) : <><Edit3 className="w-3.5 h-3.5" /> <span className="opacity-0 group-hover:opacity-100 transition-opacity">Add</span></>}
                                </button>
                              </td>
                            );
                          })}

                          <td className="p-4 text-center border-l border-slate-200 bg-slate-50">
                            <span className={`font-bold text-lg ${
                              stats.status === 'none' ? 'text-slate-400' :
                              stats.status === 'good' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {stats.status === 'none' ? '-' : stats.average.toFixed(1)}
                            </span>
                          </td>

                          <td className="p-4 bg-slate-50 text-center">
                            {stats.status !== 'none' && (
                              <div className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${
                                stats.status === 'good' 
                                  ? 'bg-green-100 text-green-700 border-green-200' 
                                  : 'bg-red-100 text-red-700 border-red-200'
                              }`}>
                                {stats.label}
                              </div>
                            )}
                          </td>

                          <td className="p-4 bg-slate-50 text-center border-l border-slate-200">
                            {stats.alreadyPassed ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1 shadow-sm">
                                  ✓ Passou!
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 font-semibold">
                                  {stats.sum.toFixed(1)} pts acumulados
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-slate-700 font-bold text-sm">
                                  Falta {stats.pointsNeeded.toFixed(1)} pts
                                </span>
                                {stats.remainingUnits > 0 ? (
                                  <span className={`text-[11px] mt-0.5 font-medium ${
                                    stats.avgNeededRemaining > 10 
                                      ? 'text-red-500 font-semibold' 
                                      : 'text-slate-500'
                                  }`}>
                                    {stats.remainingUnits === 1 
                                      ? `Precisa de ${stats.pointsNeeded.toFixed(1)} na última`
                                      : `Média de ${stats.avgNeededRemaining.toFixed(1)} / un.`
                                    }
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-red-500 font-semibold mt-0.5">
                                    Não alcançou a média
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </motion.div>

      <AnimatePresence>
        {editingCell && (
          <motion.div key="unit-details-modal" className="fixed inset-0 z-[60]">
            <UnitDetailsModal 
              subjectName={editingCell.subjectName}
              unitIndex={editingCell.unitIndex}
              unit={
                (config.grades[editingCell.subjectName] && config.grades[editingCell.subjectName].units[editingCell.unitIndex]) 
                ? config.grades[editingCell.subjectName].units[editingCell.unitIndex] 
                : createEmptyUnit()
              }
              onSave={(newUnit) => handleSaveUnit(editingCell.subjectName, editingCell.unitIndex, newUnit)}
              onClose={() => setEditingCell(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
