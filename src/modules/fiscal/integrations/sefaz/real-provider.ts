'use client';

import type { SefazProvider, SefazConfig, SefazResponse } from './types';
import { SefazNotConfiguredError } from './types';

// =====================================================
// RealSefazProvider
// Structured placeholder for actual SEFAZ SOAP calls.
// Returns SEFAZ_NOT_CONFIGURED when prerequisites are missing.
// =====================================================

export class RealSefazProvider implements SefazProvider {
  readonly name = 'RealSefazProvider';

  private validatePrerequisites(config: SefazConfig): void {
    if (!config.certificateId) {
      throw new SefazNotConfiguredError(
        'Certificado digital A1 não configurado. Acesse Configurações > Certificado Digital.'
      );
    }
    if (!config.uf) {
      throw new SefazNotConfiguredError(
        'UF da empresa não configurada. Acesse Configurações > Dados da Empresa.'
      );
    }
  }

  async authorize(
    documentId: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    this.validatePrerequisites(config);

    // REAL IMPLEMENTATION: Build XML envelope → Sign with A1 cert → SOAP call to SEFAZ
    // Endpoint varies by UF and environment
    // Response: parse XML → extract cStat, xMotivo, protocol, chaveAcesso
    console.warn(
      `[RealSefaz] authorize called for doc=${documentId} — SOAP integration pending`
    );

    throw new SefazNotConfiguredError(
      'Integração SOAP com SEFAZ ainda não implementada. Use o ambiente de homologação (MockProvider) para testes.'
    );
  }

  async cancel(
    documentId: string,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    this.validatePrerequisites(config);

    // REAL IMPLEMENTATION: Build evento de cancelamento XML → Sign → SOAP call
    console.warn(
      `[RealSefaz] cancel called for doc=${documentId} — SOAP integration pending`
    );

    throw new SefazNotConfiguredError(
      'Integração SOAP de cancelamento ainda não implementada.'
    );
  }

  async correctLetter(
    documentId: string,
    correction: string,
    sequenceNumber: number,
    config: SefazConfig
  ): Promise<SefazResponse> {
    this.validatePrerequisites(config);

    // REAL IMPLEMENTATION: Build CC-e evento XML → Sign → SOAP call
    console.warn(
      `[RealSefaz] CC-e called for doc=${documentId} seq=${sequenceNumber} — SOAP integration pending`
    );

    throw new SefazNotConfiguredError(
      'Integração SOAP de CC-e ainda não implementada.'
    );
  }

  async inutilize(
    serie: number,
    startNumber: number,
    endNumber: number,
    justification: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    this.validatePrerequisites(config);

    // REAL IMPLEMENTATION: Build pedido de inutilização XML → Sign → SOAP call
    console.warn(
      `[RealSefaz] inutilize called serie=${serie} range=${startNumber}-${endNumber} — SOAP integration pending`
    );

    throw new SefazNotConfiguredError(
      'Integração SOAP de inutilização ainda não implementada.'
    );
  }

  async queryStatus(
    chaveAcesso: string,
    config: SefazConfig
  ): Promise<SefazResponse> {
    this.validatePrerequisites(config);

    // REAL IMPLEMENTATION: Build consulta protocolo XML → SOAP call
    console.warn(
      `[RealSefaz] queryStatus called for chave=${chaveAcesso.slice(0, 10)}... — SOAP integration pending`
    );

    throw new SefazNotConfiguredError(
      'Integração SOAP de consulta ainda não implementada.'
    );
  }
}
