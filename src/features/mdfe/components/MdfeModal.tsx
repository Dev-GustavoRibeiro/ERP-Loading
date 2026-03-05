'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Plus, Truck, FileText, CheckCircle,
  MapPin, AlertCircle, Ban, ArrowRight, MoreHorizontal
} from 'lucide-react';
import { useMdfe } from '@/features/mdfe/hooks/useMdfe';
import { useEmpresaId } from '@/shared/hooks/useEmpresaId';
import type { Mdfe } from '@/modules/fiscal/services/mdfeService';

interface MdfeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MdfeModal({ isOpen, onClose }: MdfeModalProps) {
  const empresaId = useEmpresaId();
  const { mdfes, isLoading, createMdfe, transmitMdfe, closeMdfe } = useMdfe(empresaId);

  const [view, setView] = useState<'list' | 'create'>('list');
  const [formData, setFormData] = useState<Partial<Mdfe>>({
    tipo_emitente: '1',
    modalidade: '1',
    uf_ini: 'SP',
    uf_fim: 'RJ'
  });

  const handleCreate = async () => {
    try {
      if (!formData.motorista_nome || !formData.veiculo_placa) {
        alert('Preencha os campos obrigatórios');
        return;
      }
      await createMdfe(formData);
      setView('list');
      setFormData({ tipo_emitente: '1', modalidade: '1', uf_ini: 'SP', uf_fim: 'RJ' });
    } catch (err) {
      console.error(err);
      alert('Erro ao criar MDF-e');
    }
  };

  const handleTransmit = async (id: string) => {
    if (confirm('Deseja transmitir este MDF-e para a SEFAZ?')) {
      try {
        await transmitMdfe(id);
      } catch (err) {
        alert('Erro ao transmitir');
      }
    }
  };

  const handleCloseMdfe = async (id: string) => {
    if (confirm('Deseja encerrar este MDF-e? A operação não pode ser desfeita.')) {
      try {
        await closeMdfe(id);
      } catch (err) {
        alert('Erro ao encerrar');
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0f1219] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {view === 'list' ? 'Manifesto Eletrônico (MDF-e)' : 'Novo MDF-e'}
              </h2>
              <p className="text-sm text-gray-400">
                {view === 'list' ? 'Gerencie seus manifestos de carga' : 'Preencha os dados do transporte'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view === 'create' && (
              <button onClick={() => setView('list')} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancelar
              </button>
            )}
            {view === 'list' && (
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Manifesto
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-[#0a0c10]">
          {view === 'list' ? (
            <div className="p-6">
              {/* Filters */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 flex-1 max-w-md bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input type="text" placeholder="Buscar por número, placa, motorista..." className="bg-transparent border-none outline-none text-sm text-white placeholder:text-gray-500 w-full" />
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#0f1219] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Série/Número</th>
                      <th className="px-6 py-4">Data Emissão</th>
                      <th className="px-6 py-4">Percurso</th>
                      <th className="px-6 py-4">Motorista/Veículo</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {isLoading ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>
                    ) : mdfes.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum MDF-e encontrado.</td></tr>
                    ) : (
                      mdfes.map((mdfe: Mdfe) => (
                        <tr key={mdfe.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <StatusBadge status={mdfe.status} />
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {mdfe.serie}/{mdfe.numero || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            {mdfe.data_emissao ? new Date(mdfe.data_emissao).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            <div className="flex items-center gap-1">
                              <span>{mdfe.uf_ini}</span>
                              <ArrowRight className="w-3 h-3 text-gray-600" />
                              <span>{mdfe.uf_fim}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">
                            <div className="flex flex-col">
                              <span className="text-white">{mdfe.veiculo_placa}</span>
                              <span className="text-xs text-gray-500">{mdfe.motorista_nome}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {mdfe.status === 'digitacao' && (
                                <button onClick={() => handleTransmit(mdfe.id)} className="text-xs text-blue-400 hover:text-blue-300 hover:underline">Transmitir</button>
                              )}
                              {mdfe.status === 'autorizado' && (
                                <button onClick={() => handleCloseMdfe(mdfe.id)} className="text-xs text-green-400 hover:text-green-300 hover:underline">Encerrar</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-3xl mx-auto">
              <div className="bg-[#0f1219] border border-white/10 rounded-xl p-8 space-y-6">
                <h3 className="text-lg font-medium text-white border-b border-white/5 pb-4">Dados do Transporte</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">UF Início</label>
                    <input
                      type="text"
                      value={formData.uf_ini}
                      onChange={e => setFormData({ ...formData, uf_ini: e.target.value.toUpperCase().slice(0, 2) })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">UF Fim</label>
                    <input
                      type="text"
                      value={formData.uf_fim}
                      onChange={e => setFormData({ ...formData, uf_fim: e.target.value.toUpperCase().slice(0, 2) })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Placa do Veículo</label>
                    <input
                      type="text"
                      value={formData.veiculo_placa}
                      onChange={e => setFormData({ ...formData, veiculo_placa: e.target.value.toUpperCase() })}
                      placeholder="ABC-1234"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Nome do Motorista</label>
                    <input
                      type="text"
                      value={formData.motorista_nome}
                      onChange={e => setFormData({ ...formData, motorista_nome: e.target.value })}
                      placeholder="João da Silva"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">CPF do Motorista</label>
                    <input
                      type="text"
                      value={formData.motorista_cpf}
                      onChange={e => setFormData({ ...formData, motorista_cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Valor Total Carga (R$)</label>
                    <input
                      type="number"
                      value={formData.valor_total_carga}
                      onChange={e => setFormData({ ...formData, valor_total_carga: parseFloat(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                  <button onClick={() => setView('list')} className="px-6 py-2.5 text-gray-400 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Salvar Manifesto
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    digitacao: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    autorizado: 'bg-green-500/10 text-green-400 border-green-500/20',
    encerrado: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    cancelado: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const labels: any = {
    digitacao: 'Em Digitação',
    autorizado: 'Autorizado',
    encerrado: 'Encerrado',
    cancelado: 'Cancelado'
  };

  return (
    <span className={`px-2 py-0.5 text-xs rounded border uppercase ${styles[status] || styles.digitacao}`}>
      {labels[status] || status}
    </span>
  );
}
