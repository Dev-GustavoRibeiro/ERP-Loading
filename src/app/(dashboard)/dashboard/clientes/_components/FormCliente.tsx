'use client';

import React, { useState, useCallback } from 'react';
import {
  Save, User, MapPin, Phone, Briefcase, CheckCircle2,
  Loader2, Search as SearchIcon, ArrowRight, ArrowLeft,
  Eye, Building2, CreditCard, FileText,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { clienteService } from '@/modules/cadastros/services/clienteService';
import type { Cliente } from '@/modules/cadastros/domain';
import {
  FormInput, FormSelect, FormTextarea, FormButton, Stepper, SectionTitle,
  UF_OPTIONS, formatCPF, formatCNPJ, formatPhone, formatCEP, formatCurrency,
  validateCPF, validateCNPJ, validateEmail, fetchCEP, cleanDigits,
  isTableNotFoundError, TableNotConfigured,
} from './shared';

// =====================================================
// Types
// =====================================================

interface FormData {
  tipo_pessoa: 'F' | 'J';
  nome: string;
  nome_fantasia: string;
  cpf_cnpj: string;
  rg_ie: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  codigo_ibge: string;
  telefone: string;
  celular: string;
  email: string;
  limite_credito: string;
  observacoes: string;
}

const emptyForm: FormData = {
  tipo_pessoa: 'F', nome: '', nome_fantasia: '', cpf_cnpj: '', rg_ie: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', codigo_ibge: '',
  telefone: '', celular: '', email: '',
  limite_credito: '', observacoes: '',
};

interface FormClienteProps {
  empresaId: string | null;
  editingCliente?: Cliente | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

// =====================================================
// Wizard Steps
// =====================================================

const STEPS = [
  { label: 'Identificação', icon: <User className="w-3.5 h-3.5" /> },
  { label: 'Endereço', icon: <MapPin className="w-3.5 h-3.5" /> },
  { label: 'Contato', icon: <Phone className="w-3.5 h-3.5" /> },
  { label: 'Comercial', icon: <Briefcase className="w-3.5 h-3.5" /> },
  { label: 'Revisão', icon: <Eye className="w-3.5 h-3.5" /> },
];

// =====================================================
// Component
// =====================================================

export const FormCliente: React.FC<FormClienteProps> = ({
  empresaId, editingCliente, onClose, onSuccess,
}) => {
  const isEditing = !!editingCliente;
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>(() => {
    if (editingCliente) {
      return {
        tipo_pessoa: (editingCliente.tipo_pessoa as 'F' | 'J') || 'F',
        nome: editingCliente.nome || '', nome_fantasia: editingCliente.nome_fantasia || '',
        cpf_cnpj: editingCliente.cpf_cnpj || '', rg_ie: editingCliente.rg_ie || '',
        cep: editingCliente.cep || '', logradouro: editingCliente.logradouro || '',
        numero: editingCliente.numero || '', complemento: editingCliente.complemento || '',
        bairro: editingCliente.bairro || '', cidade: editingCliente.cidade || '',
        uf: editingCliente.uf || '', codigo_ibge: editingCliente.codigo_ibge || '',
        telefone: editingCliente.telefone || '', celular: editingCliente.celular || '',
        email: editingCliente.email || '',
        limite_credito: editingCliente.limite_credito ? String(editingCliente.limite_credito) : '',
        observacoes: editingCliente.observacoes || '',
      };
    }
    return { ...emptyForm };
  });

  const updateField = useCallback((field: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
    setGlobalError(null);
  }, []);

  // ── CEP Auto-fill ──
  const handleCepSearch = useCallback(async () => {
    const cepDigits = cleanDigits(formData.cep);
    if (cepDigits.length !== 8) return;
    setLoadingCep(true);
    try {
      const data = await fetchCEP(cepDigits);
      if (data) {
        setFormData(prev => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf,
          codigo_ibge: data.ibge || prev.codigo_ibge,
          complemento: data.complemento || prev.complemento,
        }));
      } else {
        setErrors(prev => ({ ...prev, cep: 'CEP não encontrado' }));
      }
    } catch {
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP' }));
    } finally {
      setLoadingCep(false);
    }
  }, [formData.cep]);

  // ── Step Validation ──
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (step === 0) { // Identification
      if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
      if (formData.cpf_cnpj) {
        const digits = cleanDigits(formData.cpf_cnpj);
        if (formData.tipo_pessoa === 'F' && digits.length > 0 && digits.length !== 11)
          newErrors.cpf_cnpj = 'CPF deve ter 11 dígitos';
        else if (formData.tipo_pessoa === 'F' && digits.length === 11 && !validateCPF(digits))
          newErrors.cpf_cnpj = 'CPF inválido';
        else if (formData.tipo_pessoa === 'J' && digits.length > 0 && digits.length !== 14)
          newErrors.cpf_cnpj = 'CNPJ deve ter 14 dígitos';
        else if (formData.tipo_pessoa === 'J' && digits.length === 14 && !validateCNPJ(digits))
          newErrors.cpf_cnpj = 'CNPJ inválido';
      }
    }

    if (step === 2) { // Contact
      if (formData.email && !validateEmail(formData.email))
        newErrors.email = 'Email inválido';
    }

    if (step === 3) { // Commercial
      if (formData.limite_credito && isNaN(Number(formData.limite_credito)))
        newErrors.limite_credito = 'Valor inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const goBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  // ── Submit ──
  const handleSubmit = async () => {
    if (!empresaId) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const dto = {
        tipo_pessoa: formData.tipo_pessoa,
        nome: formData.nome.trim(),
        nome_fantasia: formData.nome_fantasia.trim() || undefined,
        cpf_cnpj: cleanDigits(formData.cpf_cnpj) || undefined,
        rg_ie: formData.rg_ie.trim() || undefined,
        cep: cleanDigits(formData.cep) || undefined,
        logradouro: formData.logradouro.trim() || undefined,
        numero: formData.numero.trim() || undefined,
        complemento: formData.complemento.trim() || undefined,
        bairro: formData.bairro.trim() || undefined,
        cidade: formData.cidade.trim() || undefined,
        uf: formData.uf || undefined,
        codigo_ibge: formData.codigo_ibge || undefined,
        telefone: cleanDigits(formData.telefone) || undefined,
        celular: cleanDigits(formData.celular) || undefined,
        email: formData.email.trim() || undefined,
        limite_credito: formData.limite_credito ? Number(formData.limite_credito) : undefined,
        observacoes: formData.observacoes.trim() || undefined,
      };

      if (isEditing) {
        const result = await clienteService.update(editingCliente!.id, dto);
        if (result.error) { setGlobalError(result.error); return; }
        onSuccess('Cliente atualizado com sucesso!');
      } else {
        const result = await clienteService.create(empresaId, dto);
        if (result.error) { setGlobalError(result.error); return; }
        onSuccess('Cliente cadastrado com sucesso!');
      }
      onClose();
    } catch (err) {
      if (isTableNotFoundError(err)) { setTableError(true); return; }
      setGlobalError('Erro ao salvar cliente. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!empresaId) {
    return <div className="py-12 text-center text-slate-400">Selecione uma empresa para continuar.</div>;
  }

  if (tableError) return <TableNotConfigured entity="clientes" />;

  // ── Summary Row Helper ──
  const SummaryRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-white font-medium">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {globalError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{globalError}</div>
      )}

      {/* ── Stepper ── */}
      <Stepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={(step) => {
          // Only allow going back to completed steps (or current if editing)
          if (isEditing || step <= currentStep) setCurrentStep(step);
        }}
        allowClickPast={isEditing}
      />

      {/* ── Step 0: Identificação ── */}
      {currentStep === 0 && (
        <div className="space-y-5">
          <SectionTitle title="Identificação do Cliente" description="Defina o tipo e dados básicos" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect label="Tipo de Pessoa" required
              options={[{ value: 'F', label: 'Pessoa Física (CPF)' }, { value: 'J', label: 'Pessoa Jurídica (CNPJ)' }]}
              value={formData.tipo_pessoa} onChange={updateField('tipo_pessoa')}
            />
            <FormInput
              label={formData.tipo_pessoa === 'J' ? 'Razão Social' : 'Nome Completo'} required
              placeholder={formData.tipo_pessoa === 'J' ? 'Razão social' : 'Nome completo'}
              value={formData.nome} onChange={updateField('nome')} error={errors.nome}
            />
            {formData.tipo_pessoa === 'J' && (
              <FormInput label="Nome Fantasia" placeholder="Nome fantasia"
                value={formData.nome_fantasia} onChange={updateField('nome_fantasia')}
              />
            )}
            <FormInput
              label={formData.tipo_pessoa === 'J' ? 'CNPJ' : 'CPF'}
              placeholder={formData.tipo_pessoa === 'J' ? '00.000.000/0000-00' : '000.000.000-00'}
              value={formData.cpf_cnpj} onChange={updateField('cpf_cnpj')}
              mask={formData.tipo_pessoa === 'J' ? formatCNPJ : formatCPF} error={errors.cpf_cnpj}
            />
            <FormInput
              label={formData.tipo_pessoa === 'J' ? 'Inscrição Estadual' : 'RG'}
              placeholder={formData.tipo_pessoa === 'J' ? 'IE' : 'RG'}
              value={formData.rg_ie} onChange={updateField('rg_ie')}
            />
          </div>
        </div>
      )}

      {/* ── Step 1: Endereço ── */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <SectionTitle title="Endereço" description="Preencha o CEP para preenchimento automático" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormInput label="CEP" placeholder="00000-000"
              value={formData.cep} error={errors.cep}
              onChange={(val) => updateField('cep')(formatCEP(val))}
              suffix={
                <button onClick={handleCepSearch} disabled={loadingCep}
                  className="text-purple-400 hover:text-purple-300 transition-colors" title="Buscar CEP">
                  {loadingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                </button>
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <FormInput label="Logradouro" placeholder="Rua, Avenida..."
                value={formData.logradouro} onChange={updateField('logradouro')} />
            </div>
            <FormInput label="Número" placeholder="123"
              value={formData.numero} onChange={updateField('numero')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Complemento" placeholder="Apto, Sala..."
              value={formData.complemento} onChange={updateField('complemento')} />
            <FormInput label="Bairro" placeholder="Bairro"
              value={formData.bairro} onChange={updateField('bairro')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormInput label="Cidade" placeholder="Cidade"
                value={formData.cidade} onChange={updateField('cidade')} />
            </div>
            <FormSelect label="UF" options={UF_OPTIONS}
              value={formData.uf} onChange={updateField('uf')} />
          </div>
        </div>
      )}

      {/* ── Step 2: Contato ── */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <SectionTitle title="Informações de Contato" description="Telefones e email para comunicação" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Telefone Fixo" placeholder="(00) 0000-0000"
              value={formData.telefone} onChange={updateField('telefone')} mask={formatPhone} />
            <FormInput label="Celular / WhatsApp" placeholder="(00) 00000-0000"
              value={formData.celular} onChange={updateField('celular')} mask={formatPhone} />
            <FormInput label="Email" type="email" placeholder="email@exemplo.com" className="md:col-span-2"
              value={formData.email} onChange={updateField('email')} error={errors.email} />
          </div>
        </div>
      )}

      {/* ── Step 3: Comercial ── */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <SectionTitle title="Dados Comerciais e Observações" description="Configurações financeiras e notas internas" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Limite de Crédito (R$)" placeholder="0,00" type="number"
              value={formData.limite_credito} onChange={updateField('limite_credito')} error={errors.limite_credito} />
          </div>
          <FormTextarea label="Observações" placeholder="Notas internas sobre o cliente..."
            value={formData.observacoes} onChange={updateField('observacoes')} rows={4} />
        </div>
      )}

      {/* ── Step 4: Revisão ── */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <SectionTitle title="Revisão do Cadastro" description="Confira todos os dados antes de salvar" />

          {/* Identification */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identificação</h4>
            </div>
            <SummaryRow label="Tipo" value={formData.tipo_pessoa === 'J' ? 'Pessoa Jurídica' : 'Pessoa Física'} />
            <SummaryRow label={formData.tipo_pessoa === 'J' ? 'Razão Social' : 'Nome'} value={formData.nome} />
            {formData.nome_fantasia && <SummaryRow label="Nome Fantasia" value={formData.nome_fantasia} />}
            <SummaryRow label={formData.tipo_pessoa === 'J' ? 'CNPJ' : 'CPF'} value={formData.cpf_cnpj || null} />
            {formData.rg_ie && <SummaryRow label={formData.tipo_pessoa === 'J' ? 'IE' : 'RG'} value={formData.rg_ie} />}
          </div>

          {/* Address */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço</h4>
            </div>
            <SummaryRow label="CEP" value={formData.cep || null} />
            <SummaryRow label="Logradouro" value={
              [formData.logradouro, formData.numero && `nº ${formData.numero}`].filter(Boolean).join(', ') || null
            } />
            {formData.complemento && <SummaryRow label="Complemento" value={formData.complemento} />}
            <SummaryRow label="Bairro" value={formData.bairro || null} />
            <SummaryRow label="Cidade/UF" value={
              formData.cidade && formData.uf ? `${formData.cidade}/${formData.uf}` : (formData.cidade || formData.uf || null)
            } />
          </div>

          {/* Contact */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contato</h4>
            </div>
            <SummaryRow label="Telefone" value={formData.telefone || null} />
            <SummaryRow label="Celular" value={formData.celular || null} />
            <SummaryRow label="Email" value={formData.email || null} />
          </div>

          {/* Commercial */}
          <div className="p-4 bg-[#0d1117]/60 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Comercial</h4>
            </div>
            <SummaryRow label="Limite de Crédito" value={
              formData.limite_credito ? formatCurrency(Number(formData.limite_credito)) : null
            } />
            {formData.observacoes && <SummaryRow label="Observações" value={formData.observacoes} />}
          </div>
        </div>
      )}

      {/* ── Navigation Footer ── */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div>
          {currentStep > 0 ? (
            <FormButton variant="ghost" onClick={goBack}>
              <ArrowLeft className="w-4 h-4" /> Voltar
            </FormButton>
          ) : (
            <FormButton variant="ghost" onClick={onClose}>Cancelar</FormButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-600">
            Etapa {currentStep + 1} de {STEPS.length}
          </span>

          {currentStep < STEPS.length - 1 ? (
            <FormButton onClick={goNext}>
              Próximo <ArrowRight className="w-4 h-4" />
            </FormButton>
          ) : (
            <FormButton onClick={handleSubmit} loading={loading} variant="success">
              <Save className="w-4 h-4" />
              {isEditing ? 'Atualizar' : 'Cadastrar'} Cliente
            </FormButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormCliente;
