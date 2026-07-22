import React, { useState, useEffect } from 'react';
import { User, CashShift } from '../types';
import { Clock, DollarSign, Lock, Unlock, AlertCircle, CheckCircle2, History, CreditCard, ArrowUpRight, FileText } from 'lucide-react';
import { cn } from '../utils';

interface ShiftsPageProps {
  user: User;
  isMobile?: boolean;
}

export function ShiftsPage({ user, isMobile }: ShiftsPageProps) {
  const [shifts, setShifts] = useState<CashShift[]>(() => {
    const saved = localStorage.getItem('pos_cash_shifts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [initialAmountInput, setInitialAmountInput] = useState('');
  const [actualAmountInput, setActualAmountInput] = useState('');
  const [openNotesInput, setOpenNotesInput] = useState('');
  const [closeNotesInput, setCloseNotesInput] = useState('');

  useEffect(() => {
    localStorage.setItem('pos_cash_shifts', JSON.stringify(shifts));
  }, [shifts]);

  const activeShift = shifts.find(s => s.status === 'open');

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(initialAmountInput);
    if (isNaN(amount) || amount < 0) {
      alert("Por favor ingrese un monto inicial válido.");
      return;
    }

    const newShift: CashShift = {
      id: `shift-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openedBy: user.id,
      openedByName: user.name || user.email,
      initialAmount: amount,
      cashSalesAmount: 0,
      otherSalesAmount: 0,
      expectedAmount: amount,
      status: 'open',
      notes: openNotesInput.trim() || undefined,
    };

    setShifts(prev => [newShift, ...prev]);
    setInitialAmountInput('');
    setOpenNotesInput('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const actualAmount = parseFloat(actualAmountInput);
    if (isNaN(actualAmount) || actualAmount < 0) {
      alert("Por favor ingrese el monto real verificado en caja.");
      return;
    }

    const cashSales = activeShift.cashSalesAmount || 0;
    const expected = activeShift.initialAmount + cashSales;
    const diff = actualAmount - expected;

    const updatedShift: CashShift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      expectedAmount: expected,
      actualAmount: actualAmount,
      difference: diff,
      status: 'closed',
      notes: closeNotesInput.trim() 
        ? `${activeShift.notes ? activeShift.notes + ' | ' : ''}Cierre: ${closeNotesInput.trim()}`
        : activeShift.notes,
    };

    setShifts(prev => prev.map(s => s.id === activeShift.id ? updatedShift : s));
    setActualAmountInput('');
    setCloseNotesInput('');
  };

  return (
    <div className={cn("max-w-6xl mx-auto flex flex-col space-y-8", isMobile ? "p-4" : "p-8")}>
      
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider mb-2">
            <Clock size={14} className="text-slate-600" />
            <span>Módulo de Control Financiero</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Gestión de Turnos y Arqueo de Caja
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración formal de apertura, arqueos continuos y cierres de caja operativa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border",
            activeShift 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-amber-50 text-amber-800 border-amber-200"
          )}>
            <div className={cn("w-2 h-2 rounded-full", activeShift ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            <span>{activeShift ? "Turno Activo en Caja" : "Caja Cerrada / Sin Turno"}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Open Form vs Active Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form Action (Open / Close) */}
        <div className="lg:col-span-1">
          {!activeShift ? (
            /* APERTURA DE CAJA */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-slate-100 text-slate-800 rounded-lg">
                  <Unlock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Apertura de Caja</h2>
                  <p className="text-xs text-slate-500">Iniciar un nuevo turno operativo</p>
                </div>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Monto Inicial / Base de Caja (Q)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Q</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={initialAmountInput}
                      onChange={(e) => setInitialAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Observaciones / Notas de Apertura
                  </label>
                  <textarea
                    rows={2}
                    value={openNotesInput}
                    onChange={(e) => setOpenNotesInput(e.target.value)}
                    placeholder="Detalles sobre el dinero base entregado..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Unlock size={16} />
                  <span>Abrir Turno de Caja</span>
                </button>
              </form>
            </div>
          ) : (
            /* CIERRE DE CAJA */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-slate-900 text-white rounded-lg">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Arqueo y Cierre de Caja</h2>
                  <p className="text-xs text-slate-500">Verificar efectivo y finalizar turno</p>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Monto Real Contado en Caja (Q)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Q</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={actualAmountInput}
                      onChange={(e) => setActualAmountInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Direct Live Variance Calculation Preview */}
                {actualAmountInput !== '' && !isNaN(parseFloat(actualAmountInput)) && (
                  <div className={cn(
                    "p-3 rounded-lg border text-xs flex items-center justify-between font-medium",
                    (parseFloat(actualAmountInput) - (activeShift.initialAmount + (activeShift.cashSalesAmount || 0))) === 0
                      ? "bg-slate-100 border-slate-300 text-slate-800"
                      : (parseFloat(actualAmountInput) - (activeShift.initialAmount + (activeShift.cashSalesAmount || 0))) > 0
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-red-50 border-red-300 text-red-900"
                  )}>
                    <span>Diferencia Arqueada:</span>
                    <span className="font-bold">
                      Q{(parseFloat(actualAmountInput) - (activeShift.initialAmount + (activeShift.cashSalesAmount || 0))).toFixed(2)}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Notas de Cierre
                  </label>
                  <textarea
                    rows={2}
                    value={closeNotesInput}
                    onChange={(e) => setCloseNotesInput(e.target.value)}
                    placeholder="Observaciones de discrepancias o billetes retenidos..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  <span>Cerrar Turno de Caja</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Active Shift Metrics & General History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Shift Details Banner */}
          {activeShift && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Resumen de Operación del Turno Vigente
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold block">Apertura por</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block truncate">{activeShift.openedByName}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold block">Base Inicial</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    Q{activeShift.initialAmount.toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/60">
                  <span className="text-[11px] text-slate-500 uppercase font-semibold block">Hora Apertura</span>
                  <span className="text-sm font-bold text-slate-900 mt-1 block">
                    {new Date(activeShift.openedAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-lg">
                  <span className="text-[11px] text-slate-300 uppercase font-semibold block">Total Esperado</span>
                  <span className="text-sm font-extrabold text-white mt-1 block">
                    Q{(activeShift.initialAmount + (activeShift.cashSalesAmount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Historial de Turnos */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={18} className="text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">Historial de Turnos de Caja</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">{shifts.length} registros</span>
            </div>

            {shifts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Clock size={36} className="mx-auto text-slate-300" />
                <p className="text-sm font-medium">No se han registrado turnos de caja previamente.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Responsable</th>
                      <th className="py-3 px-4 text-right">Monto Inicial</th>
                      <th className="py-3 px-4 text-right">Esperado</th>
                      <th className="py-3 px-4 text-right">Real</th>
                      <th className="py-3 px-4 text-right">Diferencia</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                          {new Date(shift.openedAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="text-slate-400 block text-[10px]">
                            {new Date(shift.openedAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{shift.openedByName}</td>
                        <td className="py-3.5 px-4 text-right font-mono">Q{shift.initialAmount.toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {shift.expectedAmount ? `Q${shift.expectedAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          {shift.actualAmount !== undefined ? `Q${shift.actualAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className={cn("py-3.5 px-4 text-right font-mono font-bold", 
                          (shift.difference || 0) === 0 
                            ? "text-slate-700" 
                            : (shift.difference || 0) > 0 
                            ? "text-emerald-700" 
                            : "text-red-700"
                        )}>
                          {shift.difference !== undefined 
                            ? `${shift.difference >= 0 ? '+' : ''}Q${shift.difference.toFixed(2)}` 
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                            shift.status === 'open' 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-slate-100 text-slate-700"
                          )}>
                            {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
