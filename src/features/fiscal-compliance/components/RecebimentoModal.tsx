'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Upload, Search, FileText } from 'lucide-react';

interface RecebimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecebimentoModal({ isOpen, onClose }: RecebimentoModalProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { useEmpresaId } = require('@/shared/hooks/useEmpresaId'); // Dynamic import to avoid build cycle if any
  const empresaId = useEmpresaId();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!empresaId) return;
    setImporting(true);
    try {
      const { xmlService } = await import('@/modules/fiscal/services/xmlService');
      const result = await xmlService.importarLote(empresaId, files);
      if (result.success) {
        alert(`Importação concluída! ${result.importadas} notas importadas.`);
      } else {
        alert(`Erro na importação. ${result.erros.length} erros encontrados.`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao processar arquivos.');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center border border-teal-500/20">
              <Download className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recebimento de Mercadorias</h2>
              <p className="text-sm text-gray-400">Importação de XML e Gestão de Notas de Entrada</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xml"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importando...' : 'Importar XML'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-1 max-w-md bg-black/20 border border-white/5 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Buscar por chave, emitente..." className="bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500 w-full" />
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 transition-colors ${dragActive ? 'bg-teal-500/10 border-2 border-dashed border-teal-500/50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FileText className={`w-16 h-16 ${dragActive ? 'text-teal-400 animate-bounce' : 'opacity-20'}`} />
          <p>{dragActive ? 'Solte os arquivos XML aqui' : 'Nenhuma nota de entrada pendente'}</p>
          <div className="text-xs text-gray-600 max-w-xs text-center">
            Arraste arquivos XML para cá ou clique em "Importar XML" para lançar notas de entrada.
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modal, document.body) : null;
}
