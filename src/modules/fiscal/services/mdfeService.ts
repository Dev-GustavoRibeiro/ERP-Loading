'use client';

import { createLegacyTenantClient as createClient } from '@/shared/lib/supabase/client';

// =====================================================
// MDF-e Service
// Manifesto Eletrônico de Documentos Fiscais
// =====================================================

export interface Mdfe {
  id: string;
  empresa_id: string;
  status: 'digitacao' | 'validado' | 'assinado' | 'transmitido' | 'autorizado' | 'rejeitado' | 'encerrado' | 'cancelado';
  numero?: number;
  serie?: number;
  chave_acesso?: string;
  data_emissao?: string;
  tipo_emitente: '1' | '2' | '3'; // 1=Prestador Serviço, 2=Transp. Conta Própria, 3=Transp. CTC
  modalidade: '1' | '2'; // 1=Rodoviário, 2=Aéreo...
  uf_ini: string;
  uf_fim: string;
  motorista_nome?: string;
  motorista_cpf?: string;
  veiculo_placa?: string;
  valor_total_carga?: number;
  peso_bruto_carga?: number;
  created_at: string;
}

export const mdfeService = {

  async listar(empresaId: string): Promise<Mdfe[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('fiscal_mdfe')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async criar(dados: Partial<Mdfe>): Promise<Mdfe> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('fiscal_mdfe')
      .insert(dados)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async atualizar(id: string, dados: Partial<Mdfe>): Promise<Mdfe> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('fiscal_mdfe')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Ações Mockadas por enquanto (Backend real necessário para assinatura/transmissão)

  async transmitir(id: string): Promise<Mdfe> {
    // Mock: Gera chave, número e autoriza
    const updates = {
      status: 'autorizado',
      chave_acesso: '352402' + Math.random().toString().slice(2, 16) + '5800100000001000000001',
      numero: Math.floor(Math.random() * 1000) + 1,
      serie: 1,
      data_emissao: new Date().toISOString()
    };
    return this.atualizar(id, updates as any);
  },

  async encerrar(id: string): Promise<Mdfe> {
    return this.atualizar(id, { status: 'encerrado' });
  },

  async cancelar(id: string): Promise<Mdfe> {
    return this.atualizar(id, { status: 'cancelado' });
  }

};

export default mdfeService;
