'use client';

// =====================================================
// Compliance Service (Compra Legal)
// Validação de Fornecedores e Status Fiscal
// =====================================================

export interface FornecedorCompliance {
  cnpj: string;
  razao_social: string;
  status_sefaz: 'ativa' | 'cancelada' | 'denegada' | 'nula';
  ultima_verificacao: string;
  irregularidades: string[];
  score: number; // 0-100
}

export const complianceService = {

  // Simula verificação de conformidade na SEFAZ/Receita
  async verificarFornecedor(cnpj: string): Promise<FornecedorCompliance> {
    // Em produção, isso chamaria uma API externa (ex: ReceitaWS, Sintegra)

    // Mock diff based on CNPJ ending
    const lastDigit = parseInt(cnpj.slice(-1));
    const hasIssues = lastDigit === 0;

    return {
      cnpj,
      razao_social: hasIssues ? 'Fornecedor Irregular LTDA' : 'Fornecedor Exemplo S.A.',
      status_sefaz: hasIssues ? 'cancelada' : 'ativa',
      ultima_verificacao: new Date().toISOString(),
      irregularidades: hasIssues ? ['Inscrição Estadual Suspensa', 'Pendência de IPVA'] : [],
      score: hasIssues ? 35 : 98
    };
  },

  async listarAlertas(): Promise<FornecedorCompliance[]> {
    return [
      {
        cnpj: '12.345.678/0001-90',
        razao_social: 'Indústria Build Fail SA',
        status_sefaz: 'cancelada',
        ultima_verificacao: new Date().toISOString(),
        irregularidades: ['CNPJ Baixado'],
        score: 10
      },
      {
        cnpj: '98.765.432/0001-10',
        razao_social: 'Logística Atraso Ltda',
        status_sefaz: 'denegada',
        ultima_verificacao: new Date().toISOString(),
        irregularidades: ['Irregularidade Fiscal'],
        score: 45
      }
    ];
  }
};
