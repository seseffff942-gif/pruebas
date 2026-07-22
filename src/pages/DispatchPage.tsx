import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { User, Invoice } from '../types';
import { api } from '../api';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Printer, 
  Truck, 
  QrCode, 
  X, 
  Plus, 
  Minus, 
  History,
  AlertCircle,
  CheckCheck,
  RotateCcw,
  Barcode,
  Layers,
  Sparkles,
  Info,
  Check
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { cn } from '../utils';

interface DispatchPageProps {
  user: User;
  isMobile: boolean;
}

interface ScanLog {
  id: string;
  code: string;
  time: string;
  status: 'success' | 'full' | 'error';
  message: string;
}

const StableScanner = React.memo(({ 
  onScan, 
  disabled, 
  isFlashActive,
  resetKey 
}: { 
  onScan: (id: string) => void; 
  disabled: boolean; 
  isFlashActive: boolean;
  resetKey: number;
}) => {
  return (
    <div className="aspect-square bg-slate-950 rounded-3xl border-2 border-dashed border-emerald-500/30 overflow-hidden relative shadow-inner">
      <AnimatePresence>
        {isFlashActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/40 z-20 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {disabled ? (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-center p-6 z-10 backdrop-blur-xs">
          <AlertCircle size={44} className="text-amber-500 mb-3 animate-pulse" />
          <p className="text-white font-black text-sm uppercase tracking-wider">ORDEN DESPACHADA</p>
          <p className="text-slate-400 text-xs font-semibold mt-1">Este egreso ya ha sido cerrado</p>
        </div>
      ) : (
        <Scanner
          key={resetKey}
          onScan={(result) => {
            if (result?.[0]?.rawValue) {
              onScan(result[0].rawValue.trim());
            }
          }}
          onError={(error) => console.log("Scanner notice:", error?.message)}
          constraints={{ facingMode: 'environment' }}
          allowMultiple={true}
          scanDelay={400}
          styles={{ container: { width: '100%', height: '100%' } }}
        />
      )}

      {/* Laser Line Overlay Animation */}
      {!disabled && (
        <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_15px_#10b981] pointer-events-none z-10 animate-pulse" />
      )}
    </div>
  );
});

export function DispatchPage({ user, isMobile }: DispatchPageProps) {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [scannerResetKey, setScannerResetKey] = useState<number>(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatchedItems, setDispatchedItems] = useState<Record<string, number>>({});
  const [pendingProduct, setPendingProduct] = useState<{ productId: string, productName: string, maxQty: number } | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [isDispatching, setIsDispatching] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'despachado'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  // Refs for stable callback & physical barcode gun reader
  const invoiceRef = useRef<Invoice | null>(null);
  const dispatchedRef = useRef<Record<string, number>>({});
  const lastScannedRef = useRef<{ id: string, time: number } | null>(null);

  useEffect(() => {
    invoiceRef.current = selectedInvoice;
    dispatchedRef.current = dispatchedItems;
  }, [selectedInvoice, dispatchedItems]);

  // Audio feedback helper
  const playBeep = (type: 'success' | 'error' = 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(type === 'success' ? 880 : 220, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  };

  const addScanLog = (code: string, status: 'success' | 'full' | 'error', message: string) => {
    const newLog: ScanLog = {
      id: Math.random().toString(),
      code,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status,
      message
    };
    setScanLogs(prev => [newLog, ...prev.slice(0, 9)]);
  };

  // Continuous Scanner Handler with Auto-Reset Key Lifecycle
  const handleScan = useCallback((productId: string) => {
    const currentInvoice = invoiceRef.current;
    const currentDispatched = dispatchedRef.current;

    if (!currentInvoice || currentInvoice.status === 'despachado') return;
    
    // Prevent accidental rapid duplicate triggers (500ms cooldown for exact same code)
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.id === productId && (now - lastScannedRef.current.time) < 500) {
      return;
    }

    lastScannedRef.current = { id: productId, time: now };
    setScannedData(productId);
    
    // Schedule scanner key increment to automatically reset camera decoding state for continuous scanning
    setTimeout(() => {
      setScannerResetKey(prev => prev + 1);
    }, 250);

    const cleanCode = productId.trim().toLowerCase();
    const item = currentInvoice.items.find(i => 
      i.productId.toLowerCase() === cleanCode || 
      i.productName.toLowerCase().includes(cleanCode)
    );

    if (item) {
      const currentQty = currentDispatched[item.productId] || 0;
      if (currentQty < item.quantity) {
        setDispatchedItems(prev => ({
          ...prev,
          [item.productId]: (prev[item.productId] || 0) + 1
        }));
        
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 150);
        playBeep('success');
        addScanLog(productId, 'success', `+1 ${item.productName}`);
      } else {
        playBeep('error');
        addScanLog(productId, 'full', `Completo (${item.quantity}/${item.quantity})`);
      }
    } else {
      playBeep('error');
      addScanLog(productId, 'error', 'Producto no pertenece a la orden');
    }
  }, []);

  // Hardware USB Barcode Scanner Keyboard Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Skip if user is typing into text inputs
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (!invoiceRef.current || invoiceRef.current.status === 'despachado') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 60) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.trim().length > 0) {
          handleScan(buffer.trim());
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  const handleDispatch = async () => {
    if (!selectedInvoice) return;
    if (confirm(`¿Estás seguro de marcar como DESPACHADO el egreso #${selectedInvoice.id.replace('INV-', '')}? Esto bloqueará el registro.`)) {
      try {
        setIsDispatching(true);
        await api.dispatchInvoice(selectedInvoice.id);
        
        setSelectedInvoice(prev => prev ? { ...prev, status: 'despachado' } : null);
        setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? { ...inv, status: 'despachado' } : inv));
        
        alert("Egreso despachado y respaldado correctamente.");
      } catch (err) {
        console.error(err);
        alert("Error al despachar el egreso.");
      } finally {
        setIsDispatching(false);
      }
    }
  };

  // Batch actions
  const handleMarkAllDispatched = () => {
    if (!selectedInvoice || selectedInvoice.status === 'despachado') return;
    const allDone: Record<string, number> = {};
    selectedInvoice.items.forEach(item => {
      allDone[item.productId] = item.quantity;
    });
    setDispatchedItems(allDone);
    playBeep('success');
    addScanLog('BATCH', 'success', 'Todos los ítems marcados como despachados');
  };

  const handleResetDispatched = () => {
    if (!selectedInvoice || selectedInvoice.status === 'despachado') return;
    if (confirm("¿Deseas reiniciar los conteos de despacho de esta orden?")) {
      setDispatchedItems({});
      addScanLog('RESET', 'full', 'Conteos de despacho reiniciados');
    }
  };

  const handleMarkLineComplete = (productId: string) => {
    if (!selectedInvoice || selectedInvoice.status === 'despachado') return;
    const item = selectedInvoice.items.find(i => i.productId === productId);
    if (item) {
      setDispatchedItems(prev => ({
        ...prev,
        [productId]: item.quantity
      }));
      playBeep('success');
      addScanLog(productId, 'success', `Línea completada: ${item.quantity} uds`);
    }
  };

  useEffect(() => {
    if (selectedInvoice) {
      const saved = localStorage.getItem(`dispatchedItems_${selectedInvoice.id}`);
      setDispatchedItems(saved ? JSON.parse(saved) : {});
      setItemSearchQuery('');
      setScanLogs([]);
    }
  }, [selectedInvoice]);

  useEffect(() => {
    if (selectedInvoice) {
      localStorage.setItem(`dispatchedItems_${selectedInvoice.id}`, JSON.stringify(dispatchedItems));
    }
  }, [dispatchedItems, selectedInvoice]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await api.getInvoices();
        const sorted = (Array.isArray(data) ? data : []).sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ).filter((inv: any) => 
          !inv.client?.toLowerCase().includes("francisco zepeda") && 
          !inv.client?.toLowerCase().includes("fernando zamora")
        );
        setInvoices(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const [logoData, setLogoData] = useState<string>('');

  useEffect(() => {
    const loadLogo = async () => {
      const paths = ['/logo_final.jpg', '/logo.png.png', '/agricovet.png', '/logo.png'];
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
              const b64 = reader.result as string;
              if (b64 && b64.length > 100) setLogoData(b64);
            };
            reader.readAsDataURL(blob);
            break;
          }
        } catch (err) {
          console.error("Logo load error:", err);
        }
      }
    };
    loadLogo();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => activeTab === 'despachado' ? inv.status === 'despachado' : inv.status !== 'despachado')
      .filter(inv => 
        inv.client?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [invoices, activeTab, searchQuery]);

  const filteredInvoiceItems = useMemo(() => {
    if (!selectedInvoice) return [];
    if (!itemSearchQuery.trim()) return selectedInvoice.items;
    const q = itemSearchQuery.toLowerCase();
    return selectedInvoice.items.filter(item => 
      item.productName.toLowerCase().includes(q) || 
      item.productId.toLowerCase().includes(q)
    );
  }, [selectedInvoice, itemSearchQuery]);

  // Total calculation stats for active invoice
  const orderStats = useMemo(() => {
    if (!selectedInvoice) return { totalItems: 0, totalQtyNeeded: 0, totalQtyDispatched: 0, percent: 0, isAllDone: false };
    const totalItems = selectedInvoice.items.length;
    const totalQtyNeeded = selectedInvoice.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalQtyDispatched = selectedInvoice.items.reduce((sum, item) => sum + (dispatchedItems[item.productId] || 0), 0);
    const percent = totalQtyNeeded > 0 ? Math.min(100, Math.round((totalQtyDispatched / totalQtyNeeded) * 100)) : 0;
    const isAllDone = totalQtyNeeded > 0 && totalQtyDispatched >= totalQtyNeeded;
    return { totalItems, totalQtyNeeded, totalQtyDispatched, percent, isAllDone };
  }, [selectedInvoice, dispatchedItems]);

  const adjustQuantity = (productId: string, delta: number) => {
    if (selectedInvoice?.status === 'despachado') return;
    
    const item = selectedInvoice?.items.find(i => i.productId === productId);
    if (!item) return;

    setDispatchedItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(item.quantity, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const confirmQuantity = () => {
    if (pendingProduct) {
      const qty = Math.max(0, Math.min(pendingProduct.maxQty, quantityInput));
      setDispatchedItems(prev => ({
        ...prev,
        [pendingProduct.productId]: qty
      }));
      setPendingProduct(null);
      setQuantityInput(1);
    }
  };

  const generatePDF = async () => {
    if (!selectedInvoice) return;

    try {
      await api.saveDispatch({
        invoiceId: selectedInvoice.id,
        items: selectedInvoice.items,
        client: selectedInvoice.client,
        sellerId: selectedInvoice.sellerId
      });
    } catch (e) {
      console.error("Error saving dispatch:", e);
    }
    
    let base64Logo = logoData;
    
    if (!base64Logo) {
      const headerImg = document.querySelector('img[alt="Logo Central"]') as HTMLImageElement || document.querySelector('img[alt="Logo"]') as HTMLImageElement;
      if (headerImg && headerImg.complete && headerImg.naturalHeight !== 0) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = headerImg.naturalWidth;
          canvas.height = headerImg.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(headerImg, 0, 0);
            base64Logo = canvas.toDataURL('image/png');
          }
        } catch (e) {
          console.error("Canvas draw error:", e);
        }
      }
    }

    const totalAmount = selectedInvoice.items.reduce((sum, item) => sum + (dispatchedItems[item.productId] || 0) * (item.price || 0), 0);

    const element = document.createElement('div');
    element.style.width = '750px';
    element.style.padding = '25px 30px';
    element.style.backgroundColor = '#ffffff';
    element.style.fontFamily = "'Arial Black', 'Arial', sans-serif";
    
    const itemsHtml = selectedInvoice.items.map((item) => {
        const qty = dispatchedItems[item.productId] || 0;
        const price = item.price || 0;
        const subtotal = qty * price;
        return `
          <tr style="border-bottom: 1px solid #f1f5f9; page-break-inside: avoid;">
            <td style="padding: 10px 8px; color: #0f172a; font-size: 9pt; font-weight: 900; text-align: left;">${item.productName || 'Producto'}</td>
            <td style="padding: 10px 8px; color: #1e293b; font-size: 9pt; font-weight: 900; text-align: center;">${qty} / ${item.quantity}</td>
            <td style="padding: 10px 8px; color: #64748b; font-size: 8.5pt; text-align: right;">Q ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
            <td style="padding: 10px 8px; color: #1A4D2E; font-size: 9.5pt; text-align: right; font-weight: 900;">Q ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
          </tr>
        `;
    }).join('');

    element.innerHTML = `
      <div style="font-size: 7.5pt; font-weight: 900; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 2px;">DOCUMENTO INTERNO DE DESPACHO</div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="flex: 1;">
          <h1 style="font-size: 26pt; font-weight: 900; color: #0f172a; margin: 0; line-height: 0.85; letter-spacing: -1.5px; text-transform: uppercase;">ORDEN DE<br>EGRESO</h1>
          <div style="font-size: 9pt; color: #475569; line-height: 1.3; margin-top: 10px; font-family: Arial, sans-serif;">
            <span style="display: block; margin-bottom: 2px;"><strong>Atención:</strong> contacto@sistema-pos.local</span>
            <span style="display: block; margin-bottom: 2px;"><strong>Teléfono:</strong> +502 3645 0241</span>
            <span style="display: block;">Oficinas Centrales</span>
          </div>
        </div>
        <div style="border: 2px solid #0f172a; padding: 8px; border-radius: 16px; background-color: #ffffff; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${base64Logo ? `<img id="pdf-logo-final" src="${base64Logo}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : '<div style="font-size: 10pt; color: #0f172a; font-weight: 900;">POS</div>'}
        </div>
      </div>
      
      <div style="background-color: #0f172a; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-radius: 8px;">
        <span style="color: #ffffff; font-size: 9pt; font-weight: 900; letter-spacing: 0.5px;">POLÍTICA: DEVOLUCIONES HASTA 8 DÍAS</span>
        <span style="font-size: 9pt; font-weight: 900; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 3px;">POS ENTERPRISE</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-family: Arial, sans-serif;">
        <div style="width: 48%; border-left: 3px solid #1A4D2E; padding-left: 12px;">
          <div style="font-size: 8pt; font-weight: 900; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1.5px;">DESTINATARIO</div>
          <div style="font-weight: 900; font-size: 12pt; color: #0f172a; margin-bottom: 4px;">${selectedInvoice.client}</div>
          <div style="font-size: 9.5pt; color: #475569; line-height: 1.4;">
            <strong>NIT:</strong> ${selectedInvoice.nit || 'C/F'}<br>
            <strong>Dirección:</strong> ${selectedInvoice.address || 'Ciudad'}<br>
            <strong>Teléfono:</strong> ${selectedInvoice.phone || 'N/A'}
          </div>
        </div>
        <div style="width: 48%; border-left: 3px solid #e2e8f0; padding-left: 12px;">
          <div style="font-size: 8pt; font-weight: 900; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1.5px;">DATOS DEL ENVÍO</div>
          <div style="font-size: 9.5pt; color: #475569; line-height: 1.4;">
            <strong>No. Control:</strong> #${selectedInvoice.id.replace('INV-', '')}<br>
            <strong>Fecha Egreso:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Pago:</strong> ${selectedInvoice.paymentMethod || 'CREDITO'}<br>
            <strong>Estado:</strong> <span style="color: #ea580c; font-weight: 900;">${selectedInvoice.status === 'despachado' ? 'DESPACHADO' : 'PENDIENTE'}</span><br>
            <strong>Responsable:</strong> ${selectedInvoice.seller || 'Sistema'}
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 3px solid #1A4D2E;">
            <th style="padding: 12px 8px; text-align: left; font-size: 9pt; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px;">PRODUCTO / DESCRIPCIÓN</th>
            <th style="padding: 12px 8px; text-align: center; font-size: 9pt; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px; width: 16%;">CANT. (DESP/TOTAL)</th>
            <th style="padding: 12px 8px; text-align: right; font-size: 9pt; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px; width: 18%;">PRECIO UNIT.</th>
            <th style="padding: 12px 8px; text-align: right; font-size: 9pt; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1.5px; width: 18%;">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="margin-top: 30px; width: 100%; display: flex; justify-content: flex-end;">
        <table style="width: 320px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 12px; color: #64748b; text-align: left; font-size: 10pt; font-weight: 900;">VALOR BRUTO</td>
            <td style="padding: 6px 12px; font-weight: 900; color: #0f172a; text-align: right; font-size: 10pt;">Q ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 15px;">
              <div style="background-color: #1A4D2E; border-radius: 16px; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 16px -4px rgba(26, 77, 46, 0.3);">
                <span style="font-weight: 900; font-size: 10pt; color: #ffffff; text-transform: uppercase; letter-spacing: 2px;">TOTAL NETO</span>
                <span style="font-weight: 900; font-size: 20pt; color: #ffffff;">Q ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    document.body.appendChild(element);
    
    const imgElement = element.querySelector('#pdf-logo-final') as HTMLImageElement;
    if (imgElement) {
      await new Promise((resolve) => {
        if (imgElement.complete && imgElement.naturalHeight !== 0) resolve(null);
        else {
          imgElement.onload = () => resolve(null);
          imgElement.onerror = () => resolve(null);
        }
      });
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    try {
      await html2pdf().from(element).set({
        margin: 5,
        filename: `orden_egreso_${selectedInvoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).save();
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      document.body.removeChild(element);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#1A4D2E] p-2.5 rounded-2xl shadow-md shadow-emerald-900/15 text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">MÓDULO DE DESPACHOS</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión Continua de Egresos e Inventario</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedInvoice && (
            <button 
              onClick={generatePDF}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Printer size={16} /> Imprimir Comprobante
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800 shadow-xs">
            {user.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedInvoice ? (
            /* ============================================================ */
            /* INVOICE LIST VIEW                                           */
            /* ============================================================ */
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Search and Filter Tabs Bar */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-xs">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={cn(
                      "flex-1 md:flex-initial px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer",
                      activeTab === 'pending' ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Pendientes
                  </button>
                  <button 
                    onClick={() => setActiveTab('despachado')}
                    className={cn(
                      "flex-1 md:flex-initial px-5 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer",
                      activeTab === 'despachado' ? "bg-white text-emerald-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Despachados
                  </button>
                </div>

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input 
                    type="text"
                    placeholder="Buscar por cliente o No. Egreso..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Invoice Grid */}
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse h-44 shadow-xs" />
                    ))
                  ) : filteredInvoices.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400">
                      <div className="bg-slate-100 p-5 rounded-2xl mb-4 text-slate-400">
                        <Package size={36} />
                      </div>
                      <p className="font-black uppercase tracking-wider text-xs text-slate-500">No hay egresos en esta categoría</p>
                    </div>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <motion.button 
                        key={inv.id} 
                        layoutId={`inv-${inv.id}`}
                        onClick={() => setSelectedInvoice(inv)}
                        className="group bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-emerald-500/40 transition-all text-left relative overflow-hidden cursor-pointer"
                      >
                        <div className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                          <ChevronRight size={18} />
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                            inv.status === 'despachado' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {inv.status === 'despachado' ? 'Completado' : 'Pendiente'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            #{inv.id.replace('INV-', '')}
                          </span>
                        </div>

                        <h3 className="font-black text-slate-900 leading-snug mb-3 group-hover:text-emerald-800 transition-colors text-base line-clamp-1">
                          {inv.client}
                        </h3>

                        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 mt-2">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock size={13} />
                            <span className="text-[10px] font-bold">
                              {new Date(inv.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg">
                            Q {inv.totalAmount?.toLocaleString()}
                          </p>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* INVOICE WORKSPACE DETAIL & PRODUCT TABLE                    */
            /* ============================================================ */
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col md:flex-row overflow-hidden"
            >
              {/* Left Main Workspace Panel */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                
                {/* Header & Order Info Bar */}
                <div className="p-5 border-b border-slate-200 shrink-0 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedInvoice(null)}
                      className="p-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer"
                      title="Volver a lista"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">{selectedInvoice.client}</h2>
                        <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                          #{selectedInvoice.id.replace('INV-', '')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        NIT: {selectedInvoice.nit || 'C/F'} | Dirección: {selectedInvoice.address || 'Ciudad'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedInvoice.status === 'despachado' ? (
                      <span className="bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                        <CheckCircle2 size={16} /> DESPACHADO
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                        <Clock size={16} /> EN PROCESO
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Order Progress Metric Summary Card */}
                <div className="p-5 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-4 gap-4 shrink-0">
                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ítems Diferentes</span>
                    <span className="text-xl font-black text-slate-900 mt-1">{orderStats.totalItems} Ítems</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Unidades</span>
                    <span className="text-xl font-black text-slate-900 mt-1">{orderStats.totalQtyNeeded} Uds</span>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 p-3.5 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Despachadas</span>
                    <span className="text-xl font-black text-emerald-900 mt-1">{orderStats.totalQtyDispatched} / {orderStats.totalQtyNeeded}</span>
                  </div>

                  <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">Progreso Global</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">{orderStats.percent}%</span>
                    </div>
                    <div className="w-full bg-white/15 h-2 rounded-full mt-3 overflow-hidden z-10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${orderStats.percent}%` }}
                        className="h-full bg-emerald-400 transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Batch Actions & Product Search Toolbar */}
                <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Filtrar productos en orden..." 
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {selectedInvoice.status !== 'despachado' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button 
                        onClick={handleMarkAllDispatched}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      >
                        <CheckCheck size={16} /> Marcar Todo Despachado
                      </button>
                      <button 
                        onClick={handleResetDispatched}
                        className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                        title="Reiniciar conteos"
                      >
                        <RotateCcw size={14} /> Reiniciar
                      </button>
                    </div>
                  )}
                </div>

                {/* Structured Interactive Product Table */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4 w-12 text-center">Estado</th>
                            <th className="py-3.5 px-4 w-32">Código SKU</th>
                            <th className="py-3.5 px-4">Descripción del Producto</th>
                            <th className="py-3.5 px-4 w-40 text-center">Progreso</th>
                            <th className="py-3.5 px-4 w-36 text-center">Unidades</th>
                            {selectedInvoice.status !== 'despachado' && (
                              <th className="py-3.5 px-4 w-36 text-right">Acciones</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredInvoiceItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                No se encontraron productos coincidentes
                              </td>
                            </tr>
                          ) : (
                            filteredInvoiceItems.map((item, idx) => {
                              const dispatchedQty = dispatchedItems[item.productId] || 0;
                              const isDone = dispatchedQty >= item.quantity;
                              const isPartial = dispatchedQty > 0 && dispatchedQty < item.quantity;
                              const progressPct = Math.min(100, Math.round((dispatchedQty / item.quantity) * 100));

                              return (
                                <tr 
                                  key={idx}
                                  className={cn(
                                    "transition-colors hover:bg-slate-50/70",
                                    isDone && "bg-emerald-50/20"
                                  )}
                                >
                                  {/* Status Icon Column */}
                                  <td className="py-4 px-4 text-center">
                                    {isDone ? (
                                      <div className="w-7 h-7 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Check size={16} strokeWidth={3} />
                                      </div>
                                    ) : isPartial ? (
                                      <div className="w-7 h-7 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[10px]">
                                        {dispatchedQty}
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                        <Clock size={14} />
                                      </div>
                                    )}
                                  </td>

                                  {/* SKU Code Column */}
                                  <td className="py-4 px-4">
                                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md inline-flex items-center gap-1">
                                      <Barcode size={12} className="text-slate-400" />
                                      {item.productId}
                                    </span>
                                  </td>

                                  {/* Product Name Column */}
                                  <td className="py-4 px-4">
                                    <div 
                                      className="font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                                      onClick={() => {
                                        if (selectedInvoice.status !== 'despachado') {
                                          setPendingProduct({ 
                                            productId: item.productId, 
                                            productName: item.productName, 
                                            maxQty: item.quantity 
                                          });
                                          setQuantityInput(dispatchedItems[item.productId] || 0);
                                        }
                                      }}
                                    >
                                      {item.productName}
                                    </div>
                                  </td>

                                  {/* Progress Bar Column */}
                                  <td className="py-4 px-4">
                                    <div className="w-full space-y-1">
                                      <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                                        <span>{progressPct}%</span>
                                        <span>{dispatchedQty}/{item.quantity}</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={cn(
                                            "h-full transition-all duration-300",
                                            isDone ? "bg-emerald-500" : isPartial ? "bg-amber-500" : "bg-slate-300"
                                          )} 
                                          style={{ width: `${progressPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Quantity Badge Column */}
                                  <td className="py-4 px-4 text-center font-mono font-black text-sm">
                                    <span className={cn(
                                      "px-3 py-1 rounded-xl",
                                      isDone ? "bg-emerald-100 text-emerald-900" : isPartial ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                                    )}>
                                      {dispatchedQty} / {item.quantity}
                                    </span>
                                  </td>

                                  {/* Actions Column */}
                                  {selectedInvoice.status !== 'despachado' && (
                                    <td className="py-4 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button 
                                          onClick={() => adjustQuantity(item.productId, -1)}
                                          disabled={dispatchedQty <= 0}
                                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition-all cursor-pointer"
                                          title="Restar 1"
                                        >
                                          <Minus size={14} />
                                        </button>
                                        <button 
                                          onClick={() => adjustQuantity(item.productId, 1)}
                                          disabled={dispatchedQty >= item.quantity}
                                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-800 disabled:opacity-30 transition-all cursor-pointer"
                                          title="Sumar 1"
                                        >
                                          <Plus size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleMarkLineComplete(item.productId)}
                                          disabled={isDone}
                                          className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-lg disabled:opacity-30 transition-all cursor-pointer ml-1"
                                          title="Marcar línea completa"
                                        >
                                          <CheckCheck size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-4 shrink-0 shadow-xs">
                  <button 
                    onClick={generatePDF}
                    className="flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 text-slate-700 font-black text-xs rounded-xl hover:bg-slate-100 transition-all shadow-xs cursor-pointer active:scale-98 uppercase tracking-wider"
                  >
                    <Printer size={16} /> GENERAR COMPROBANTE PDF
                  </button>
                  
                  {selectedInvoice.status !== 'despachado' ? (
                    <button 
                      onClick={handleDispatch}
                      disabled={isDispatching}
                      className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98 uppercase tracking-wider disabled:opacity-50"
                    >
                      {isDispatching ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      FINALIZAR Y REGISTRAR DESPACHO
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-3.5 bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl uppercase tracking-wider">
                      <History size={16} /> DESPACHADO EL {new Date().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Continuous Camera QR Scanner & Live Feed */}
              <div className={cn(
                "w-full md:w-80 lg:w-96 bg-slate-900 shrink-0 flex flex-col transition-all border-l border-slate-800",
                !showScanner && isMobile && "h-0 overflow-hidden"
              )}>
                {/* Scanner Panel Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950">
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <QrCode size={16} className="text-emerald-400" />
                      ESCÁNER CONTINUO
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-400/80 mt-0.5">Cámara & Lectores USB Activos</p>
                  </div>
                  {isMobile && (
                    <button 
                      onClick={() => setShowScanner(false)}
                      className="text-white/50 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  {/* Stable Camera View Scanner with Auto-Reset Key */}
                  <StableScanner 
                    onScan={handleScan}
                    disabled={selectedInvoice.status === 'despachado'}
                    isFlashActive={isFlashActive}
                    resetKey={scannerResetKey}
                  />
                  
                  {/* Last Scan Status Display */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Último Código Detectado</span>
                    <p className="text-sm font-mono font-bold text-emerald-300 truncate">
                      {scannedData || 'Esperando lectura de código...'}
                    </p>
                  </div>

                  {/* Live Scan Log Feed */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Historial de Lecturas</span>
                    {scanLogs.length === 0 ? (
                      <div className="text-center py-6 text-white/30 text-xs font-medium">
                        Sin lecturas en esta sesión
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {scanLogs.map(log => (
                          <div 
                            key={log.id} 
                            className={cn(
                              "p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 border",
                              log.status === 'success' && "bg-emerald-950/60 border-emerald-500/30 text-emerald-300",
                              log.status === 'full' && "bg-amber-950/60 border-amber-500/30 text-amber-300",
                              log.status === 'error' && "bg-rose-950/60 border-rose-500/30 text-rose-300"
                            )}
                          >
                            <div className="truncate">
                              <span className="font-mono text-[10px] opacity-70 block">{log.code}</span>
                              <span className="font-bold">{log.message}</span>
                            </div>
                            <span className="text-[9px] opacity-50 font-mono shrink-0">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Floating Scanner Toggle Button */}
              {isMobile && !showScanner && selectedInvoice.status !== 'despachado' && (
                <button 
                  onClick={() => setShowScanner(true)}
                  className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50 animate-bounce cursor-pointer"
                >
                  <QrCode size={24} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Manual Quantity Adjustment Modal */}
      <AnimatePresence>
        {pendingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-100 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-7 shadow-2xl w-full max-w-sm flex flex-col items-center gap-5 border border-slate-100"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                📦
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 leading-snug">{pendingProduct.productName}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Ajustar Unidades a Despachar</p>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setQuantityInput(prev => Math.max(0, prev - 1))}
                  className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 text-xl font-black hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Minus size={20} />
                </button>
                <div className="flex-1 text-center">
                  <input 
                    type="number" 
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(Math.max(0, Math.min(pendingProduct.maxQty, parseInt(e.target.value) || 0)))}
                    className="w-full text-center text-4xl font-black p-2 border-none focus:outline-none focus:ring-0 text-slate-900 font-mono"
                    autoFocus
                  />
                  <p className="text-[10px] font-black text-emerald-700 mt-0.5 uppercase">Meta: {pendingProduct.maxQty} unidades</p>
                </div>
                <button 
                  onClick={() => setQuantityInput(prev => Math.min(pendingProduct.maxQty, prev + 1))}
                  className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 text-xl font-black hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <button 
                  onClick={() => {
                    setPendingProduct(null);
                    setQuantityInput(1);
                  }} 
                  className="flex-1 px-5 py-3.5 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmQuantity} 
                  className="flex-1 px-5 py-3.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all uppercase text-xs tracking-wider cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
