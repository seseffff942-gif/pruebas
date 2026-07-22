import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Check, Image as ImageIcon, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../api';

interface HiddenLogoUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUploaded?: (newLogoUrl: string) => void;
}

export function HiddenLogoUploader({ isOpen, onClose, onLogoUploaded }: HiddenLogoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setUploadSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile && !previewUrl) return;

    try {
      setIsUploading(true);
      setErrorMessage('');

      let finalLogoUrl = previewUrl;

      // Try server upload endpoint
      try {
        if (selectedFile) {
          const res = await api.uploadAppLogo(selectedFile);
          if (res && res.logoUrl) {
            finalLogoUrl = res.logoUrl;
          }
        }
      } catch (err) {
        console.warn("Fallo servidor al subir logo, usando almacenamiento local persistente:", err);
      }

      // Persist in localStorage and broadcast global custom event
      localStorage.setItem('app_logo_url', finalLogoUrl);
      window.dispatchEvent(new CustomEvent('app_logo_updated', { detail: finalLogoUrl }));

      if (onLogoUploaded) {
        onLogoUploaded(finalLogoUrl);
      }

      setUploadSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al guardar el logo corporativo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm("¿Restablecer el logo corporativo al predeterminado del sistema?")) {
      const defaultUrl = '/logo_final.jpg';
      localStorage.removeItem('app_logo_url');
      window.dispatchEvent(new CustomEvent('app_logo_updated', { detail: defaultUrl }));
      if (onLogoUploaded) onLogoUploaded(defaultUrl);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-md text-white relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">CARGAR LOGO UNIVERSAL</h3>
                  <p className="text-[10px] font-bold text-slate-400">Menú Secreto de Administración</p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-5">
              {errorMessage && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Preview Dropzone */}
              <div className="relative border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-3xl p-6 text-center transition-all bg-white/[0.02] group flex flex-col items-center justify-center min-h-[180px]">
                {previewUrl ? (
                  <div className="relative w-36 h-36 bg-slate-950 rounded-2xl border border-white/10 p-3 flex items-center justify-center shadow-inner overflow-hidden">
                    <img 
                      src={previewUrl} 
                      alt="Vista previa logo" 
                      className="max-w-full max-h-full object-contain filter drop-shadow-md"
                    />
                    <button
                      onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                      className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition-all"
                      title="Cambiar imagen"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-3 w-full">
                    <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ImageIcon size={28} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Seleccionar Logo Personalizado</p>
                      <p className="text-[10px] text-slate-400 mt-1">Soporta PNG, JPG o WEBP con fondo transparente</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleUpload}
                  disabled={!previewUrl || isUploading || uploadSuccess}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : uploadSuccess ? (
                    <>
                      <Check size={16} /> LOGO GUARDADO GLOBALMENTE
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> APLICAR LOGO EN TODO EL SISTEMA
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetToDefault}
                  className="w-full py-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} /> Restablecer Logo Predeterminado
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
