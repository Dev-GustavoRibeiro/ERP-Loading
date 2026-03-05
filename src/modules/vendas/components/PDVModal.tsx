'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@/shared/components/atoms/Portal';
import {
  ShoppingCart, Search, X, Trash2, CreditCard, Banknote, QrCode, Check,
  Loader2, Plus, Minus, User, Percent, ScanBarcode, ArrowLeft, Package,
  Hash, UserSearch, XCircle, RotateCcw, Printer, Info, ChevronDown,
} from 'lucide-react';
import { produtoService } from '@/modules/cadastros/services/produtoService';
import type { Produto } from '@/modules/cadastros/domain';
import { cn } from '@/shared/lib/utils';
import { ApplyCouponPopup } from '@/modules/vendas-features/components/coupons/ApplyCouponPopup';
import { GamificationModal } from '@/modules/vendas-features/components/gamification/GamificationModal';

// =====================================================
// Types
// =====================================================

interface CartItem {
  id: string;
  produto_id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
}

type PaymentMethod = 'dinheiro' | 'credito' | 'debito' | 'pix';

interface Payment {
  tipo: PaymentMethod;
  valor: number;
}

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// =====================================================
// Sub-components
// =====================================================

function FnKey({ label, fKey, onClick, disabled, accent }: { label: string; fKey: string; onClick: () => void; disabled?: boolean; accent?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-all text-[10px] leading-tight min-w-[68px]',
        'border border-white/5 hover:border-white/15 hover:bg-white/5 active:scale-95',
        'disabled:opacity-20 disabled:pointer-events-none',
        accent || 'text-slate-400',
      )}
    >
      <span className="font-bold text-[11px] opacity-60">{fKey}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function PayBtn({ icon: Icon, label, fKey, color, onClick, disabled }: {
  icon: typeof Banknote; label: string; fKey: string; color: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all active:scale-95',
        'disabled:opacity-20 disabled:pointer-events-none',
        color,
      )}
    >
      <Icon className="w-7 h-7" />
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px] opacity-50">{fKey}</span>
    </button>
  );
}

// =====================================================
// PDV Modal
// =====================================================

export function PDVModal({ isOpen, onClose, empresaId }: PDVModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsEndRef = useRef<HTMLDivElement>(null);

  // State
  const [items, setItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const [searching, setSearching] = useState(false);
  const [clienteNome, setClienteNome] = useState('');
  const [descontoVenda, setDescontoVenda] = useState(0);
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [vendaNumero, setVendaNumero] = useState('');
  const [showDescontoInput, setShowDescontoInput] = useState(false);
  const [showClienteInput, setShowClienteInput] = useState(false);
  const [showQtdInput, setShowQtdInput] = useState(false);
  const [showCouponPopup, setShowCouponPopup] = useState(false);
  const [showGamification, setShowGamification] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);
  const [tempQtd, setTempQtd] = useState('');
  const [tempDesconto, setTempDesconto] = useState('');
  const descontoRef = useRef<HTMLInputElement>(null);
  const clienteRef = useRef<HTMLInputElement>(null);
  const qtdRef = useRef<HTMLInputElement>(null);

  // Computed
  const subtotal = items.reduce((acc, i) => acc + i.total, 0);
  const total = Math.max(0, subtotal - descontoVenda);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const troco = Math.max(0, totalPago - total);
  const faltaPagar = Math.max(0, total - totalPago);
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  const totalQtd = items.reduce((a, i) => a + i.quantidade, 0);
  const canPay = items.length > 0 && (faltaPagar > 0 || pagamentos.length === 0);
  const canFinalize = items.length > 0 && faltaPagar <= 0 && pagamentos.length > 0;

  // Effects
  useEffect(() => {
    if (isOpen && !showSuccess) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen, showSuccess]);

  useEffect(() => {
    if (showDescontoInput) setTimeout(() => descontoRef.current?.focus(), 100);
  }, [showDescontoInput]);

  useEffect(() => {
    if (showClienteInput) setTimeout(() => clienteRef.current?.focus(), 100);
  }, [showClienteInput]);

  useEffect(() => {
    if (showQtdInput) setTimeout(() => qtdRef.current?.focus(), 100);
  }, [showQtdInput]);

  // Scroll to bottom when items added
  useEffect(() => {
    itemsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items.length]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      // Don't intercept when inline inputs are focused
      const tag = (e.target as HTMLElement)?.tagName;
      const isInputFocused = tag === 'INPUT' && e.target !== inputRef.current;

      if (e.key === 'Escape') {
        if (showDescontoInput) { setShowDescontoInput(false); inputRef.current?.focus(); }
        else if (showClienteInput) { setShowClienteInput(false); inputRef.current?.focus(); }
        else if (showQtdInput) { setShowQtdInput(false); inputRef.current?.focus(); }
        else if (showSuccess) handleNovaVenda();
        else onClose();
        e.preventDefault(); return;
      }

      if (isInputFocused) return;

      if (e.key === 'F1') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'F2') { e.preventDefault(); handleOpenQtd(); }
      if (e.key === 'F3') { e.preventDefault(); setShowCouponPopup(true); }
      if (e.key === 'F4') { e.preventDefault(); setShowCouponPopup(true); }
      if (e.key === 'F5') { e.preventDefault(); handleAddPayment('dinheiro'); }
      if (e.key === 'F6') { e.preventDefault(); handleAddPayment('credito'); }
      if (e.key === 'F7') { e.preventDefault(); handleAddPayment('debito'); }
      if (e.key === 'F8') { e.preventDefault(); handleAddPayment('pix'); }
      if (e.key === 'F9') { e.preventDefault(); handleOpenCliente(); }
      if (e.key === 'F10') { e.preventDefault(); handleCancelarItem(); }
      if (e.key === 'F11') { e.preventDefault(); handleNovaVenda(); }
      if (e.key === 'F12') { e.preventDefault(); handleFinalizarVenda(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, items, faltaPagar, showSuccess, showDescontoInput, showClienteInput, showQtdInput, pagamentos]);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => handleSearch(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm, empresaId]);

  // Handlers
  const handleSearch = async (term: string) => {
    if (!empresaId || term.length < 2) return;
    setSearching(true);
    try {
      const r = await produtoService.list(empresaId, { search: term, pageSize: 8, filters: { ativo: true } });
      setSearchResults(r.data);
    } catch { /* */ } finally { setSearching(false); }
  };

  const handleAddProduct = (p: Produto) => {
    const existing = items.find(i => i.produto_id === p.id);
    if (existing) {
      setItems(prev => prev.map(i =>
        i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1, total: (i.quantidade + 1) * i.preco_unitario } : i
      ));
    } else {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), produto_id: p.id, codigo: p.codigo,
        descricao: p.descricao, quantidade: 1, preco_unitario: p.preco_venda, total: p.preco_venda,
      }]);
    }
    setSearchTerm(''); setSearchResults([]); inputRef.current?.focus();
  };

  const handleUpdateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const q = Math.max(0, i.quantidade + delta);
      return q === 0 ? null as any : { ...i, quantidade: q, total: q * i.preco_unitario };
    }).filter(Boolean));
  };

  const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const handleCancelarItem = () => {
    if (items.length === 0) return;
    setItems(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleOpenQtd = () => {
    if (!lastItem) return;
    setTempQtd(String(lastItem.quantidade));
    setShowQtdInput(true);
  };

  const handleConfirmQtd = () => {
    const q = parseInt(tempQtd);
    if (!lastItem || !q || q < 1) { setShowQtdInput(false); return; }
    setItems(prev => prev.map(i =>
      i.id === lastItem.id ? { ...i, quantidade: q, total: q * i.preco_unitario } : i
    ));
    setShowQtdInput(false);
    inputRef.current?.focus();
  };

  const handleDescontoItem = () => {
    // Desconto manual bloqueado - somente via cupom
    setShowCouponPopup(true);
  };

  const handleOpenDesconto = () => {
    // Desconto manual bloqueado - somente via cupom
    setShowCouponPopup(true);
  };

  const handleConfirmDesconto = () => {
    setDescontoVenda(parseFloat(tempDesconto) || 0);
    setShowDescontoInput(false);
    inputRef.current?.focus();
  };

  const handleApplyCoupon = (couponId: string, code: string, discountAmount: number) => {
    setAppliedCoupon({ id: couponId, code, discount: discountAmount });
    setDescontoVenda(discountAmount);
    inputRef.current?.focus();
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDescontoVenda(0);
    inputRef.current?.focus();
  };

  const handleOpenCliente = () => setShowClienteInput(true);

  const handleConfirmCliente = () => {
    setShowClienteInput(false);
    inputRef.current?.focus();
  };

  const handleAddPayment = (tipo: PaymentMethod) => {
    if (!canPay) return;
    const valor = pagamentos.length === 0 ? total : faltaPagar;
    if (valor <= 0) return;
    setPagamentos(prev => [...prev, { tipo, valor }]);
  };

  const handleRemovePayment = (idx: number) => setPagamentos(prev => prev.filter((_, i) => i !== idx));

  const handleFinalizarVenda = async () => {
    if (!canFinalize) return;
    setLoading(true);
    try {
      setVendaNumero(`PDV-${Date.now().toString(36).toUpperCase()}`);
      await new Promise(r => setTimeout(r, 500));
      setShowSuccess(true);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleNovaVenda = () => {
    setItems([]); setPagamentos([]); setDescontoVenda(0); setClienteNome('');
    setSearchTerm(''); setSearchResults([]); setVendaNumero('');
    setShowSuccess(false); setShowDescontoInput(false); setShowClienteInput(false); setShowQtdInput(false);
    setAppliedCoupon(null); setShowCouponPopup(false); setShowGamification(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleClose = () => { handleNovaVenda(); onClose(); };

  const payLabel = (t: PaymentMethod) => t === 'dinheiro' ? 'Dinheiro' : t === 'credito' ? 'Crédito' : t === 'debito' ? 'Débito' : 'PIX';
  const payColor = (t: PaymentMethod) => t === 'dinheiro' ? 'text-green-400' : t === 'credito' ? 'text-blue-400' : t === 'debito' ? 'text-violet-400' : 'text-teal-400';

  if (!isOpen) return null;

  return (
    <Portal>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#080c12] flex flex-col select-none">

        {/* ═══════════ HEADER ═══════════ */}
        <header className="bg-[#0e1420] border-b border-emerald-500/20 px-5 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-1.5 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">PONTO DE VENDA</p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5">Operador: Caixa 01</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Cliente badge */}
            <div
              onClick={handleOpenCliente}
              className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:border-white/20 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm text-slate-300">{clienteNome || 'Consumidor Final'}</span>
              <ChevronDown className="w-3 h-3 text-slate-600" />
            </div>

            {/* Gamification Button */}
            <button
              onClick={() => setShowGamification(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
              title="Missões & Ranking"
            >
              <span className="text-base">🏆</span>
              <span className="text-xs font-bold text-amber-400">XP</span>
            </button>

            {/* Relógio */}
            <span className="text-xs text-slate-600 font-mono tabular-nums">
              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>

            <button onClick={handleClose} className="p-1.5 hover:bg-white/5 rounded-lg"><X className="w-4 h-4 text-slate-600" /></button>
          </div>
        </header>

        {/* ═══════════ SEARCH ═══════════ */}
        <div className="px-5 py-2.5 bg-[#0b1018] shrink-0 relative z-20">
          <div className="relative">
            <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/40" />
            <input
              ref={inputRef}
              type="text"
              placeholder="F1 · Buscar produto por nome, código ou código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length === 1) handleAddProduct(searchResults[0]);
                if (e.key === 'Enter' && searchResults.length > 1) handleAddProduct(searchResults[0]);
              }}
              className="w-full pl-12 pr-12 py-3.5 bg-[#111a26] border-2 border-emerald-500/20 rounded-xl text-white text-lg font-mono focus:outline-none focus:border-emerald-500/60 placeholder:text-slate-700 placeholder:font-sans placeholder:text-base transition-colors"
              autoFocus
            />
            {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-emerald-400" />}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && searchTerm.length >= 2 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute left-5 right-5 top-full mt-1 bg-[#131d2b] border border-emerald-500/20 rounded-xl overflow-hidden shadow-2xl shadow-black/50 max-h-80 overflow-y-auto scrollbar-none"
              >
                {searchResults.map((p, i) => (
                  <button key={p.id} onClick={() => handleAddProduct(p)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center justify-between text-left transition-colors',
                      'hover:bg-emerald-500/10 border-b border-white/5 last:border-0',
                      i === 0 && 'bg-emerald-500/5'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{p.descricao}</p>
                        <p className="text-xs text-slate-600">Cód: {p.codigo} {p.codigo_barras ? `· EAN: ${p.codigo_barras}` : ''} · Est: {p.estoque_atual ?? '-'}</p>
                      </div>
                    </div>
                    <span className="text-emerald-400 font-bold text-base font-mono ml-3 shrink-0">R$ {fmt(p.preco_venda)}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════ MAIN AREA ═══════════ */}
        <div className="flex-1 flex min-h-0">

          {/* ── LEFT: Last item + Items list ── */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Last item banner */}
            {lastItem && (
              <div className="mx-5 mt-3 mb-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-5 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{lastItem.descricao}</p>
                    <p className="text-emerald-400/70 text-sm">{lastItem.codigo} · {lastItem.quantidade} x R$ {fmt(lastItem.preco_unitario)}</p>
                  </div>
                </div>
                <p className="text-emerald-400 text-2xl font-bold font-mono">R$ {fmt(lastItem.total)}</p>
              </div>
            )}

            {/* Items table */}
            <div className="flex-1 overflow-auto mx-5 mb-2">
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center opacity-20">
                    <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-500 text-lg">Busque um produto para iniciar a venda</p>
                    <p className="text-slate-700 text-sm mt-1">Use o leitor de código de barras ou digite F1</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#080c12] z-[1]">
                    <tr className="text-slate-600 text-[10px] uppercase tracking-widest">
                      <th className="text-left py-2 px-3 w-10">#</th>
                      <th className="text-left py-2 w-20">Código</th>
                      <th className="text-left py-2">Descrição</th>
                      <th className="text-center py-2 w-24">Qtd</th>
                      <th className="text-right py-2 w-28">Unitário</th>
                      <th className="text-right py-2 w-28">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className={cn(
                        'border-t border-white/[0.03] transition-colors',
                        idx === items.length - 1 ? 'bg-emerald-500/[0.03]' : 'hover:bg-white/[0.02]'
                      )}>
                        <td className="py-2 px-3 text-slate-600 font-mono text-xs">{idx + 1}</td>
                        <td className="py-2 text-slate-500 font-mono text-xs">{item.codigo}</td>
                        <td className="py-2 text-white">{item.descricao}</td>
                        <td className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleUpdateQty(item.id, -1)} className="p-0.5 hover:bg-white/10 rounded"><Minus className="w-3 h-3 text-slate-500" /></button>
                            <span className="w-7 text-center text-white font-mono font-bold">{item.quantidade}</span>
                            <button onClick={() => handleUpdateQty(item.id, 1)} className="p-0.5 hover:bg-white/10 rounded"><Plus className="w-3 h-3 text-slate-500" /></button>
                          </div>
                        </td>
                        <td className="py-2 text-right text-slate-500 font-mono">{fmt(item.preco_unitario)}</td>
                        <td className="py-2 text-right text-emerald-400 font-mono font-bold">{fmt(item.total)}</td>
                        <td className="py-2 pr-1">
                          <button onClick={() => handleRemoveItem(item.id)} className="p-1 hover:bg-red-500/20 rounded text-slate-800 hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div ref={itemsEndRef} />
            </div>
          </div>

          {/* ── RIGHT: Total + Payment ── */}
          <div className="w-[340px] bg-[#0b1018] border-l border-white/5 flex flex-col shrink-0">

            {/* TOTAL display */}
            <div className="p-5 bg-gradient-to-b from-emerald-500/[0.06] to-transparent">
              <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Total da Venda</p>
                <p className="text-4xl font-black text-emerald-400 font-mono leading-none tracking-tight">
                  R$ {fmt(total)}
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-3 text-xs">
                <span className="text-slate-600">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-600">{totalQtd} un.</span>
                {descontoVenda > 0 && (
                  <>
                    <span className="text-slate-700">·</span>
                    {appliedCoupon ? (
                      <span className="text-amber-500/70 flex items-center gap-1">
                        🎟️ {appliedCoupon.code}: -{fmt(descontoVenda)}
                        <button onClick={handleRemoveCoupon} className="ml-1 p-0.5 hover:bg-red-500/20 rounded text-red-400/50 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : (
                      <span className="text-amber-500/70">Desc: -{fmt(descontoVenda)}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Payment grid */}
            <div className="p-4">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">Forma de Pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <PayBtn icon={Banknote} label="Dinheiro" fKey="F5" onClick={() => handleAddPayment('dinheiro')} disabled={!canPay}
                  color="text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/15" />
                <PayBtn icon={CreditCard} label="Crédito" fKey="F6" onClick={() => handleAddPayment('credito')} disabled={!canPay}
                  color="text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15" />
                <PayBtn icon={CreditCard} label="Débito" fKey="F7" onClick={() => handleAddPayment('debito')} disabled={!canPay}
                  color="text-violet-400 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15" />
                <PayBtn icon={QrCode} label="PIX" fKey="F8" onClick={() => handleAddPayment('pix')} disabled={!canPay}
                  color="text-teal-400 border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/15" />
              </div>
            </div>

            {/* Payment summary */}
            <div className="px-4 flex-1 overflow-auto space-y-1.5">
              {pagamentos.map((pag, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                  <span className={cn('text-xs font-semibold', payColor(pag.tipo))}>{payLabel(pag.tipo)}</span>
                  <div className="flex items-center gap-2">
                    <input type="number" value={pag.valor} onChange={(e) => {
                      const np = [...pagamentos]; np[idx] = { ...np[idx], valor: parseFloat(e.target.value) || 0 }; setPagamentos(np);
                    }} className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-right text-white text-xs font-mono focus:outline-none focus:border-emerald-500/50" />
                    <button onClick={() => handleRemovePayment(idx)} className="p-0.5 hover:bg-red-500/20 rounded text-slate-700 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Falta / Troco */}
            {pagamentos.length > 0 && (
              <div className="px-4 pb-2 space-y-1">
                {faltaPagar > 0 && (
                  <div className="flex justify-between bg-red-500/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-red-400 font-medium">Falta</span>
                    <span className="text-red-400 font-mono font-bold">R$ {fmt(faltaPagar)}</span>
                  </div>
                )}
                {troco > 0 && (
                  <div className="flex justify-between bg-yellow-500/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-yellow-400 font-medium">Troco</span>
                    <span className="text-yellow-400 font-mono font-bold">R$ {fmt(troco)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Finalize */}
            <div className="p-4 border-t border-white/5">
              <button onClick={handleFinalizarVenda} disabled={!canFinalize || loading}
                className={cn(
                  'w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2',
                  canFinalize
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]'
                    : 'bg-white/5 text-slate-700 cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <><Check className="w-5 h-5" /> FINALIZAR · F12</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════ FUNCTION BAR ═══════════ */}
        <div className="bg-[#0a0f18] border-t border-white/5 px-4 py-1.5 flex items-center gap-1.5 shrink-0 overflow-x-auto">
          <FnKey fKey="F1" label="Buscar" onClick={() => inputRef.current?.focus()} accent="text-slate-300" />
          <FnKey fKey="F2" label="Qtd" onClick={handleOpenQtd} disabled={!lastItem} accent="text-cyan-400" />
          <FnKey fKey="F3" label="Cupom" onClick={() => setShowCouponPopup(true)} disabled={items.length === 0} accent="text-amber-400" />
          <FnKey fKey="F4" label="Cupom" onClick={() => setShowCouponPopup(true)} disabled={items.length === 0} accent="text-amber-400" />
          <div className="w-px h-6 bg-white/5 mx-1" />
          <FnKey fKey="F5" label="Dinheiro" onClick={() => handleAddPayment('dinheiro')} disabled={!canPay} accent="text-green-400" />
          <FnKey fKey="F6" label="Crédito" onClick={() => handleAddPayment('credito')} disabled={!canPay} accent="text-blue-400" />
          <FnKey fKey="F7" label="Débito" onClick={() => handleAddPayment('debito')} disabled={!canPay} accent="text-violet-400" />
          <FnKey fKey="F8" label="PIX" onClick={() => handleAddPayment('pix')} disabled={!canPay} accent="text-teal-400" />
          <div className="w-px h-6 bg-white/5 mx-1" />
          <FnKey fKey="F9" label="Cliente" onClick={handleOpenCliente} accent="text-slate-300" />
          <FnKey fKey="F10" label="Cancel.Item" onClick={handleCancelarItem} disabled={items.length === 0} accent="text-red-400" />
          <FnKey fKey="F11" label="Nova Venda" onClick={handleNovaVenda} accent="text-slate-300" />
          <div className="flex-1" />
          <FnKey fKey="F12" label="FINALIZAR" onClick={handleFinalizarVenda} disabled={!canFinalize} accent="text-emerald-400" />
          <FnKey fKey="ESC" label="Sair" onClick={handleClose} accent="text-slate-500" />
        </div>

        {/* ═══════════ INLINE POPUPS ═══════════ */}

        {/* Qty input popup */}
        <AnimatePresence>
          {showQtdInput && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setShowQtdInput(false)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-[#151d2b] border border-white/10 rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-white font-semibold mb-1">Alterar Quantidade</p>
                <p className="text-xs text-slate-500 mb-4">{lastItem?.descricao}</p>
                <input ref={qtdRef} type="number" value={tempQtd} onChange={(e) => setTempQtd(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmQtd()}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-2xl text-center font-mono focus:outline-none focus:border-emerald-500/50" />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowQtdInput(false)} className="flex-1 py-2 bg-white/5 rounded-xl text-slate-400 text-sm font-medium">Cancelar</button>
                  <button onClick={handleConfirmQtd} className="flex-1 py-2 bg-emerald-600 rounded-xl text-white text-sm font-medium">Confirmar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Apply Coupon Popup */}
        <ApplyCouponPopup
          isOpen={showCouponPopup}
          onClose={() => setShowCouponPopup(false)}
          onApply={handleApplyCoupon}
          empresaId={empresaId}
          cartTotal={subtotal}
          customerId={null}
        />

        {/* Gamification Hub Modal */}
        <GamificationModal
          isOpen={showGamification}
          onClose={() => setShowGamification(false)}
        />

        {/* Cliente popup */}
        <AnimatePresence>
          {showClienteInput && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setShowClienteInput(false)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-[#151d2b] border border-white/10 rounded-2xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <p className="text-white font-semibold mb-4">Identificar Cliente</p>
                <input ref={clienteRef} type="text" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmCliente()}
                  placeholder="Nome do cliente ou CPF/CNPJ..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-600" />
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setClienteNome(''); setShowClienteInput(false); }} className="flex-1 py-2 bg-white/5 rounded-xl text-slate-400 text-sm font-medium">Limpar</button>
                  <button onClick={handleConfirmCliente} className="flex-1 py-2 bg-emerald-600 rounded-xl text-white text-sm font-medium">Confirmar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════ SUCCESS OVERLAY ═══════════ */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-[#080c12]/95 backdrop-blur-md flex items-center justify-center"
            >
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                  <Check className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-1">Venda Finalizada!</h2>
                <p className="text-slate-500 text-sm">#{vendaNumero}</p>
                <p className="text-3xl font-bold text-emerald-400 font-mono mt-2 mb-2">R$ {fmt(total)}</p>
                {troco > 0 && <p className="text-lg text-yellow-400 font-mono font-bold mb-4">Troco: R$ {fmt(troco)}</p>}
                <div className="flex gap-3 justify-center mt-6">
                  <button onClick={handleNovaVenda} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 text-lg">
                    <Plus className="w-5 h-5" /> Nova Venda
                  </button>
                  <button onClick={handleClose} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-medium transition-colors">Sair</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </Portal>
  );
}
