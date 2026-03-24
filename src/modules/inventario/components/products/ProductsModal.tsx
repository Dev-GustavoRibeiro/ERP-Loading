'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Package, Plus, Search, Loader2, QrCode, ScanBarcode, RefreshCw,
  Trash2, Copy, CheckCheck, Printer, ArrowLeft, Tag, Eye, DollarSign,
  Layers, Clock, ShieldCheck, BarChart2, ChevronDown,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Portal } from '@/shared/components/atoms/Portal';
import { cn } from '@/shared/lib/utils';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import { DataTable, DataTableColumn, fmtMoney, StatusBadge } from '../shared';
import { listItems, createItem, deleteItem } from '@/app/actions/inventario';
import { itemCreateSchema, type ItemCreateInput } from '../../domain/schemas';

// =====================================================
// Types
// =====================================================

export interface ProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ItemRow = Record<string, unknown>;
type ActiveTab = 'list' | 'add';

// =====================================================
// Helpers
// =====================================================

const generateSKU = (category?: string): string => {
  const prefix = category
    ? category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase().padEnd(3, 'X')
    : 'PRD';
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${num}`;
};

const generateBarcode = (sku: string): string => {
  // CODE128 — accepts any ASCII string; use the SKU directly
  return sku || '';
};

const trackingLabel = (t: string) => {
  if (t === 'lot') return { label: 'Lote', cls: 'bg-blue-500/20 text-blue-400' };
  if (t === 'serial') return { label: 'Série', cls: 'bg-purple-500/20 text-purple-400' };
  return null;
};

const costingLabel: Record<string, string> = { standard: 'Padrão', avco: 'Médio', fifo: 'FIFO' };

// =====================================================
// Barcode Renderer
// =====================================================

const BarcodeRenderer: React.FC<{ value: string; height?: number }> = ({ value, height = 60 }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value || value.trim().length < 1) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        width: 1.8,
        height,
        displayValue: true,
        fontSize: 11,
        margin: 6,
        background: 'transparent',
        lineColor: '#cbd5e1',
        fontOptions: 'normal',
        font: 'monospace',
      });
    } catch {
      // barcode value inválido para o formato, silenciar
    }
  }, [value, height]);

  if (!value || value.trim().length < 1) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-600 text-xs"
        style={{ height: height + 24 }}>
        Preencha o SKU ou código de barras
      </div>
    );
  }
  return <svg ref={ref} className="w-full" />;
};

// =====================================================
// Product Detail Dialog
// =====================================================

const ProductDetailDialog: React.FC<{
  product: ItemRow;
  onClose: () => void;
  onDelete: (id: string) => void;
}> = ({ product, onClose, onDelete }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const qrValue = `SKU:${product.sku}|NOME:${product.name}|BC:${product.barcode || product.sku}`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text as string);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const svg = document.getElementById('detail-barcode-svg')?.outerHTML || '';
    const qrSvg = document.getElementById('detail-qr-svg')?.outerHTML || '';
    win.document.write(`
      <html><head><title>Produto - ${product.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h2 { font-size: 22px; margin-bottom: 4px; }
        p { color: #555; margin: 2px 0; font-size: 13px; }
        .grid { display: flex; gap: 32px; margin-top: 24px; align-items: flex-start; }
        .section { text-align: center; }
        .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
        svg { max-width: 220px; }
      </style></head>
      <body>
        <h2>${product.name}</h2>
        <p>SKU: ${product.sku}</p>
        ${product.category ? `<p>Categoria: ${product.category}</p>` : ''}
        ${product.barcode ? `<p>Cód. barras: ${product.barcode}</p>` : ''}
        <div class="grid">
          <div class="section"><div class="label">QR Code</div>${qrSvg}</div>
          <div class="section"><div class="label">Código de Barras</div>${svg}</div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-2xl max-h-[92vh] p-4"
        >
          <div className="bg-[#131c2e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/15 rounded-xl">
                  <Package className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{product.name as string}</h3>
                  <p className="text-xs text-slate-400 font-mono">{product.sku as string}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-slate-300 transition-colors">
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 grid md:grid-cols-2 gap-6">
              {/* Left: info */}
              <div className="space-y-4">
                {/* Meta */}
                <div className="space-y-2">
                  {(
                    [
                      ['SKU', product.sku, 'sku'],
                      ['Código de Barras', product.barcode, 'barcode'],
                      ['Categoria', product.category, null],
                      ['Unidade', product.uom, null],
                    ] as [string, unknown, string | null][]
                  ).map(([label, value, copyKey]) =>
                    value ? (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-white/5">
                        <span className="text-xs text-slate-500">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-white font-mono">{value as string}</span>
                          {copyKey && (
                            <button onClick={() => copy(value as string, copyKey)}
                              className="p-1 hover:bg-white/10 rounded transition-colors">
                              {copied === copyKey
                                ? <CheckCheck className="w-3 h-3 text-emerald-400" />
                                : <Copy className="w-3 h-3 text-slate-500" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const t = trackingLabel(product.tracking_type as string);
                    return t ? <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', t.cls)}>{t.label}</span> : null;
                  })()}
                  {(product.has_expiration as boolean) && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400">Validade</span>
                  )}
                  {(product.costing_method as string) && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-500/20 text-cyan-400">
                      {costingLabel[product.costing_method as string] || product.costing_method as string}
                    </span>
                  )}
                </div>

                {/* Costs & limits */}
                <div className="grid grid-cols-2 gap-2">
                  {(product.standard_cost as number) > 0 && (
                    <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                      <p className="text-[10px] text-slate-500">Custo Padrão</p>
                      <p className="text-sm font-bold text-white">{fmtMoney(product.standard_cost as number)}</p>
                    </div>
                  )}
                  {(product.min_qty as number) > 0 && (
                    <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                      <p className="text-[10px] text-slate-500">Estoque Mín.</p>
                      <p className="text-sm font-bold text-white">{product.min_qty as number}</p>
                    </div>
                  )}
                  {(product.max_qty as number) > 0 && (
                    <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                      <p className="text-[10px] text-slate-500">Estoque Máx.</p>
                      <p className="text-sm font-bold text-white">{product.max_qty as number}</p>
                    </div>
                  )}
                  {(product.lead_time_days as number) > 0 && (
                    <div className="p-3 bg-white/3 border border-white/8 rounded-xl">
                      <p className="text-[10px] text-slate-500">Lead Time</p>
                      <p className="text-sm font-bold text-white">{product.lead_time_days as number}d</p>
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(product.id as string)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/8 hover:bg-red-500/15 border border-red-500/20 rounded-xl text-xs text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir produto
                </button>
              </div>

              {/* Right: QR + barcode */}
              <div className="space-y-4">
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col items-center gap-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">QR Code</p>
                  <div id="detail-qr-svg" className="p-3 bg-white rounded-xl">
                    <QRCodeSVG value={qrValue} size={140} level="M" />
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono text-center break-all">{qrValue}</p>
                </div>

                <div className="bg-white/3 border border-white/8 rounded-xl p-4 flex flex-col items-center gap-2">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Código de Barras</p>
                  <div id="detail-barcode-svg" className="w-full">
                    <BarcodeRenderer value={(product.barcode as string) || (product.sku as string)} height={56} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

// =====================================================
// Add Product Form (inline two-column)
// =====================================================

const AddProductView: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const empresaId = useEmpresaId();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const form = useForm<ItemCreateInput>({
    resolver: zodResolver(itemCreateSchema),
    defaultValues: {
      sku: '', name: '', description: '', category: '', uom: 'un', barcode: '',
      weight: 0, volume: 0,
      tracking_type: 'none', has_expiration: false,
      costing_method: 'standard', standard_cost: 0,
      min_qty: 0, max_qty: 0, lead_time_days: 0,
    },
  });

  const { register, watch, setValue, formState: { errors }, handleSubmit } = form;
  const watchedSku = watch('sku');
  const watchedBarcode = watch('barcode');
  const watchedCategory = watch('category');
  const watchedName = watch('name');

  const qrValue = watchedSku
    ? `SKU:${watchedSku}|NOME:${watchedName || ''}|BC:${watchedBarcode || watchedSku}`
    : '';

  const handleGenerateSku = () => {
    const sku = generateSKU(watchedCategory);
    setValue('sku', sku);
    if (!watchedBarcode) setValue('barcode', sku);
  };

  const handleGenerateBarcode = () => {
    const bc = generateBarcode(watchedSku || generateSKU(watchedCategory));
    setValue('barcode', bc);
    if (!watchedSku) setValue('sku', bc);
  };

  const onSubmit = async (values: ItemCreateInput) => {
    if (!empresaId) return;
    setSaving(true);
    try {
      const res = await createItem(empresaId, values);
      if (res.error) {
        setToast({ msg: res.error, error: true });
        setTimeout(() => setToast(null), 4000);
      } else {
        setToast({ msg: 'Produto criado com sucesso!' });
        setTimeout(() => {
          setToast(null);
          onSuccess();
        }, 1200);
      }
    } catch {
      setToast({ msg: 'Erro ao criar produto', error: true });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (err?: boolean) => cn(
    'w-full px-3 py-2.5 bg-[#1e2535] border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-colors',
    err ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-violet-500/50'
  );
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';
  const errCls = 'text-[10px] text-red-400 mt-1';
  const selectCls = cn(inputCls(), 'appearance-none cursor-pointer');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col lg:flex-row">

          {/* ── Left: Form fields ── */}
          <div className="flex-1 min-w-0 p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-white/5">
            <div className="flex items-center gap-3 pb-2 border-b border-white/8">
              <button type="button" onClick={onCancel}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div>
                <h3 className="text-base font-semibold text-white">Novo Produto</h3>
                <p className="text-[11px] text-slate-500">Preencha as informações do produto</p>
              </div>
            </div>

            {/* Identificação */}
            <fieldset className="space-y-4">
              <legend className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <Tag className="w-3 h-3" /> Identificação
              </legend>

              {/* Nome ocupa linha inteira */}
              <div>
                <label className={labelCls}>Nome <span className="text-red-400">*</span></label>
                <input {...register('name')} placeholder="Ex.: Parafuso M8 Inox" className={inputCls(!!errors.name)} />
                {errors.name && <p className={errCls}>{errors.name.message}</p>}
              </div>

              {/* Categoria + UOM na mesma linha */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Categoria</label>
                  <input {...register('category')} placeholder="Ex.: Fixadores, Elétricos..." className={inputCls()} />
                </div>
                <div>
                  <label className={labelCls}>Unidade (UOM)</label>
                  <select {...register('uom')} className={selectCls}>
                    {['un', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'cx', 'pc', 'par', 'rl', 'bd'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SKU + Barcode lado a lado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>SKU <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <input {...register('sku')} placeholder="PRD-123456" className={cn(inputCls(!!errors.sku), 'font-mono flex-1 min-w-0')} />
                    <button type="button" onClick={handleGenerateSku}
                      className="px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-xl text-xs text-violet-400 font-medium transition-colors flex items-center gap-1 whitespace-nowrap shrink-0">
                      <RefreshCw className="w-3 h-3" />
                      Gerar
                    </button>
                  </div>
                  {errors.sku && <p className={errCls}>{errors.sku.message}</p>}
                </div>
                <div>
                  <label className={labelCls}>Código de Barras</label>
                  <div className="flex gap-2">
                    <input {...register('barcode')} placeholder="EAN / CODE128" className={cn(inputCls(), 'font-mono flex-1 min-w-0')} />
                    <button type="button" onClick={handleGenerateBarcode}
                      className="px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs text-cyan-400 font-medium transition-colors flex items-center gap-1 whitespace-nowrap shrink-0">
                      <ScanBarcode className="w-3 h-3" />
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Descrição</label>
                <textarea {...register('description')} rows={2} placeholder="Descrição opcional do produto..." className={cn(inputCls(), 'resize-none')} />
              </div>
            </fieldset>

            {/* Rastreabilidade */}
            <fieldset className="space-y-4">
              <legend className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <ShieldCheck className="w-3 h-3" /> Rastreabilidade
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Tipo de Rastreamento</label>
                  <select {...register('tracking_type')} className={selectCls}>
                    <option value="none">Nenhum</option>
                    <option value="lot">Por Lote</option>
                    <option value="serial">Por Série</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" {...register('has_expiration')}
                      className="w-4 h-4 rounded border-white/20 bg-[#1e2535] accent-violet-500" />
                    <span className="text-sm text-slate-300">Controlar validade</span>
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Custos */}
            <fieldset className="space-y-4">
              <legend className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <DollarSign className="w-3 h-3" /> Custos e Estoque
              </legend>
              {/* Row 1: Método + Custo Padrão */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Método de Custeio</label>
                  <select {...register('costing_method')} className={selectCls}>
                    <option value="standard">Padrão</option>
                    <option value="avco">Médio Ponderado</option>
                    <option value="fifo">FIFO</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Custo Padrão (R$)</label>
                  <input {...register('standard_cost')} type="number" step="0.01" min="0" placeholder="0,00" className={inputCls()} />
                </div>
              </div>
              {/* Row 2: Estoque Mín/Máx/Lead Time/Peso em 4 colunas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelCls}>Estoque Mínimo</label>
                  <input {...register('min_qty')} type="number" min="0" placeholder="0" className={inputCls()} />
                </div>
                <div>
                  <label className={labelCls}>Estoque Máximo</label>
                  <input {...register('max_qty')} type="number" min="0" placeholder="0" className={inputCls()} />
                </div>
                <div>
                  <label className={labelCls}>Lead Time (dias)</label>
                  <input {...register('lead_time_days')} type="number" min="0" placeholder="0" className={inputCls()} />
                </div>
                <div>
                  <label className={labelCls}>Peso (kg)</label>
                  <input {...register('weight')} type="number" step="0.001" min="0" placeholder="0" className={inputCls()} />
                </div>
              </div>
            </fieldset>

            {/* Submit */}
            <div className="flex gap-3 pt-2 pb-1">
              <button type="button" onClick={onCancel}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-sm text-slate-300 font-medium transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-sm text-white font-semibold transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Salvando...' : 'Criar Produto'}
              </button>
            </div>
          </div>

          {/* ── Right: Live preview ── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 p-8 space-y-6 bg-[#0d1220]/70 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(90vh-8rem)] lg:overflow-y-auto border-l border-white/5">

            <div className="flex items-center gap-2 pb-1 border-b border-white/8">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pré-visualização</p>
            </div>

            {/* QR Code — centralizado e grande */}
            <div className="bg-[#111827]/80 border border-white/8 rounded-2xl p-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 self-start">
                <QrCode className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-slate-300">QR Code</span>
              </div>
              {qrValue ? (
                <div className="p-4 bg-white rounded-2xl shadow-xl">
                  <QRCodeSVG value={qrValue} size={170} level="M" />
                </div>
              ) : (
                <div className="w-[202px] h-[202px] rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 text-slate-600">
                  <QrCode className="w-8 h-8 opacity-20" />
                  <span className="text-xs">Aguardando SKU</span>
                </div>
              )}
              {qrValue && (
                <p className="text-[9px] text-slate-600 font-mono text-center break-all px-2 leading-relaxed max-w-full">
                  {qrValue}
                </p>
              )}
            </div>

            {/* Barcode — maior e bem centralizado */}
            <div className="bg-[#111827]/80 border border-white/8 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-300">Código de Barras</span>
                <span className="ml-auto text-[10px] text-slate-500 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full">CODE128</span>
              </div>
              <div className="bg-white rounded-xl overflow-hidden flex items-center justify-center p-3">
                <BarcodeRenderer
                  value={watchedBarcode || watchedSku || ''}
                  height={72}
                />
              </div>
              {!watchedSku && !watchedBarcode && (
                <p className="text-[11px] text-slate-600 text-center">Preencha o SKU ou código de barras</p>
              )}
            </div>

            {/* Product preview card */}
            {watchedName && (
              <div className="bg-violet-500/8 border border-violet-500/25 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">Cartão do Produto</p>
                <p className="text-base font-semibold text-white leading-snug">{watchedName}</p>
                {watchedSku && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase">SKU</span>
                    <span className="text-xs text-slate-300 font-mono bg-white/5 px-2 py-0.5 rounded">{watchedSku}</span>
                  </div>
                )}
                {watchedCategory && (
                  <span className="inline-block text-[11px] px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/20">{watchedCategory}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </form>

      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl z-[110] flex items-center gap-2',
          toast.error ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        )}>
          {!toast.error && <CheckCheck className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

// =====================================================
// Main Modal
// =====================================================

export const ProductsModal: React.FC<ProductsModalProps> = ({ isOpen, onClose }) => {
  const empresaId = useEmpresaId();
  const [activeTab, setActiveTab] = useState<ActiveTab>('list');
  const [items, setItems] = useState<ItemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewingProduct, setViewingProduct] = useState<ItemRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (q?: string) => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await listItems(empresaId, { pageSize: 200, search: q || undefined });
      setItems((res.data as ItemRow[]) || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    if (isOpen && empresaId && activeTab === 'list') load();
  }, [isOpen, empresaId, activeTab, load]);

  useEffect(() => {
    const t = setTimeout(() => { if (activeTab === 'list') load(search); }, 350);
    return () => clearTimeout(t);
  }, [search, activeTab, load]);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteItem(deleteTarget);
      if (res.error) {
        showToast(res.error, true);
      } else {
        showToast('Produto excluído');
        setViewingProduct(null);
        load(search);
      }
    } catch {
      showToast('Erro ao excluir', true);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns: DataTableColumn<ItemRow>[] = [
    {
      key: 'sku',
      label: 'SKU',
      render: (r) => (
        <span className="font-mono text-xs text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded">
          {r.sku as string}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Produto',
      render: (r) => (
        <div>
          <p className="font-medium text-white text-sm">{r.name as string}</p>
          {(r.description as string) && (
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{r.description as string}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (r) =>
        r.category ? (
          <span className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-300">
            {r.category as string}
          </span>
        ) : <span className="text-slate-600">—</span>,
    },
    {
      key: 'uom',
      label: 'UN',
      render: (r) => <span className="text-sm text-slate-400">{(r.uom as string) || 'un'}</span>,
    },
    {
      key: 'tracking_type',
      label: 'Rastreio',
      render: (r) => {
        const t = trackingLabel(r.tracking_type as string);
        return t ? (
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', t.cls)}>{t.label}</span>
        ) : <span className="text-slate-600 text-xs">Nenhum</span>;
      },
    },
    {
      key: 'standard_cost',
      label: 'Custo',
      render: (r) =>
        (r.standard_cost as number) > 0
          ? <span className="text-sm text-emerald-400 font-medium">{fmtMoney(r.standard_cost as number)}</span>
          : <span className="text-slate-600">—</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setViewingProduct(r); }}
            className="p-1.5 hover:bg-violet-500/20 rounded-lg transition-colors group"
            title="Ver detalhes"
          >
            <Eye className="w-4 h-4 text-slate-400 group-hover:text-violet-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(r.id as string); }}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
          </button>
        </div>
      ),
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      <Portal>
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="products-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
              />
              <motion.div
                key="products-modal"
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                className="fixed inset-0 flex items-center justify-center z-[80] p-4 pointer-events-none"
              >
                <div
                  className="w-full max-w-[1100px] max-h-[90vh] bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/15 rounded-xl">
                        <Package className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Produtos</h2>
                        <p className="text-xs text-slate-400">
                          Catálogo de itens com QR Code e código de barras
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab === 'list' && (
                        <button
                          onClick={() => setActiveTab('add')}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm text-white font-medium transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Novo Produto
                        </button>
                      )}
                      <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Tabs (only visible on list view) */}
                  {activeTab === 'list' && (
                    <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
                      <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar por nome, SKU, categoria..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-[#252d3d] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{total} produto{total !== 1 ? 's' : ''}</span>
                        <button
                          onClick={() => load(search)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Atualizar"
                        >
                          <RefreshCw className={cn('w-4 h-4 text-slate-400', loading && 'animate-spin')} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {activeTab === 'list' ? (
                      <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {items.length === 0 && !loading ? (
                          <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="p-5 bg-violet-500/10 rounded-2xl">
                              <Package className="w-10 h-10 text-violet-400/50" />
                            </div>
                            <div className="text-center">
                              <p className="text-white font-medium">Nenhum produto cadastrado</p>
                              <p className="text-sm text-slate-500 mt-1">Clique em "Novo Produto" para começar</p>
                            </div>
                            <button
                              onClick={() => setActiveTab('add')}
                              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-sm text-white font-medium transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Cadastrar primeiro produto
                            </button>
                          </div>
                        ) : (
                          <div className="bg-[#111827]/50 rounded-xl border border-white/5 overflow-hidden">
                            <DataTable
                              columns={columns}
                              data={items}
                              loading={loading}
                              emptyMessage="Nenhum produto encontrado"
                              getRowId={(r) => r.id as string}
                              onRowClick={(r) => setViewingProduct(r)}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <AddProductView
                        onSuccess={() => { setActiveTab('list'); load(); }}
                        onCancel={() => setActiveTab('list')}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </Portal>

      {/* Product detail dialog */}
      {viewingProduct && (
        <ProductDetailDialog
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onDelete={(id) => {
            setViewingProduct(null);
            handleDelete(id);
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a1f2e] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/15 rounded-xl">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Excluir produto?</h3>
                  <p className="text-xs text-slate-400">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-5">
                O produto só pode ser excluído se não houver saldo em estoque vinculado.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-300 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmDelete} disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-sm text-white font-semibold transition-colors flex items-center justify-center gap-2">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 px-4 py-2.5 rounded-xl text-sm font-medium shadow-2xl z-[120] flex items-center gap-2',
          toast.error ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        )}>
          {!toast.error && <CheckCheck className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </>
  );
};
