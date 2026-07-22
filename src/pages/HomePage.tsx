import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Package, ShoppingCart, DollarSign, TrendingUp, Users, ArrowRight, 
  Clock, ShieldCheck, Layers, FileText, CheckCircle2, RefreshCw, BarChart3, Activity
} from 'lucide-react';
import { api } from '../api';
import { cn } from '../utils';
import { APP_NAME, APP_DESCRIPTION } from '../config';

interface HomePageProps {
  user: User;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
  isMobile: boolean;
}

export function HomePage({ user, onChangeTab, onLogout, isMobile }: HomePageProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('app_logo_url') || '/logo_final.jpg');

  useEffect(() => {
    const handleLogoUpdate = (e: any) => {
      if (e.detail) setLogoUrl(e.detail);
    };
    window.addEventListener('app_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('app_logo_updated', handleLogoUpdate);
  }, []);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [salesData, productsData] = await Promise.all([
          api.getInvoices().catch(() => []),
          api.getProducts().catch(() => [])
        ]);
        setInvoices(salesData || []);
        setProductsCount((productsData || []).length);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute metrics
  const totalSalesAmount = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const totalPaidAmount = invoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
  const totalPendingAmount = totalSalesAmount - totalPaidAmount;

  return (
    <div className={cn("max-w-7xl mx-auto flex flex-col space-y-8", isMobile ? "p-4" : "p-8")}>
      
      {/* Header Corporativo / Welcome Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Info & Central Logo Showcase */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center gap-6">
            {/* Central Prominent Corporate Logo */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-md group-hover:blur-lg transition-all" />
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-2xl bg-slate-900 border border-slate-700/60 p-3 sm:p-4 flex items-center justify-center shadow-md overflow-hidden">
                <img 
                  src={logoUrl} 
                  alt="Logo Central" 
                  className="max-w-full max-h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = '/logo_final.jpg'; }}
                />
              </div>
            </div>

            <div className="space-y-2 max-w-xl text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck size={14} className="text-slate-700" />
                <span>{APP_NAME}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Bienvenido, {user.name || user.email}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {APP_DESCRIPTION}. Gestione inventarios, ventas en caja, cuentas por cobrar y emisión de comprobantes desde esta consola central.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={() => onChangeTab('sales')}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <ShoppingCart size={16} />
              <span>Nueva Venta</span>
            </button>
            <button
              onClick={() => onChangeTab('inventory')}
              className="px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <Package size={16} />
              <span>Inventario</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Metric 1: Ventas Totales */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventas Totales</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block font-mono">
              Q{totalSalesAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Acumulado de transacciones</span>
          </div>
        </div>

        {/* Metric 2: Cobrado */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recaudado</span>
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-900 block font-mono">
              Q{totalPaidAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-emerald-700 mt-1 block">Pagos confirmados</span>
          </div>
        </div>

        {/* Metric 3: Pendiente / Saldo */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Por Cobrar</span>
            <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-amber-900 block font-mono">
              Q{totalPendingAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-amber-700 mt-1 block">Saldos pendientes</span>
          </div>
        </div>

        {/* Metric 4: Productos */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catálogo Activo</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Package size={18} />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block font-mono">
              {productsCount}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Productos registrados</span>
          </div>
        </div>

      </div>

      {/* Quick Action Modules */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Módulos de Gestión Rápida</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button
            onClick={() => onChangeTab('sales')}
            className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 text-left transition-all shadow-sm group cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-900 text-white rounded-lg group-hover:scale-105 transition-transform">
                <ShoppingCart size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Punto de Venta (POS)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Emisión de recibos y facturación directa en caja</p>
            </div>
          </button>

          <button
            onClick={() => onChangeTab('inventory')}
            className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 text-left transition-all shadow-sm group cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-900 text-white rounded-lg group-hover:scale-105 transition-transform">
                <Package size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Control de Inventario</h3>
              <p className="text-xs text-slate-500 mt-0.5">Disponibilidad física, precios y variantes de productos</p>
            </div>
          </button>

          <button
            onClick={() => onChangeTab('billing')}
            className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 text-left transition-all shadow-sm group cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-900 text-white rounded-lg group-hover:scale-105 transition-transform">
                <FileText size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facturación & Historial</h3>
              <p className="text-xs text-slate-500 mt-0.5">Consulta de ventas generales e impresiones</p>
            </div>
          </button>

          <button
            onClick={() => onChangeTab('clients')}
            className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 text-left transition-all shadow-sm group cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-slate-900 text-white rounded-lg group-hover:scale-105 transition-transform">
                <Users size={20} />
              </div>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Directorio de Clientes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Gestión de cartera de clientes y créditos</p>
            </div>
          </button>

        </div>
      </div>

      {/* System Status Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Estado Operativo del Sistema</h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            En línea
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="font-semibold text-slate-500 block uppercase">Base de Datos</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">Conectado (Supabase/PostgreSQL)</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="font-semibold text-slate-500 block uppercase">Almacenamiento Local</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">Modo PWA Offline Activo</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/60">
            <span className="font-semibold text-slate-500 block uppercase">Seguridad & RLS</span>
            <span className="font-bold text-slate-900 text-sm mt-1 block">Autenticación por Roles JWT</span>
          </div>
        </div>
      </div>

    </div>
  );
}
