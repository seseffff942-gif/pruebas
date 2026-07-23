import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  Package, ShoppingCart, DollarSign, TrendingUp, Users, ArrowRight,
  Clock, FileText, BarChart3, CreditCard, ClipboardList, Layers,
  AlertTriangle, CheckCircle2, Zap, ChevronRight, Activity, Star
} from 'lucide-react';
import { api } from '../api';
import { cn, formatMoney } from '../utils';
import { APP_NAME } from '../config';

interface HomePageProps {
  user: User;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
  isMobile: boolean;
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const duration = 900;
    const step = 16;
    const increment = value / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{displayed.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
}

export function HomePage({ user, onChangeTab, isMobile }: HomePageProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('app_logo_url') || '/logo_final.jpg');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const handleLogoUpdate = (e: any) => { if (e.detail) setLogoUrl(e.detail); };
    window.addEventListener('app_logo_updated', handleLogoUpdate);
    return () => window.removeEventListener('app_logo_updated', handleLogoUpdate);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [salesData, productsData] = await Promise.all([
          api.getInvoices().catch(() => []),
          api.getProducts().catch(() => [])
        ]);
        setInvoices(salesData || []);
        setProducts(productsData || []);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const totalSalesAmount = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
  const totalPaidAmount = invoices.reduce((acc, inv) => acc + (Number(inv.paidAmount) || 0), 0);
  const totalPendingAmount = totalSalesAmount - totalPaidAmount;
  const lowStockCount = products.filter(p => (p.stock ?? 0) <= 5 && (p.stock ?? 0) > 0).length;
  const outOfStockCount = products.filter(p => (p.stock ?? 0) <= 0).length;
  const recentInvoices = [...invoices].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);

  const dayName = currentTime.toLocaleDateString('es-GT', { weekday: 'long' });
  const fullDate = currentTime.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? '☀️ Buenos días' : hour < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches';

  const kpis = [
    {
      label: 'Ventas Totales',
      value: totalSalesAmount,
      prefix: 'Q',
      icon: DollarSign,
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      badge: `${invoices.length} transacciones`,
    },
    {
      label: 'Total Cobrado',
      value: totalPaidAmount,
      prefix: 'Q',
      icon: CheckCircle2,
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      badge: 'Pagos confirmados',
    },
    {
      label: 'Por Cobrar',
      value: totalPendingAmount,
      prefix: 'Q',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      badge: 'Saldos pendientes',
    },
    {
      label: 'Productos',
      value: products.length,
      prefix: '',
      icon: Package,
      color: 'from-violet-500 to-purple-600',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
      badge: `${lowStockCount + outOfStockCount} con stock bajo`,
    },
  ];

  const quickActions = [
    { id: 'sales', label: 'Nueva Venta', desc: 'Registrar una venta en caja y emitir comprobante', icon: ShoppingCart, color: 'bg-[#0b4d2c]', light: 'bg-emerald-50', text: 'text-[#0b4d2c]' },
    { id: 'inventory', label: 'Inventario', desc: 'Ver y gestionar el catálogo de productos', icon: Package, color: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600' },
    { id: 'billing', label: 'Facturación', desc: 'Historial de ventas e impresiones de recibos', icon: FileText, color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { id: 'clients', label: 'Clientes', desc: 'Directorio y cuentas por cobrar de clientes', icon: Users, color: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-600' },
    { id: 'daily-sales', label: 'Ventas Diarias', desc: 'Resumen y análisis de ventas del día', icon: BarChart3, color: 'bg-pink-600', light: 'bg-pink-50', text: 'text-pink-600' },
    { id: 'business-debts', label: 'Compras', desc: 'Registro de compras a proveedores', icon: CreditCard, color: 'bg-slate-700', light: 'bg-slate-100', text: 'text-slate-700' },
  ].filter(a => user.role === 'admin' || ['sales', 'inventory', 'clients'].includes(a.id));

  const Skeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl w-3/4 mb-2" />
      <div className="h-4 bg-slate-100 rounded-xl w-1/2" />
    </div>
  );

  return (
    <div className={cn('max-w-7xl mx-auto flex flex-col gap-6', isMobile ? 'p-4 pb-24' : 'p-6')}>

      {/* ── HERO SECTION ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b4d2c] via-[#0f5c35] to-[#1a7d48] p-6 sm:p-8 shadow-xl">
        {/* decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left: greet + info */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden shadow-lg backdrop-blur-sm">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo_final.jpg'; }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-[#0b4d2c] animate-pulse" />
            </div>
            <div>
              <p className="text-emerald-300 text-sm font-semibold capitalize">{greeting} — {dayName}</p>
              <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight leading-tight mt-0.5">
                {user.name || user.email}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="bg-white/15 border border-white/20 text-white/90 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  {user.role === 'admin' ? '👑 Administrador' : '👤 Vendedor'}
                </span>
                <span className="text-white/50 text-xs">{APP_NAME}</span>
              </div>
            </div>
          </div>

          {/* Right: date + CTA */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="text-white/60 text-xs">{fullDate}</p>
              <p className="text-white font-bold text-sm">{currentTime.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button
              onClick={() => onChangeTab('sales')}
              className="flex items-center gap-2 bg-white text-[#0b4d2c] font-black text-sm px-5 py-3 rounded-2xl hover:bg-emerald-50 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Zap size={16} className="text-[#0b4d2c]" />
              Nueva Venta
            </button>
          </div>
        </div>

        {/* Stock alerts strip */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <div className="relative mt-5 flex flex-wrap gap-2">
            {outOfStockCount > 0 && (
              <button onClick={() => onChangeTab('inventory')} className="flex items-center gap-1.5 bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-500/30 transition-all cursor-pointer">
                <AlertTriangle size={12} /> {outOfStockCount} sin stock
              </button>
            )}
            {lowStockCount > 0 && (
              <button onClick={() => onChangeTab('inventory')} className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-amber-500/30 transition-all cursor-pointer">
                <AlertTriangle size={12} /> {lowStockCount} stock bajo
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</span>
              <div className={cn('p-2 rounded-xl', kpi.bg)}>
                <kpi.icon size={16} className={kpi.text} />
              </div>
            </div>
            <div className="font-black text-slate-900 text-xl sm:text-2xl font-mono leading-none">
              {isLoading ? (
                <div className="h-7 bg-slate-100 rounded-lg w-24 animate-pulse" />
              ) : (
                kpi.prefix
                  ? <AnimatedNumber value={kpi.value} prefix={kpi.prefix} />
                  : kpi.value
              )}
            </div>
            <p className={cn('text-[10px] font-semibold mt-2', kpi.text)}>{kpi.badge}</p>
          </div>
        ))}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-[#0b4d2c]" />
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Accesos Rápidos</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => onChangeTab(action.id)}
              className="group bg-white border border-slate-100 rounded-2xl p-5 text-left hover:border-slate-200 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 active:scale-[0.98]"
            >
              <div className={cn('p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-110', action.light)}>
                <action.icon size={22} className={action.text} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-800 leading-none">{action.label}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-tight">{action.desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-[#0b4d2c]" />
            <h2 className="text-sm font-black text-slate-800">Actividad Reciente</h2>
          </div>
          <button onClick={() => onChangeTab('billing')} className="text-[11px] font-bold text-[#0b4d2c] hover:underline flex items-center gap-1 cursor-pointer">
            Ver todas <ArrowRight size={12} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} />)}
          </div>
        ) : recentInvoices.length === 0 ? (
          <div className="py-12 text-center">
            <Star size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">Sin ventas registradas aún</p>
            <button onClick={() => onChangeTab('sales')} className="mt-4 text-xs font-black text-[#0b4d2c] bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer">
              Crear primera venta →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentInvoices.map((inv, i) => {
              const isPaid = Number(inv.paidAmount) >= Number(inv.totalAmount);
              const isPartial = Number(inv.paidAmount) > 0 && !isPaid;
              return (
                <div key={inv.id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', isPaid ? 'bg-emerald-400' : isPartial ? 'bg-amber-400' : 'bg-red-400')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{inv.customerName || 'Cliente sin nombre'}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Folio #{inv.folio || inv.id?.slice(-6)} · {inv.sellerName || 'Vendedor'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900">{formatMoney(inv.totalAmount)}</p>
                    <p className={cn('text-[10px] font-bold', isPaid ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-red-500')}>
                      {isPaid ? '✓ Pagado' : isPartial ? '½ Parcial' : '✗ Pendiente'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── STATUS FOOTER ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Base de Datos', value: 'PostgreSQL Activo', dot: 'bg-emerald-400' },
          { label: 'Modo Offline', value: 'PWA Disponible', dot: 'bg-blue-400' },
          { label: 'Seguridad', value: 'JWT por Roles', dot: 'bg-violet-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('w-2 h-2 rounded-full', s.dot)} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <p className="text-xs font-bold text-slate-700">{s.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
