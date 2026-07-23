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
  Check,
  Camera,
  CameraOff,
  UserCheck,
  FileText,
  CreditCard,
  Building2,
  MapPin,
  Phone
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
    <div className="aspect-square bg-slate-950 rounded-3xl border-2 border-dashed border-emerald-500/40 overflow-hidden relative shadow-inner">
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
          <p className="text-slate-400 text-xs font-semibold mt-1">Este egreso ya ha sido finalizado y cerrado</p>
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
        <div className="absolute inset-x-4 top-1/2 h-0.5 bg-emerald-400/90 shadow-[0_0_18px_#10b981] pointer-events-none z-10 animate-pulse" />
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
  const [isCameraActive, setIsCameraActive] = useState(false);
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
        addScanLog(productId, 'full', `Línea completa (${item.quantity}/${item.quantity})`);
      }
    } else {
      playBeep('error');
      addScanLog(productId, 'error', 'Producto no registrado en esta orden');
    }
  }, []);

  // Hardware USB Barcode Scanner Keyboard Listener (Works 100% of the time)
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
    if (confirm(`¿Estás seguro de marcar como DESPACHADO el egreso #${selectedInvoice.id.replace('INV-', '')}? Esto finalizará y bloqueará la orden.`)) {
      try {
        setIsDispatching(true);
        await api.dispatchInvoice(selectedInvoice.id);
        
        setSelectedInvoice(prev => prev ? { ...prev, status: 'despachado' } : null);
        setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? { ...inv, status: 'despachado' } : inv));
        
        alert("Egreso despachado y registrado correctamente.");
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
    const handleLogoUpdate = (e: any) => {
      if (e.detail) setLogoData(e.detail);
    };
    window.addEventListener('app_logo_updated', handleLogoUpdate);

    const loadLogo = async () => {
      const customLogo = localStorage.getItem('app_logo_url');
      const paths = customLogo ? [customLogo, '/logo_final.jpg'] : ['/logo_final.jpg', '/logo.png'];
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

    return () => window.removeEventListener('app_logo_updated', handleLogoUpdate);
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

  // Neutral Generic Folio PDF Generator Template
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
      const headerImg = (document.querySelector('img[alt="Logo Central"]') as HTMLImageElement) || (document.querySelector('img[alt="Logo"]') as HTMLImageElement);
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

    // Create isolated container hidden from user view
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-100';
    
    const element = document.createElement('div');
    element.style.width = '800px';
    element.style.padding = '35px 40px';
    element.style.boxSizing = 'border-box';
    element.style.backgroundColor = '#ffffff';
    element.style.fontFamily = "'Inter', 'Segoe UI', 'Arial', sans-serif";
    element.style.color = '#0f172a';
    
    const itemsHtml = selectedInvoice.items.map((item, index) => {
        const qty = dispatchedItems[item.productId] || 0;
        const price = item.price || 0;
        const subtotal = qty * price;
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 1 ? 'background-color: #f8fafc;' : ''} page-break-inside: avoid; break-inside: avoid;">
            <td style="padding: 10px 12px; font-size: 8.5pt; font-weight: 700; font-family: monospace; color: #475569;">${item.productId}</td>
            <td style="padding: 10px 12px; font-size: 9pt; font-weight: 700; color: #0f172a;">${item.productName || 'Producto'}</td>
            <td style="padding: 10px 12px; font-size: 9.5pt; font-weight: 800; color: #0f172a; text-align: center;">${qty} / ${item.quantity}</td>
            <td style="padding: 10px 12px; font-size: 8.5pt; color: #475569; text-align: right;">Q ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
            <td style="padding: 10px 12px; font-size: 9.5pt; font-weight: 800; color: #047857; text-align: right;">Q ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
          </tr>
        `;
    }).join('');

    element.innerHTML = `
      <!-- Header Neutral -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0f172a; margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="flex: 1;">
          <div style="font-size: 8pt; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">SISTEMA DE GESTIÓN Y CONTROL</div>
          <h1 style="font-size: 22pt; font-weight: 900; color: #0f172a; margin: 0; line-height: 1; letter-spacing: -0.5px; text-transform: uppercase;">COMPROBANTE DE EGRESO DE INVENTARIO</h1>
          <div style="font-size: 9pt; color: #475569; margin-top: 8px; font-weight: 500;">
            Documento de control interno para entrega de mercadería y despacho de inventario
          </div>
        </div>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px; background-color: #ffffff; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          ${base64Logo ? `<img id="pdf-logo-final" src="${base64Logo}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : '<div style="font-size: 11pt; color: #0f172a; font-weight: 900;">EMPRESA</div>'}
        </div>
      </div>
      
      <!-- General Metadata Grid -->
      <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 25px; background-color: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
        <div style="width: 48%;">
          <div style="font-size: 7.5pt; font-weight: 800; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px;">INFORMACIÓN DEL RECEPTOR / CLIENTE</div>
          <div style="font-weight: 900; font-size: 11pt; color: #0f172a; margin-bottom: 4px;">${selectedInvoice.client}</div>
          <div style="font-size: 8.5pt; color: #334155; line-height: 1.4;">
            <strong>NIT / ID:</strong> ${selectedInvoice.nit || 'C/F'}<br>
            <strong>Dirección:</strong> ${selectedInvoice.address || 'Ciudad'}<br>
            <strong>Teléfono:</strong> ${selectedInvoice.phone || 'N/A'}
          </div>
        </div>
        <div style="width: 48%;">
          <div style="font-size: 7.5pt; font-weight: 800; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1.5px;">DATOS DEL DOCUMENTO</div>
          <div style="font-size: 8.5pt; color: #334155; line-height: 1.4;">
            <strong>No. Folio / Control:</strong> <span style="font-family: monospace; font-weight: 800; color: #0f172a;">#${selectedInvoice.id.replace('INV-', '')}</span><br>
            <strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Método de Pago:</strong> ${selectedInvoice.paymentMethod || 'CONTADO / CREDITO'}<br>
            <strong>Estado Despacho:</strong> <span style="color: #047857; font-weight: 800;">${selectedInvoice.status === 'despachado' ? 'COMPLETADO' : 'PENDIENTE'}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; page-break-inside: avoid; break-inside: avoid;">
            <th style="padding: 10px 12px; text-align: left; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 18%;">CÓDIGO SKU</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">DESCRIPCIÓN DE MERCADERÍA</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 18%;">CANT. (DESP/TOTAL)</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 16%;">PRECIO UNIT.</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; width: 18%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Summary and Signatures Footer -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="width: 55%; font-size: 8pt; color: #64748b; line-height: 1.4;">
          <div style="font-weight: 800; color: #0f172a; margin-bottom: 4px; uppercase">POLÍTICA DE REVISIÓN Y ENTREGA</div>
          <span>Verifique su mercadería al momento de recibir. Las devoluciones o reclamos posteriores están sujetos a las políticas estándar de la empresa (hasta 8 días hábiles).</span>
          
          <div style="display: flex; gap: 40px; margin-top: 45px;">
            <div style="border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 4px; font-size: 8pt; font-weight: 700; color: #334155;">
              Firma Responsable Despacho
            </div>
            <div style="border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 4px; font-size: 8pt; font-weight: 700; color: #334155;">
              Firma Recibido Conforme
            </div>
          </div>
        </div>

        <div style="width: 38%;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt; color: #475569; font-weight: 600;">
              <span>TOTAL ÍTEMS:</span>
              <span>${selectedInvoice.items.length} ítems</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9pt; color: #475569; font-weight: 600;">
              <span>TOTAL UNIDADES:</span>
              <span>${orderStats.totalQtyDispatched} / ${orderStats.totalQtyNeeded} uds</span>
            </div>
            <div style="border-top: 2px border #0f172a; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 900; font-size: 10pt; color: #0f172a; uppercase">MONTO TOTAL</span>
              <span style="font-weight: 900; font-size: 16pt; color: #047857;">Q ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.appendChild(element);
    document.body.appendChild(container);
    
    // Ensure all images are fully loaded before rendering canvas
    const imgElement = element.querySelector('#pdf-logo-final') as HTMLImageElement;
    if (imgElement) {
      if ('decode' in imgElement) {
        try { await imgElement.decode(); } catch (e) { console.warn("Image decode notice", e); }
      } else {
        await new Promise((resolve) => {
          if (imgElement.complete && imgElement.naturalHeight !== 0) resolve(null);
          else {
            imgElement.onload = () => resolve(null);
            imgElement.onerror = () => resolve(null);
          }
        });
      }
    }
    
    await new Promise(r => setTimeout(r, 250));
    
    try {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `comprobante_egreso_${selectedInvoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: ['tr', '.avoid-break', 'tbody'] }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-[#1A4D2E] p-2.5 rounded-2xl shadow-md shadow-emerald-900/15 text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">MÓDULO DE DESPACHOS</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión Unificada e Integrada de Egresos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedInvoice && (
            <button 
              onClick={generatePDF}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Printer size={16} /> Imprimir Comprobante Neutral
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-black text-emerald-800 shadow-xs">
            {user.name?.[0] || 'U'}
          </div>
        </div>
      </header>

      {/* Main Single-Page Scrollable Workspace */}
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <AnimatePresence mode="wait">
          {!selectedInvoice ? (
            /* ============================================================ */
            /* INVOICE SELECTION LIST VIEW                                 */
            /* ============================================================ */
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6"
            >
              {/* Search and Filter Tabs Bar */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
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
            </motion.div>
          ) : (
            /* ============================================================ */
            /* SINGLE-PAGE UNIFIED DISPATCH & SCANNER WORKSPACE            */
            /* ============================================================ */
            <motion.div 
              key="detail"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 p-4 sm:p-6 space-y-6 max-w-[1600px] w-full mx-auto"
            >
              {/* Header Info & Action Controls */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <button 
                    onClick={() => setSelectedInvoice(null)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer shrink-0"
                    title="Volver a lista de egresos"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 leading-none">{selectedInvoice.client}</h2>
                      <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-lg">
                        #{selectedInvoice.id.replace('INV-', '')}
                      </span>
                      {selectedInvoice.status === 'despachado' ? (
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 size={15} /> DESPACHADO
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={15} /> EN PROCESO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      NIT: {selectedInvoice.nit || 'C/F'} | Dirección: {selectedInvoice.address || 'Ciudad'} | Teléfono: {selectedInvoice.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button 
                    onClick={generatePDF}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                  >
                    <Printer size={16} /> GENERAR COMPROBANTE
                  </button>

                  {selectedInvoice.status !== 'despachado' ? (
                    <button 
                      onClick={handleDispatch}
                      disabled={isDispatching}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDispatching ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      FINALIZAR DESPACHO
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded-xl flex items-center gap-1.5">
                      <History size={16} /> DESPACHADO EL {new Date().toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Stats Dashboard Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                    <Package size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ítems Registrados</span>
                    <span className="text-xl font-black text-slate-900">{orderStats.totalItems} Productos</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                    <Layers size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Unidades Totales</span>
                    <span className="text-xl font-black text-slate-900">{orderStats.totalQtyNeeded} Unidades</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                    <CheckCheck size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Despachadas</span>
                    <span className="text-xl font-black text-emerald-900">{orderStats.totalQtyDispatched} / {orderStats.totalQtyNeeded} Uds</span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">Progreso Global</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">{orderStats.percent}%</span>
                  </div>
                  <div className="w-full bg-white/15 h-2.5 rounded-full mt-3 overflow-hidden z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${orderStats.percent}%` }}
                      className="h-full bg-emerald-400 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Main Single-Page Split Layout (Left: Product Table | Right: Scanner & Live Feed) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Product Table & Batch Toolbar (Col Span 7 on Desktop) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Toolbar & Search */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input 
                        type="text" 
                        placeholder="Buscar producto o código..." 
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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

                  {/* Product Table Container with Smooth Scrolling */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto max-h-[580px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider z-10">
                          <tr>
                            <th className="py-3.5 px-4 w-12 text-center">Estado</th>
                            <th className="py-3.5 px-4 w-28">Código SKU</th>
                            <th className="py-3.5 px-4">Descripción del Producto</th>
                            <th className="py-3.5 px-4 w-32 text-center">Progreso</th>
                            <th className="py-3.5 px-4 w-28 text-center">Unidades</th>
                            {selectedInvoice.status !== 'despachado' && (
                              <th className="py-3.5 px-4 w-32 text-right">Acciones</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredInvoiceItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                No se encontraron productos en esta orden
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
                                    "transition-colors hover:bg-slate-50/80",
                                    isDone && "bg-emerald-50/20"
                                  )}
                                >
                                  {/* Status Icon */}
                                  <td className="py-3.5 px-4 text-center">
                                    {isDone ? (
                                      <div className="w-6 h-6 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Check size={15} strokeWidth={3} />
                                      </div>
                                    ) : isPartial ? (
                                      <div className="w-6 h-6 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[10px]">
                                        {dispatchedQty}
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                        <Clock size={13} />
                                      </div>
                                    )}
                                  </td>

                                  {/* SKU Code */}
                                  <td className="py-3.5 px-4">
                                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                      <Barcode size={11} className="text-slate-400" />
                                      {item.productId}
                                    </span>
                                  </td>

                                  {/* Product Name */}
                                  <td className="py-3.5 px-4">
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

                                  {/* Progress Bar */}
                                  <td className="py-3.5 px-4">
                                    <div className="w-full space-y-1">
                                      <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono">
                                        <span>{progressPct}%</span>
                                        <span>{dispatchedQty}/{item.quantity}</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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

                                  {/* Quantity Badge */}
                                  <td className="py-3.5 px-4 text-center font-mono font-black text-xs">
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded-lg",
                                      isDone ? "bg-emerald-100 text-emerald-900" : isPartial ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
                                    )}>
                                      {dispatchedQty} / {item.quantity}
                                    </span>
                                  </td>

                                  {/* Quick Actions */}
                                  {selectedInvoice.status !== 'despachado' && (
                                    <td className="py-3.5 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button 
                                          onClick={() => adjustQuantity(item.productId, -1)}
                                          disabled={dispatchedQty <= 0}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 transition-all cursor-pointer"
                                          title="Restar 1"
                                        >
                                          <Minus size={13} />
                                        </button>
                                        <button 
                                          onClick={() => adjustQuantity(item.productId, 1)}
                                          disabled={dispatchedQty >= item.quantity}
                                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-800 disabled:opacity-30 transition-all cursor-pointer"
                                          title="Sumar 1"
                                        >
                                          <Plus size={13} />
                                        </button>
                                        <button 
                                          onClick={() => handleMarkLineComplete(item.productId)}
                                          disabled={isDone}
                                          className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 rounded-lg disabled:opacity-30 transition-all cursor-pointer ml-1"
                                          title="Marcar línea completa"
                                        >
                                          <CheckCheck size={15} />
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

                {/* Right Column: Scanner Control & Live Scan Feed Panel (Col Span 5 on Desktop) */}
                <div className="lg:col-span-5 space-y-4">
                  
                  {/* Scanner Main Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
                    
                    {/* Scanner Panel Header & Manual Toggle */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-white">
                          <QrCode size={16} className="text-emerald-400" />
                          PANEL DE ESCANEO
                        </h3>
                        <p className="text-[10px] text-emerald-400/80 font-bold mt-0.5">Escáner USB Activo | Cámara Opcional</p>
                      </div>

                      <button
                        onClick={() => setIsCameraActive(!isCameraActive)}
                        disabled={selectedInvoice.status === 'despachado'}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-30",
                          isCameraActive 
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                        )}
                      >
                        {isCameraActive ? (
                          <>
                            <CameraOff size={14} /> Apagar Cámara
                          </>
                        ) : (
                          <>
                            <Camera size={14} /> Activar Cámara
                          </>
                        )}
                      </button>
                    </div>

                    {/* Camera Scanner View or Inactive Placeholder */}
                    {isCameraActive ? (
                      <StableScanner 
                        onScan={handleScan}
                        disabled={selectedInvoice.status === 'despachado'}
                        isFlashActive={isFlashActive}
                        resetKey={scannerResetKey}
                      />
                    ) : (
                      <div className="aspect-square bg-slate-950 rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                        <div className="w-14 h-14 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                          <CameraOff size={28} />
                        </div>
                        <p className="text-white font-black text-xs uppercase tracking-wider">Cámara Desactivada</p>
                        <p className="text-slate-400 text-[10px] font-bold mt-1.5 max-w-[220px] leading-relaxed">
                          Haz clic en &quot;Activar Cámara&quot; si deseas usar la webcam/móvil. El escáner USB físico sigue activo al 100%.
                        </p>
                      </div>
                    )}

                    {/* Last Code Scanned Banner */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Último Código Detectado</span>
                      <p className="text-sm font-mono font-bold text-emerald-300 truncate">
                        {scannedData || 'Esperando lectura de código...'}
                      </p>
                    </div>

                    {/* Real-Time Scan History Log */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Historial de Lecturas</span>
                      {scanLogs.length === 0 ? (
                        <div className="text-center py-5 text-white/30 text-xs font-medium border border-white/5 rounded-2xl">
                          Sin lecturas registradas en esta sesión
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
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

                  {/* Recipient Details & Shipping Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Building2 size={16} className="text-emerald-700" />
                      Datos Generales de la Orden
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Cliente</span>
                        <span className="font-bold text-slate-900 block truncate">{selectedInvoice.client}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">NIT / ID</span>
                        <span className="font-mono font-bold text-slate-900 block">{selectedInvoice.nit || 'C/F'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Forma de Pago</span>
                        <span className="font-bold text-slate-900 block">{selectedInvoice.paymentMethod || 'CREDITO'}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Vendedor</span>
                        <span className="font-bold text-slate-900 block truncate">{selectedInvoice.seller || 'Sistema'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

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
